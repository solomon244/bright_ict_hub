const env = require('../../config/env');
const AppError = require('../../utils/appError');
const AIUsageLog = require('../../models/AIUsageLog');
const gemini = require('./providers/gemini');
const openai = require('./providers/openaiCompatible');

const PROVIDERS = { gemini, openai };

const getProvider = () => PROVIDERS[env.aiProvider] || gemini;
const isConfigured = () => getProvider().isConfigured();

const estimateTokens = (text) => Math.ceil(String(text || '').length / 4);
const startOfUtcDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/** Per-user daily cap (cost control + abuse prevention). Counts successful provider calls. */
async function enforceDailyLimit(userId) {
  if (!userId || !env.aiDailyLimitPerUser) return;
  const used = await AIUsageLog.countDocuments({
    user: userId,
    status: 'success',
    createdAt: { $gte: startOfUtcDay() },
  });
  if (used >= env.aiDailyLimitPerUser) {
    throw new AppError(
      'የዛሬው የ AI ጥያቄ ገደብ ደርሷል። ነገ እንደገና ይሞክሩ። / Daily AI limit reached. Please try again tomorrow.',
      429
    );
  }
}

async function logUsage(entry) {
  try {
    await AIUsageLog.create(entry);
  } catch (err) {
    // Logging must never break the learning experience.
    if (process.env.NODE_ENV !== 'test') console.error('AI usage log failed:', err.message);
  }
}

/**
 * Single entry point for every AI call in the app.
 * @param {object} o  { feature, userId, prompt | messages, system, temperature, maxTokens, json }
 * @returns {Promise<{text, provider, model, inputTokens, outputTokens, latencyMs}>}
 */
async function generateText({
  feature,
  userId,
  prompt,
  messages,
  system,
  temperature = 0.7,
  maxTokens = 900,
  json = false,
}) {
  const provider = getProvider();
  if (!provider.isConfigured()) {
    throw new AppError('AI is not configured on this server.', 503);
  }
  await enforceDailyLimit(userId);

  const started = Date.now();
  const base = { user: userId, feature, provider: provider.name, modelName: provider.modelName() };
  try {
    const out = await provider.generate({ system, prompt, messages, temperature, maxTokens, json });
    if (!out.text) {
      const empty = new Error('empty_response');
      empty.code = 'empty_response';
      throw empty;
    }
    const inputText = [system, prompt, ...(messages || []).map((m) => m.content)].join(' ');
    const inputTokens = out.inputTokens ?? estimateTokens(inputText);
    const outputTokens = out.outputTokens ?? estimateTokens(out.text);
    const latencyMs = Date.now() - started;
    await logUsage({
      ...base,
      inputTokens,
      outputTokens,
      latencyMs,
      status: 'success',
      estimatedCostUsd:
        (inputTokens / 1000) * env.aiCostPer1kInput + (outputTokens / 1000) * env.aiCostPer1kOutput,
    });
    return { text: out.text, provider: provider.name, model: base.modelName, inputTokens, outputTokens, latencyMs };
  } catch (err) {
    await logUsage({
      ...base,
      latencyMs: Date.now() - started,
      status: 'error',
      errorCode: String(err.code || err.providerStatus || err.name || 'error').slice(0, 60),
    });
    if (err instanceof AppError) throw err;
    // Do not leak provider internals to clients.
    throw new AppError('The AI service could not complete this request. Please try again.', 502);
  }
}

module.exports = { generateText, isConfigured, getProvider, enforceDailyLimit, estimateTokens };
