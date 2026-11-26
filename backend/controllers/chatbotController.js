import ChatbotConversation from '../models/ChatbotConversation.js';
import ChatbotMessage from '../models/ChatbotMessage.js';
import { processChatbotQuery } from '../services/aiService.js';

// @desc    Send Message to TVK AI BOT
// @route   POST /api/chatbot/message
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { message, sessionId = 'default-session' } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    // Process using live CRM DB context from MySQL
    const aiResponse = await processChatbotQuery(message);

    const userId = req.user ? (req.user.id || req.user._id) : null;

    // Find or create conversation
    let conversation = await ChatbotConversation.findOne({
      where: {
        sessionId,
        ...(userId ? { userId } : {}),
      },
    });

    if (!conversation) {
      conversation = await ChatbotConversation.create({
        userId: userId || null,
        sessionId,
      });
    }

    const now = new Date();

    // Record user message
    await ChatbotMessage.create({
      conversationId: conversation.id,
      sender: 'user',
      text: message,
      timestamp: now,
      suggestedActions: [],
    });

    // Record bot response
    const botMsg = await ChatbotMessage.create({
      conversationId: conversation.id,
      sender: 'bot',
      text: aiResponse.text,
      timestamp: new Date(),
      suggestedActions: aiResponse.suggestedActions || [],
    });

    res.json({
      success: true,
      data: {
        reply: aiResponse.text,
        suggestedActions: aiResponse.suggestedActions || [],
        timestamp: botMsg.timestamp,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Chat History
// @route   GET /api/chatbot/history
// @access  Private
export const getChatHistory = async (req, res) => {
  try {
    const { sessionId = 'default-session' } = req.query;
    const userId = req.user ? (req.user.id || req.user._id) : null;

    const conversation = await ChatbotConversation.findOne({
      where: {
        sessionId,
        ...(userId ? { userId } : {}),
      },
    });

    if (!conversation) {
      return res.json({ success: true, data: [] });
    }

    const messages = await ChatbotMessage.findAll({
      where: { conversationId: conversation.id },
      order: [['timestamp', 'ASC']],
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear Chat History
// @route   DELETE /api/chatbot/history
// @access  Private
export const clearChatHistory = async (req, res) => {
  try {
    const { sessionId = 'default-session' } = req.query;
    const userId = req.user ? (req.user.id || req.user._id) : null;

    const conversation = await ChatbotConversation.findOne({
      where: {
        sessionId,
        ...(userId ? { userId } : {}),
      },
    });

    if (conversation) {
      await ChatbotMessage.destroy({ where: { conversationId: conversation.id } });
      await conversation.destroy();
    }

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
