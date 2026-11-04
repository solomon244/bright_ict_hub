const { buildSolomonSystemPrompt } = require('../constants/solomonSystemPrompt');
const { getRagPartialThreshold } = require('../constants/tutorConstants');

function formatConversationTranscript(messages) {
  return messages
    .map((m) => `${m.role === 'assistant' ? 'Tutor' : 'Student'}: ${m.content}`)
    .join('\n');
}

function lowConfidenceBlock(confidence, partialThreshold) {
  if (confidence >= partialThreshold) {
    return '';
  }
  return `=== LOW CONFIDENCE MODE ===
- Retrieval is partial (confidence ${confidence.toFixed(2)} < ${partialThreshold.toFixed(2)}).
- Give a short, guided, safe answer from fundamentals and clearly say context is partial.
- Ask one clarifying question to narrow scope.
- Do NOT escalate in this mode unless strictly required by safety rules.

`;
}

/**
 * Single user message to Gemini: Solomon system rules + optional low-confidence instructions + transcript.
 */
const MODE_INSTRUCTIONS = {
  beginner: 'Mode: BEGINNER. Use very simple words, short sentences and everyday Ethiopian examples. Avoid jargon; define any term you must use.',
  intermediate: 'Mode: INTERMEDIATE. Assume the basics are known. Give concise explanations with one worked example.',
  advanced: 'Mode: ADVANCED. Be precise and technical; discuss trade-offs, edge cases and best practices.',
  exam_prep: 'Mode: EXAM PREPARATION. Focus on key concepts and common exam question styles. Quiz the student with one short question at a time and check their answer before moving on.',
  practice: 'Mode: PRACTICE. Give the student a small exercise to try first. Offer hints one at a time; reveal the full solution only if they are stuck after hints.',
  programming_mentor: 'Mode: PROGRAMMING MENTOR. Guide the student to understand code instead of handing over complete solutions: ask what they tried, explain errors, suggest the next small step.',
};

function modeBlock(mode) {
  const text = MODE_INSTRUCTIONS[mode];
  return text ? `=== TUTOR MODE ===\n${text}\n\n` : '';
}

function buildSolomonGeminiPrompt({ messages, ragChunks, ragConfidence, mode }) {
  const partialThreshold = getRagPartialThreshold();
  const systemPrompt = buildSolomonSystemPrompt({
    ragChunks,
    ragConfidence,
  });
  const transcript = formatConversationTranscript(messages);

  return `${systemPrompt}

${modeBlock(mode)}=== CONVERSATION ===
${transcript}

${lowConfidenceBlock(ragConfidence, partialThreshold)}Now answer as Solomon tutor following all rules above.`;
}

module.exports = {
  MODE_INSTRUCTIONS,
  buildSolomonGeminiPrompt,
  formatConversationTranscript,
};
