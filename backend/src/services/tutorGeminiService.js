const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_GENERATION = {
  temperature: 0.7,
  maxOutputTokens: 900,
};

/**
 * @param {string} promptText
 * @param {{ temperature?: number, maxOutputTokens?: number }} [options]
 * @returns {Promise<string|null>}
 */
async function generateGeminiText(promptText, options = {}) {
  if (!env.geminiApiKey) {
    return null;
  }

  const client = new GoogleGenerativeAI(env.geminiApiKey);
  const model = client.getGenerativeModel({
    model: env.geminiModel || DEFAULT_MODEL,
  });

  const generationConfig = {
    temperature: options.temperature ?? DEFAULT_GENERATION.temperature,
    maxOutputTokens: options.maxOutputTokens ?? DEFAULT_GENERATION.maxOutputTokens,
  };

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig,
  });

  return result.response?.text()?.trim() || null;
}

async function generateTutorCompletion(promptText) {
  return generateGeminiText(promptText);
}

module.exports = {
  generateTutorCompletion,
  generateGeminiText,
  DEFAULT_MODEL,
};
