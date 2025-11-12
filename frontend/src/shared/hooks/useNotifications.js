import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Obtener contador de notificaciones no leídass
  const fetchUnreadCount = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('https://cobraxnet.onrender.com/api/v1/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error al obtener contador de notificaciones:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar contador cuando se marca una notificación como leída
  const decrementCount = useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Actualizar contador cuando se marcan todas como leídas
  const resetCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Cargar contador inicial
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Escuchar cambios en el localStorage para sincronizar entre pestañas
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'notifications') {
        fetchUnreadCount();
      }
    };

    const handleNotificationsUpdated = (e) => {
      setUnreadCount(e.detail.unreadCount);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('notificationsUpdated', handleNotificationsUpdated);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated);
    };
  }, [fetchUnreadCount]);

  // Función para sincronizar con otras pestañas
  const syncWithOtherTabs = useCallback(() => {
    localStorage.setItem('notifications', Date.now().toString());
  }, []);

  return {
    unreadCount,
    loading,
    fetchUnreadCount,
    decrementCount,
    resetCount,
    syncWithOtherTabs
  };
};

export default useNotifications; 
