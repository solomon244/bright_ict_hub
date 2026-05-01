const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['verify_email', 'reset_password', 'refresh'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

tokenSchema.index({ user: 1, type: 1 });
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Token', tokenSchema);


