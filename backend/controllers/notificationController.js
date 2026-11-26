import { Op } from 'sequelize';
import Notification from '../models/Notification.js';

// @desc    Get current user's notifications
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;

    const where = {
      [Op.or]: [
        { recipientId: userId },
        { recipientRole: userRole },
        { recipientRole: 'all' },
      ],
    };

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 30,
    });

    const unreadCount = await Notification.count({
      where: {
        ...where,
        isRead: false,
      },
    });

    res.json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;

    await Notification.update(
      { isRead: true },
      {
        where: {
          [Op.or]: [
            { recipientId: userId },
            { recipientRole: userRole },
            { recipientRole: 'all' },
          ],
          isRead: false,
        },
      }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
