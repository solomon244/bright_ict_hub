const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');

/** Records a privileged action. Never throws: auditing must not break the action itself. */
async function record({ actor, action, targetType, targetId, meta, ip }) {
  try {
    await AuditLog.create({
      actor: actor?._id || actor?.id,
      actorRole: actor?.role,
      action,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      meta,
      ip,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error('Audit log failed:', err.message);
  }
}

async function list({ page = 1, limit = 25, action } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const filter = typeof action === 'string' && /^[a-z_.]{1,40}$/.test(action) ? { action } : {};
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort('-createdAt').skip((safePage - 1) * safeLimit).limit(safeLimit).populate('actor', 'firstName lastName role').lean(),
    AuditLog.countDocuments(filter),
  ]);
  return new ApiResponse(200, 'Audit log fetched', { logs, pagination: { page: safePage, limit: safeLimit, total } });
}

module.exports = { record, list };
