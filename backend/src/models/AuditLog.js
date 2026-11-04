const mongoose = require('mongoose');

/** Append-only record of privileged actions (who did what to whom, and when). */
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: String,
    action: { type: String, required: true }, // e.g. user.role_changed, instructor.approved, content.hidden
    targetType: String,
    targetId: String,
    meta: mongoose.Schema.Types.Mixed, // small, non-sensitive details (never passwords/tokens)
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
