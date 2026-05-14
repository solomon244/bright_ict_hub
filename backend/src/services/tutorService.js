const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const { buildSolomonGeminiPrompt } = require('../utils/tutorPrompt');
const { generateTutorCompletion } = require('./tutorGeminiService');
const { retrieveKnowledge } = require('./ragService');
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

exports.chat = async ({ studentId, messages }) => {
  const msgs = trimMessages(messages);
  const last = msgs[msgs.length - 1];

  if (!last || last.role !== 'user') {
    return new ApiResponse(400, 'ከተማሪው የመጨረሻው መልዕክት user መሆን አለበት።');
  }

  const userText = last.content;

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
    return new ApiResponse(200, 'OK', {
      reply: safety.studentMessage,
      escalate: true,
      reason: safety.reason,
      confidence: 0,
    });
  }

  if (isConfusionSignal(userText)) {
    const repeated = await maybeEscalateRepeatedConfusion({ studentId, userText });
    if (repeated) {
      return repeated;
    }
  }

  const { chunks, confidence } = retrieveKnowledge(userText);

  if (!env.geminiApiKey) {
    return new ApiResponse(
      503,
      'AI አስተማሪ በዚህ አገልግሎት ላይ እስኪያዋቅር ድረስ አይገኝም። (GEMINI_API_KEY)'
    );
  }

  const prompt = buildSolomonGeminiPrompt({
    messages: msgs,
    ragChunks: chunks,
    ragConfidence: confidence,
  });

  let replyText;
  try {
    replyText = await generateTutorCompletion(prompt);
  } catch (err) {
    return new ApiResponse(502, err.message || 'AI አገልግሎት አልተሳካም።');
  }

  if (!replyText) {
    return new ApiResponse(502, 'ከ AI ባዶ ምላሽ ተመለሰ።');
  }

  const partialThreshold = getRagPartialThreshold();

  return new ApiResponse(200, 'OK', {
    reply: replyText,
    escalate: false,
    reason: confidence < partialThreshold ? 'low_confidence_partial' : null,
    confidence,
    lessonHints: chunks.map((c) => ({ lessonId: c.lessonId, title: c.title })),
  });
};
