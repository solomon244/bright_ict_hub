const AIUsageLog = require('../models/AIUsageLog');
const AIMessage = require('../models/AIMessage');
const ApiResponse = require('../utils/apiResponse');
const ai = require('./ai');
const env = require('../config/env');

/** Admin view of AI cost, volume, errors and answer-quality reports. */
async function usageSummary({ days = 30 }) {
  const windowDays = Math.min(Math.max(days, 1), 180);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [totals, byFeature, byDay, activeUsers, feedback] = await Promise.all([
    AIUsageLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          requests: { $sum: 1 },
          errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          inputTokens: { $sum: '$inputTokens' },
          outputTokens: { $sum: '$outputTokens' },
          estimatedCostUsd: { $sum: '$estimatedCostUsd' },
          avgLatencyMs: { $avg: '$latencyMs' },
        },
      },
    ]),
    AIUsageLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$feature', requests: { $sum: 1 }, tokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } } } },
      { $sort: { requests: -1 } },
    ]),
    AIUsageLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, requests: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AIUsageLog.distinct('user', { createdAt: { $gte: since } }),
    AIMessage.aggregate([
      { $match: { 'feedback.rating': { $exists: true }, createdAt: { $gte: since } } },
      { $group: { _id: { rating: '$feedback.rating', reason: '$feedback.reason' }, count: { $sum: 1 } } },
    ]),
  ]);

  const t = totals[0] || { requests: 0, errors: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, avgLatencyMs: 0 };
  return new ApiResponse(200, 'AI usage summary', {
    windowDays,
    provider: { name: env.aiProvider, configured: ai.isConfigured(), dailyLimitPerUser: env.aiDailyLimitPerUser },
    totals: { ...t, _id: undefined, activeUsers: activeUsers.length, avgLatencyMs: Math.round(t.avgLatencyMs || 0) },
    byFeature: byFeature.map((f) => ({ feature: f._id, requests: f.requests, tokens: f.tokens })),
    byDay: byDay.map((d) => ({ date: d._id, requests: d.requests })),
    feedback: feedback.map((f) => ({ rating: f._id.rating, reason: f._id.reason || null, count: f.count })),
  });
}

module.exports = { usageSummary };
