const asyncHandler = require('../utils/asyncHandler');
const gamification = require('../services/gamificationService');
const paths = require('../services/learningPathService');
const coding = require('../services/codingService');

const send = (res, response) => res.status(response.statusCode).json(response);

// gamification
exports.myStats = asyncHandler(async (req, res) => send(res, await gamification.getStats(req.user._id)));
exports.leaderboard = asyncHandler(async (req, res) => send(res, await gamification.leaderboard(req.user._id, req.query.limit)));
exports.setOptIn = asyncHandler(async (req, res) => send(res, await gamification.setLeaderboardOptIn(req.user._id, req.body.optIn)));

// learning paths
exports.listPaths = asyncHandler(async (req, res) => send(res, await paths.listPaths(req.user)));
exports.getPath = asyncHandler(async (req, res) => send(res, await paths.getPath(req.params.id, req.user)));
exports.createPath = asyncHandler(async (req, res) => send(res, await paths.createPath(req.body, req.user)));
exports.updatePath = asyncHandler(async (req, res) => send(res, await paths.updatePath(req.params.id, req.body)));
exports.deletePath = asyncHandler(async (req, res) => send(res, await paths.deletePath(req.params.id)));

// coding challenges
exports.listChallenges = asyncHandler(async (req, res) => send(res, await coding.listChallenges(req.user)));
exports.getChallenge = asyncHandler(async (req, res) => send(res, await coding.getChallenge(req.params.id, req.user)));
exports.createChallenge = asyncHandler(async (req, res) => send(res, await coding.createChallenge(req.body, req.user)));
exports.updateChallenge = asyncHandler(async (req, res) => send(res, await coding.updateChallenge(req.params.id, req.body, req.user)));
exports.deleteChallenge = asyncHandler(async (req, res) => send(res, await coding.deleteChallenge(req.params.id, req.user)));
exports.submitSolution = asyncHandler(async (req, res) =>
  send(res, await coding.submitSolution({ challengeId: req.params.id, user: req.user, code: req.body.code, passedCount: req.body.passedCount }))
);
exports.mySubmissions = asyncHandler(async (req, res) => send(res, await coding.mySubmissions(req.params.id, req.user)));
