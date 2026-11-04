jest.mock('../../src/models/Enrollment');
jest.mock('../../src/models/Progress');
jest.mock('../../src/services/ai');

const Enrollment = require('../../src/models/Enrollment');
const Progress = require('../../src/models/Progress');
const ai = require('../../src/services/ai');
const coach = require('../../src/services/dashboardAiService');

const enrollmentQuery = (rows) => ({ populate: () => ({ sort: () => ({ lean: async () => rows }) }) });

beforeEach(() => {
  jest.clearAllMocks();
  coach.clearCoachCache();
  ai.isConfigured.mockReturnValue(true);
  ai.generateText.mockResolvedValue({ text: 'ሰላም!\n• a\n• b\n• c' });
  Enrollment.find.mockReturnValue(enrollmentQuery([]));
  Progress.find.mockReturnValue({ lean: async () => [] });
});

test('the first visit calls the model; repeat visits reuse the card without spending an AI request', async () => {
  const first = await coach.getDashboardInsights('s1');
  const second = await coach.getDashboardInsights('s1');
  expect(first.data).toMatchObject({ source: 'ai', cached: false });
  expect(second.data).toMatchObject({ source: 'ai', cached: true, insights: first.data.insights });
  expect(ai.generateText).toHaveBeenCalledTimes(1);
});

test('the cache is per student', async () => {
  await coach.getDashboardInsights('s1');
  await coach.getDashboardInsights('s2');
  expect(ai.generateText).toHaveBeenCalledTimes(2);
});

test('an expired card is regenerated', async () => {
  const now = jest.spyOn(Date, 'now');
  now.mockReturnValue(1_000_000);
  await coach.getDashboardInsights('s1');
  now.mockReturnValue(1_000_000 + 7 * 60 * 60 * 1000);
  await coach.getDashboardInsights('s1');
  expect(ai.generateText).toHaveBeenCalledTimes(2);
  now.mockRestore();
});

test('model failures fall back to the rule-based card and are never cached', async () => {
  ai.generateText.mockRejectedValueOnce(new Error('provider down'));
  const failed = await coach.getDashboardInsights('s1');
  expect(failed.data).toMatchObject({ source: 'static', fallback: true });
  const retry = await coach.getDashboardInsights('s1');
  expect(retry.data).toMatchObject({ source: 'ai', cached: false });
});

test('without an AI provider the static card is served and nothing is cached', async () => {
  ai.isConfigured.mockReturnValue(false);
  const res = await coach.getDashboardInsights('s1');
  expect(res.data).toMatchObject({ source: 'static', fallback: true });
  expect(ai.generateText).not.toHaveBeenCalled();
});
