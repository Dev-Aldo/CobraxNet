import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Notifications = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Función para sincronizar con otras pestañas
  const syncWithOtherTabs = () => {
    localStorage.setItem('notifications', Date.now().toString());
  };

  // Cargar notificaciones
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/v1/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      setError('Error al cargar las notificaciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Marcar notificación como leída
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3000/api/v1/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Sincronizar con otras pestañas
      syncWithOtherTabs();
    } catch (err) {
      console.error('Error al marcar como leída:', err);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch('http://localhost:3000/api/v1/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
      
      // Sincronizar con otras pestañas
      syncWithOtherTabs();
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err);
    }
  };

  // Eliminar notificación
  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/v1/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      // Sincronizar con otras pestañas
      syncWithOtherTabs();
    } catch (err) {
      console.error('Error al eliminar notificación:', err);
    }
  };

  // Cargar notificaciones cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Actualizar contador global cuando cambia el estado local
  useEffect(() => {
    // Disparar evento para actualizar el contador en el sidebar
    window.dispatchEvent(new CustomEvent('notificationsUpdated', { 
      detail: { unreadCount } 
    }));
  }, [unreadCount]);

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `hace ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `hace ${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Obtener URL de imagen
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  };

  // Obtener icono según tipo de notificación
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'reaction':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'comment':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-black/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h2 className="text-xl font-bold text-white">Notificaciones</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Marcar todas como leídas
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : error ? (
              <div className="text-red-400 text-center p-8">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8 text-white/70">
                <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-lg">No tienes notificaciones</p>
                <p className="text-sm">Las notificaciones aparecerán aquí cuando alguien interactúe contigo</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-white/5' : ''
                    }`}
                    onClick={() => markAsRead(notification._id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar del remitente */}
                      <div className="flex-shrink-0">
                        {notification.sender?.avatar ? (
                          <img
                            src={getImageUrl(notification.sender.avatar)}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-sm border border-white/20">
                            {notification.sender?.username?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                      </div>

                      {/* Contenido de la notificación */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getNotificationIcon(notification.type)}
                          <span className="text-white font-medium">
                            {notification.sender?.username || 'Usuario'}
                          </span>
                          <span className="text-white/60 text-sm">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-white/80 text-sm leading-relaxed">
                          {notification.content}
                        </p>

                        {/* Indicador de no leída */}
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        )}
                      </div>

                      {/* Botón de eliminar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="text-white/40 hover:text-red-400 transition-colors p-1"
                        title="Eliminar notificación"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Notifications; 