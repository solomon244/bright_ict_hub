const ai = require('./ai');

/**
 * Backwards-compatible wrappers. New code should call services/ai directly so that usage is
 * attributed to a user and feature. Returns null when no AI provider is configured.
 */
async function generateGeminiText(promptText, options = {}) {
  if (!ai.isConfigured()) return null;
  const { text } = await ai.generateText({
    feature: options.feature || 'general',
    userId: options.userId,
    prompt: promptText,
    temperature: options.temperature,
    maxTokens: options.maxOutputTokens,
  });
  return text || null;
}

async function generateTutorCompletion(promptText, options = {}) {
  return generateGeminiText(promptText, { ...options, feature: 'tutor' });
}

module.exports = { generateTutorCompletion, generateGeminiText };
