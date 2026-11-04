const asyncHandler = require('../utils/asyncHandler');
const tutorService = require('../services/tutorService');
const conversations = require('../services/tutorConversationService');

const send = (res, response) => res.status(response.statusCode).json(response);

exports.chat = asyncHandler(async (req, res) => {
  send(
    res,
    await tutorService.chat({
      studentId: req.user._id,
      messages: req.body.messages,
      conversationId: req.body.conversationId,
      mode: req.body.mode,
    })
  );
});

exports.listConversations = asyncHandler(async (req, res) => {
  send(res, await conversations.listConversations(req.user._id, req.query));
});

exports.getMessages = asyncHandler(async (req, res) => {
  send(res, await conversations.getMessages(req.user._id, req.params.id));
});

exports.deleteConversation = asyncHandler(async (req, res) => {
  send(res, await conversations.deleteConversation(req.user._id, req.params.id));
});

exports.submitFeedback = asyncHandler(async (req, res) => {
  send(res, await conversations.submitFeedback(req.user._id, req.params.messageId, req.body));
});
