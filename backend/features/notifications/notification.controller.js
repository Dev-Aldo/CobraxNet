import Notification from './notification.model.js';
import User from '../auth/auth.model.js';

// Obtener todas las notificaciones del usuario autenticado
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'username avatar')
      .populate('post', 'content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipient: userId });
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });

    res.status(200).json({
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener las notificaciones', 
      error: error.message 
    });
  }
};

// Marcar notificación como leída
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.status(200).json({ message: 'Notificación marcada como leída', notification });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al marcar la notificación como leída', 
      error: error.message 
    });
  }
};

// Marcar todas las notificaciones como leídas
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al marcar las notificaciones como leídas', 
      error: error.message 
    });
  }
};

// Eliminar una notificación
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    res.status(200).json({ message: 'Notificación eliminada' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al eliminar la notificación', 
      error: error.message 
    });
  }
};

// Función auxiliar para crear notificaciones (usada por otros controladores)
export const createNotification = async (recipientId, senderId, type, content, postId = null, chatId = null) => {
  try {
    // Evitar crear notificaciones para el mismo usuario
    if (recipientId.toString() === senderId.toString()) {
      return null;
    }

    // Verificar si ya existe una notificación similar reciente (últimos 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingNotification = await Notification.findOne({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      chat: chatId,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingNotification) {
      return existingNotification;
    }

    const notificationData = {
      recipient: recipientId,
      sender: senderId,
      type,
      content
    };

    if (postId) notificationData.post = postId;
    if (chatId) notificationData.chat = chatId;

    const notification = new Notification(notificationData);
    await notification.save();

    return notification;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return null;
  }
};

// Obtener contador de notificaciones no leídas
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener el contador de notificaciones', 
      error: error.message 
    });
  }
}; 