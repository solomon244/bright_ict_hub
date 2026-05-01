const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../constants/roles');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STUDENT,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    profileImage: String,
    bio: String,
    skills: [String],
    socialLinks: {
      youtube: String,
      linkedin: String,
      website: String,
    },
    instructorProfile: {
      experienceYears: Number,
      highlight: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function compare(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);


