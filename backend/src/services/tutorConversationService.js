const AIConversation = require('../models/AIConversation');
const AIMessage = require('../models/AIMessage');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');

const MAX_MESSAGES_PER_CONVERSATION = 200;

const titleFrom = (text) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t || 'New chat';
};

/** Returns the caller's conversation, or throws 404 (never reveals other users' chats). */
async function getOwnedConversation(userId, conversationId) {
  const conversation = await AIConversation.findOne({ _id: conversationId, user: userId });
  if (!conversation) throw new AppError('Conversation not found', 404);
  return conversation;
}

async function startConversation({ userId, firstUserText, mode }) {
  return AIConversation.create({ user: userId, title: titleFrom(firstUserText), mode });
}

/** Append a message and keep the conversation counters in sync. */
async function appendMessage({ conversation, userId, role, content, aiGenerated = false, meta }) {
  const message = await AIMessage.create({
    conversation: conversation._id,
    user: userId,
    role,
    content,
    aiGenerated,
    ...(meta ? { meta } : {}),
  });
  conversation.messageCount += 1;
  conversation.lastMessageAt = new Date();
  await conversation.save();
  return message;
}

/** Recent history, oldest first, for prompting. Always read from the DB, never trusted from the client. */
async function recentHistory(conversationId, limit) {
  const rows = await AIMessage.find({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('role content')
    .lean();
  return rows.reverse().map((m) => ({ role: m.role, content: m.content }));
}

const listConversations = async (userId, { page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  const [conversations, total] = await Promise.all([
    AIConversation.find({ user: userId })
      .sort({ lastMessageAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    AIConversation.countDocuments({ user: userId }),
  ]);
  return new ApiResponse(200, 'Conversations fetched', {
    conversations,
    pagination: { page: safePage, limit: safeLimit, total },
  });
};

const getMessages = async (userId, conversationId) => {
  const conversation = await getOwnedConversation(userId, conversationId);
  const messages = await AIMessage.find({ conversation: conversation._id })
    .sort({ createdAt: 1 })
    .limit(MAX_MESSAGES_PER_CONVERSATION)
    .lean();
  return new ApiResponse(200, 'Messages fetched', { conversation, messages });
};

/** Students can erase their own chat history (privacy). */
const deleteConversation = async (userId, conversationId) => {
  const conversation = await getOwnedConversation(userId, conversationId);
  await AIMessage.deleteMany({ conversation: conversation._id });
  await conversation.deleteOne();
  return new ApiResponse(200, 'Conversation deleted');
};

const submitFeedback = async (userId, messageId, { rating, reason, comment }) => {
  const message = await AIMessage.findOne({ _id: messageId, user: userId, role: 'assistant' });
  if (!message) throw new AppError('Message not found', 404);
  message.feedback = {
    rating,
    reason: rating === 'down' ? reason || 'other' : undefined,
    comment: comment ? String(comment).slice(0, 500) : undefined,
    at: new Date(),
  };
  await message.save();
  return new ApiResponse(200, 'Thank you — your feedback was recorded');
};

module.exports = {
  MAX_MESSAGES_PER_CONVERSATION,
  titleFrom,
  getOwnedConversation,
  startConversation,
  appendMessage,
  recentHistory,
  listConversations,
  getMessages,
  deleteConversation,
  submitFeedback,
};
