const ApiResponse = require('../utils/apiResponse');
const { buildSolomonGeminiPrompt } = require('../utils/tutorPrompt');
const ai = require('./ai');
const conversations = require('./tutorConversationService');
const { retrieveContext } = require('./ragService');
const { checkEscalationTriggers } = require('./tutorSafetyService');
const TutorEscalation = require('../models/TutorEscalation');
const TutorConfusionCounter = require('../models/TutorConfusionCounter');
const {
  MAX_TUTOR_HISTORY,
  getRagPartialThreshold,
  CONFUSION_REGEXES,
  ESCALATION_MESSAGES,
} = require('../constants/tutorConstants');

function normalizeFingerprint(text) {
  const s = String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);
  return s.length > 0 ? s : '__empty__';
}

async function recordEscalation(payload) {
  await TutorEscalation.create({
    studentId: payload.student_id,
    reason: payload.reason,
    question: payload.question,
    attemptedAnswer: payload.attempted_answer || '',
    confidence: typeof payload.confidence === 'number' ? payload.confidence : undefined,
    meta: payload.meta || {},
  });
}

function trimMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return list
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_TUTOR_HISTORY);
}

function isConfusionSignal(text) {
  const s = String(text || '');
  return CONFUSION_REGEXES.some((re) => re.test(s));
}

/**
 * After 3 confusion signals on the same normalized question, escalate to teacher.
 * @returns {Promise<InstanceType<typeof ApiResponse>|null>}
 */
async function maybeEscalateRepeatedConfusion({ studentId, userText }) {
  const fingerprint = normalizeFingerprint(userText);
  const counter = await TutorConfusionCounter.findOneAndUpdate(
    { studentId, fingerprint },
    {
      $inc: { count: 1 },
      $set: { lastQuestion: userText.slice(0, 500), updatedAt: new Date() },
      $setOnInsert: { studentId, fingerprint },
    },
    { upsert: true, new: true }
  );

  if (counter.count < 3) {
    return null;
  }

  await recordEscalation({
    student_id: studentId,
    reason: 'repeated_confusion',
    question: userText,
    attempted_answer: '',
    confidence: undefined,
    meta: { count: counter.count, fingerprint },
  });

  return new ApiResponse(200, 'OK', {
    reply: ESCALATION_MESSAGES.repeatedConfusion,
    escalate: true,
    reason: 'repeated_confusion',
    confidence: null,
  });
}

const MAX_USER_MESSAGE_CHARS = 2000;

/** Persist a tutor reply that did not come from the AI model (safety / escalation) and build the response. */
async function localReply({ conversation, studentId, reply, escalate, reason, confidence }) {
  const saved = await conversations.appendMessage({
    conversation,
    userId: studentId,
    role: 'assistant',
    content: reply,
    aiGenerated: false,
    meta: { escalated: escalate, reason, confidence },
  });
  return new ApiResponse(200, 'OK', {
    reply,
    escalate,
    reason,
    confidence,
    aiGenerated: false,
    conversationId: String(conversation._id),
    messageId: String(saved._id),
    mode: conversation.mode,
  });
}

/**
 * Chat with Solomon. History is always loaded from the database for the given conversation
 * (the client only supplies the newest user message), so clients cannot rewrite the tutor's context.
 */
exports.chat = async ({ studentId, messages, conversationId, mode }) => {
  const clientMessages = trimMessages(messages);
  const last = clientMessages[clientMessages.length - 1];

  if (!last || last.role !== 'user') {
    return new ApiResponse(400, 'ከተማሪው የመጨረሻው መልዕክት user መሆን አለበት።');
  }

  const userText = last.content.slice(0, MAX_USER_MESSAGE_CHARS);

  let conversation;
  if (conversationId) {
    conversation = await conversations.getOwnedConversation(studentId, conversationId);
    if (conversation.messageCount >= conversations.MAX_MESSAGES_PER_CONVERSATION) {
      return new ApiResponse(400, 'This chat is full — please start a new conversation. / ይህ ውይይት ሞልቷል፤ አዲስ ይጀምሩ።');
    }
    if (mode && mode !== conversation.mode) {
      conversation.mode = mode;
    }
  } else {
    conversation = await conversations.startConversation({ userId: studentId, firstUserText: userText, mode });
  }

  await conversations.appendMessage({ conversation, userId: studentId, role: 'user', content: userText });

  const safety = checkEscalationTriggers(userText);
  if (safety.escalate) {
    await recordEscalation({
      student_id: studentId,
      reason: safety.reason,
      question: userText,
      attempted_answer: '',
      confidence: 0,
      meta: { channel: 'tutor_safety' },
    });
    return localReply({
      conversation,
      studentId,
      reply: safety.studentMessage,
      escalate: true,
      reason: safety.reason,
      confidence: 0,
    });
  }

  if (isConfusionSignal(userText)) {
    const repeated = await maybeEscalateRepeatedConfusion({ studentId, userText });
    if (repeated) {
      return localReply({
        conversation,
        studentId,
        reply: repeated.data.reply,
        escalate: true,
        reason: 'repeated_confusion',
        confidence: null,
      });
    }
  }

  if (!ai.isConfigured()) {
    return new ApiResponse(503, 'AI አስተማሪ በዚህ አገልግሎት ላይ እስኪያዋቅር ድረስ አይገኝም። (AI provider not configured)');
  }

  const { chunks, confidence } = await retrieveContext(userText, { studentId });
  const history = await conversations.recentHistory(conversation._id, MAX_TUTOR_HISTORY);
  const prompt = buildSolomonGeminiPrompt({
    messages: history,
    ragChunks: chunks,
    ragConfidence: confidence,
    mode: conversation.mode,
  });

  let replyText;
  try {
    ({ text: replyText } = await ai.generateText({ feature: 'tutor', userId: studentId, prompt }));
  } catch (err) {
    return new ApiResponse(err.statusCode || 502, err.message || 'AI አገልግሎት አልተሳካም።');
  }

  const reason = confidence < getRagPartialThreshold() ? 'low_confidence_partial' : null;
  // One hint per lesson; only real platform lessons carry a courseId, so the UI can link to them.
  const seenLessons = new Set();
  const lessonHints = chunks
    .filter((c) => !seenLessons.has(String(c.lessonId)) && seenLessons.add(String(c.lessonId)))
    .map((c) => ({ lessonId: String(c.lessonId), title: c.title, ...(c.courseId ? { courseId: String(c.courseId) } : {}) }));
  const saved = await conversations.appendMessage({
    conversation,
    userId: studentId,
    role: 'assistant',
    content: replyText,
    aiGenerated: true,
    meta: { escalated: false, reason: reason || undefined, confidence, lessonHints },
  });

  return new ApiResponse(200, 'OK', {
    reply: replyText,
    escalate: false,
    reason,
    confidence,
    lessonHints,
    aiGenerated: true,
    conversationId: String(conversation._id),
    messageId: String(saved._id),
    mode: conversation.mode,
  });
};
