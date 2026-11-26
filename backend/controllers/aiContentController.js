import GeneratedContent from '../models/GeneratedContent.js';
import { generateAIContent } from '../services/aiService.js';

// @desc    Generate AI Content
// @route   POST /api/ai-content/generate
// @access  Private
export const generateContent = async (req, res) => {
  try {
    const { contentType, topic, language = 'Tamil', promptDescription } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, message: 'Please provide a topic for content generation' });
    }

    const generatedText = await generateAIContent({
      contentType: contentType || 'Press Release',
      topic,
      language,
      promptDescription,
    });

    res.json({
      success: true,
      data: {
        contentType,
        topic,
        language,
        content: generatedText,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save Generated Content
// @route   POST /api/ai-content/save
// @access  Private
export const saveGeneratedContent = async (req, res) => {
  try {
    const { title, contentType, language, topic, promptDescription, generatedContent } = req.body;

    const saved = await GeneratedContent.create({
      title: title || `${contentType} - ${topic}`,
      contentType,
      language,
      topic,
      promptDescription,
      generatedContent,
      createdBy: req.user ? (req.user.id || req.user._id) : null,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get All Saved Generated Contents
// @route   GET /api/ai-content/saved
// @access  Private
export const getSavedContents = async (req, res) => {
  try {
    const contents = await GeneratedContent.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: contents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Saved Generated Content
// @route   DELETE /api/ai-content/:id
// @access  Private
export const deleteSavedContent = async (req, res) => {
  try {
    const content = await GeneratedContent.findByIdAndDelete(req.params.id);
    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
