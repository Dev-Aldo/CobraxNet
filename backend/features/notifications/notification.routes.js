import { Router } from 'express';
import authMiddleware from '../../shared/middlewares/auth.middleware.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount
} from './notification.controller.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener notificaciones del usuario
router.get('/', getUserNotifications);

// Obtener contador de notificaciones no leídas
router.get('/unread-count', getUnreadCount);

// Marcar notificación como leída
router.patch('/:notificationId/read', markNotificationAsRead);

// Marcar todas las notificaciones como leídas
router.patch('/mark-all-read', markAllNotificationsAsRead);

// Eliminar notificación
router.delete('/:notificationId', deleteNotification);

export default router; 