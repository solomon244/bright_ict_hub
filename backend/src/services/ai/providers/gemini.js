const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../../../config/env');

const name = 'gemini';
const isConfigured = () => Boolean(env.geminiApiKey);
const modelName = () => env.geminiModel;

/** input: { system?, prompt?, messages?: [{role:'user'|'assistant', content}], temperature, maxTokens, json } */
async function generate({ system, prompt, messages, temperature, maxTokens, json }) {
  const client = new GoogleGenerativeAI(env.geminiApiKey);
  const model = client.getGenerativeModel(
    { model: env.geminiModel, ...(system ? { systemInstruction: system } : {}) },
    { timeout: env.aiRequestTimeoutMs }
  );

  const contents = messages && messages.length
    ? messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    : [{ role: 'user', parts: [{ text: prompt }] }];

  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const usage = result.response?.usageMetadata || {};
  return {
    text: result.response?.text()?.trim() || '',
    inputTokens: usage.promptTokenCount,
    outputTokens: usage.candidatesTokenCount,
  };
}

module.exports = { name, isConfigured, modelName, generate };
