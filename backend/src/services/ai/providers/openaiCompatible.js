const env = require('../../../config/env');

const name = 'openai';
const isConfigured = () => Boolean(env.openai.apiKey);
const modelName = () => env.openai.model;

/** Works with OpenAI and any OpenAI-compatible endpoint (set OPENAI_BASE_URL). */
async function generate({ system, prompt, messages, temperature, maxTokens, json }) {
  const chat = [];
  if (system) chat.push({ role: 'system', content: system });
  if (messages && messages.length) chat.push(...messages.map((m) => ({ role: m.role, content: m.content })));
  else chat.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.aiRequestTimeoutMs);
  try {
    const res = await fetch(`${env.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.openai.apiKey}` },
      body: JSON.stringify({
        model: env.openai.model,
        messages: chat,
        temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) {
      const err = new Error(`AI provider responded with HTTP ${res.status}`);
      err.providerStatus = res.status;
      throw err;
    }
    const data = await res.json();
    return {
      text: (data.choices?.[0]?.message?.content || '').trim(),
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { name, isConfigured, modelName, generate };
