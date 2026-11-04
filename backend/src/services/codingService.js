const CodingChallenge = require('../models/CodingChallenge');
const CodingSubmission = require('../models/CodingSubmission');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { USER_ROLES } = require('../constants/roles');

const FUNCTION_NAME = /^[A-Za-z_$][A-Za-z0-9_$]{0,39}$/;
const MAX_TESTS = 20;
const MAX_TEST_JSON_BYTES = 10 * 1024;

/** Validates a challenge definition. Tests are plain JSON data (args + expected), never code. */
function validateChallengePayload(p, { partial = false } = {}) {
  const out = {};
  const need = (cond, msg) => {
    if (!cond) throw new AppError(msg, 422);
  };
  if (!partial || p.title !== undefined) {
    need(typeof p.title === 'string' && p.title.trim(), 'title is required');
    out.title = p.title.trim();
  }
  if (!partial || p.slug !== undefined) {
    need(typeof p.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) && p.slug.length <= 80, 'slug must be lowercase letters, numbers and dashes');
    out.slug = p.slug;
  }
  if (!partial || p.description !== undefined) {
    need(typeof p.description === 'string' && p.description.trim(), 'description is required');
    out.description = p.description.trim();
  }
  if (!partial || p.functionName !== undefined) {
    need(typeof p.functionName === 'string' && FUNCTION_NAME.test(p.functionName), 'functionName must be a valid JavaScript identifier');
    out.functionName = p.functionName;
  }
  if (p.titleAm !== undefined) out.titleAm = String(p.titleAm).slice(0, 120);
  if (p.starterCode !== undefined) {
    need(typeof p.starterCode === 'string' && p.starterCode.length <= 5000, 'starterCode must be text up to 5000 characters');
    out.starterCode = p.starterCode;
  }
  if (p.difficulty !== undefined) {
    need(['beginner', 'intermediate', 'advanced'].includes(p.difficulty), 'invalid difficulty');
    out.difficulty = p.difficulty;
  }
  if (!partial || p.tests !== undefined) {
    need(Array.isArray(p.tests) && p.tests.length >= 1 && p.tests.length <= MAX_TESTS, `provide 1-${MAX_TESTS} tests`);
    need(p.tests.every((t) => t && Array.isArray(t.args) && 'expected' in t), 'each test needs an args array and an expected value');
    need(Buffer.byteLength(JSON.stringify(p.tests)) <= MAX_TEST_JSON_BYTES, 'tests are too large');
    out.tests = p.tests.map((t) => ({ args: t.args, expected: t.expected }));
  }
  if (typeof p.isPublished === 'boolean') out.isPublished = p.isPublished;
  return out;
}

const listChallenges = async (user) => {
  const filter = user.role === USER_ROLES.STUDENT ? { isPublished: true } : {};
  const challenges = await CodingChallenge.find(filter).select('slug title titleAm difficulty language isPublished').sort('difficulty title').lean();

  let best = {};
  if (user.role === USER_ROLES.STUDENT && challenges.length) {
    const rows = await CodingSubmission.aggregate([
      { $match: { user: user._id, challenge: { $in: challenges.map((c) => c._id) } } },
      { $group: { _id: '$challenge', bestPassed: { $max: '$passedCount' }, total: { $max: '$totalTests' }, attempts: { $sum: 1 } } },
    ]);
    best = Object.fromEntries(rows.map((r) => [String(r._id), r]));
  }
  return new ApiResponse(200, 'Challenges fetched', {
    challenges: challenges.map((c) => ({ ...c, myBest: best[String(c._id)] ? { passed: best[String(c._id)].bestPassed, total: best[String(c._id)].total, attempts: best[String(c._id)].attempts } : null })),
  });
};

const getChallenge = async (id, user) => {
  const challenge = await CodingChallenge.findById(id).lean();
  if (!challenge || (!challenge.isPublished && user.role === USER_ROLES.STUDENT)) throw new AppError('Challenge not found', 404);
  return new ApiResponse(200, 'Challenge fetched', { challenge });
};

const createChallenge = async (payload, user) => {
  const data = validateChallengePayload(payload);
  try {
    const challenge = await CodingChallenge.create({ ...data, createdBy: user.id });
    return new ApiResponse(201, 'Challenge created', { challenge });
  } catch (err) {
    if (err.code === 11000) throw new AppError('A challenge with this slug already exists', 409);
    throw err;
  }
};

const ownedChallenge = async (id, user) => {
  const challenge = await CodingChallenge.findById(id);
  if (!challenge) throw new AppError('Challenge not found', 404);
  if (user.role !== USER_ROLES.ADMIN && String(challenge.createdBy) !== String(user.id)) {
    throw new AppError('You can only change challenges you created', 403);
  }
  return challenge;
};

const updateChallenge = async (id, payload, user) => {
  const challenge = await ownedChallenge(id, user);
  Object.assign(challenge, validateChallengePayload(payload, { partial: true }));
  await challenge.save();
  return new ApiResponse(200, 'Challenge updated', { challenge });
};

const deleteChallenge = async (id, user) => {
  const challenge = await ownedChallenge(id, user);
  await CodingSubmission.deleteMany({ challenge: challenge._id });
  await challenge.deleteOne();
  return new ApiResponse(200, 'Challenge deleted');
};

/** Saves an attempt. Results come from the student's browser sandbox, so they are marked self-reported. */
const submitSolution = async ({ challengeId, user, code, passedCount }) => {
  const challenge = await CodingChallenge.findById(challengeId).select('tests isPublished');
  if (!challenge || !challenge.isPublished) throw new AppError('Challenge not found', 404);
  const total = challenge.tests.length;
  if (typeof code !== 'string' || !code.trim() || code.length > 20000) throw new AppError('code must be between 1 and 20000 characters', 422);
  if (!Number.isInteger(passedCount) || passedCount < 0 || passedCount > total) throw new AppError(`passedCount must be between 0 and ${total}`, 422);

  const submission = await CodingSubmission.create({ user: user.id, challenge: challenge._id, code, passedCount, totalTests: total });
  return new ApiResponse(201, 'Attempt saved', { submission: { _id: submission._id, passedCount, totalTests: total, selfReported: true, createdAt: submission.createdAt } });
};

const mySubmissions = async (challengeId, user) => {
  const submissions = await CodingSubmission.find({ user: user.id, challenge: challengeId }).sort('-createdAt').limit(20).select('code passedCount totalTests createdAt').lean();
  return new ApiResponse(200, 'Attempts fetched', { submissions });
};

module.exports = { validateChallengePayload, listChallenges, getChallenge, createChallenge, updateChallenge, deleteChallenge, submitSolution, mySubmissions };
