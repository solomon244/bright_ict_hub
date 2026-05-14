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
function buildSolomonGeminiPrompt({ messages, ragChunks, ragConfidence }) {
  const partialThreshold = getRagPartialThreshold();
  const systemPrompt = buildSolomonSystemPrompt({
    ragChunks,
    ragConfidence,
  });
  const transcript = formatConversationTranscript(messages);

  return `${systemPrompt}

=== CONVERSATION ===
${transcript}

${lowConfidenceBlock(ragConfidence, partialThreshold)}Now answer as Solomon tutor following all rules above.`;
}

module.exports = {
  buildSolomonGeminiPrompt,
  formatConversationTranscript,
};
