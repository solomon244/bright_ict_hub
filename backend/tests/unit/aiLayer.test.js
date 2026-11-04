jest.mock('../../src/models/AIUsageLog');
jest.mock('../../src/services/ai/providers/gemini', () => ({
  name: 'gemini',
  isConfigured: jest.fn(() => true),
  modelName: () => 'test-model',
  generate: jest.fn(),
}));

const AIUsageLog = require('../../src/models/AIUsageLog');
const gemini = require('../../src/services/ai/providers/gemini');
const env = require('../../src/config/env');
const ai = require('../../src/services/ai');

beforeEach(() => {
  jest.clearAllMocks();
  gemini.isConfigured.mockReturnValue(true);
  AIUsageLog.countDocuments.mockResolvedValue(0);
  AIUsageLog.create.mockResolvedValue({});
  env.aiDailyLimitPerUser = 3;
});

describe('ai.generateText', () => {
  test('returns text and logs usage with provider token counts', async () => {
    gemini.generate.mockResolvedValue({ text: 'hello', inputTokens: 10, outputTokens: 5 });
    const out = await ai.generateText({ feature: 'tutor', userId: 'u1', prompt: 'hi' });
    expect(out.text).toBe('hello');
    expect(AIUsageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: 'u1', feature: 'tutor', provider: 'gemini', inputTokens: 10, outputTokens: 5, status: 'success' })
    );
  });

  test('estimates tokens when the provider does not report them', async () => {
    gemini.generate.mockResolvedValue({ text: 'x'.repeat(40) });
    const out = await ai.generateText({ feature: 'tutor', userId: 'u1', prompt: 'y'.repeat(80) });
    expect(out.outputTokens).toBe(10);
    expect(out.inputTokens).toBeGreaterThan(0);
  });

  test('provider failures become a generic 502 and are logged without leaking internals', async () => {
    gemini.generate.mockRejectedValue(new Error('SECRET upstream stack trace key=abc'));
    await expect(ai.generateText({ feature: 'tutor', userId: 'u1', prompt: 'hi' })).rejects.toMatchObject({
      statusCode: 502,
      message: expect.not.stringContaining('SECRET'),
    });
    expect(AIUsageLog.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  test('an empty model answer is treated as an error', async () => {
    gemini.generate.mockResolvedValue({ text: '' });
    await expect(ai.generateText({ feature: 'tutor', userId: 'u1', prompt: 'hi' })).rejects.toMatchObject({ statusCode: 502 });
  });

  test('enforces the per-user daily limit before calling the provider', async () => {
    AIUsageLog.countDocuments.mockResolvedValue(3);
    await expect(ai.generateText({ feature: 'tutor', userId: 'u1', prompt: 'hi' })).rejects.toMatchObject({ statusCode: 429 });
    expect(gemini.generate).not.toHaveBeenCalled();
  });

  test('returns 503 when no provider is configured', async () => {
    gemini.isConfigured.mockReturnValue(false);
    await expect(ai.generateText({ feature: 'tutor', userId: 'u1', prompt: 'hi' })).rejects.toMatchObject({ statusCode: 503 });
  });

  test('a failing usage log never breaks the answer', async () => {
    gemini.generate.mockResolvedValue({ text: 'ok', inputTokens: 1, outputTokens: 1 });
    AIUsageLog.create.mockRejectedValue(new Error('db down'));
    await expect(ai.generateText({ feature: 'tutor', userId: 'u1', prompt: 'hi' })).resolves.toMatchObject({ text: 'ok' });
  });
});
