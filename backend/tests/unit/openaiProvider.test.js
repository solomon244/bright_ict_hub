const env = require('../../src/config/env');
const provider = require('../../src/services/ai/providers/openaiCompatible');

describe('OpenAI-compatible provider', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  test('calls /chat/completions with bearer auth and maps usage', async () => {
    env.openai.apiKey = 'sk-test';
    env.openai.baseUrl = 'https://llm.example/v1';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: ' Selam ' } }], usage: { prompt_tokens: 7, completion_tokens: 3 } }),
    });
    const out = await provider.generate({ system: 'be kind', prompt: 'hi', temperature: 0.5, maxTokens: 100, json: true });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://llm.example/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body);
    expect(body.messages).toEqual([{ role: 'system', content: 'be kind' }, { role: 'user', content: 'hi' }]);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(out).toEqual({ text: 'Selam', inputTokens: 7, outputTokens: 3 });
  });

  test('non-2xx responses throw without exposing the response body', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'bad key sk-test' }) });
    await expect(provider.generate({ prompt: 'hi' })).rejects.toThrow(/HTTP 401/);
  });
});
