
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from 'axios';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import ReactionsModal from './ReactionsModal';
import { useToxicityCheck } from '../../shared/hooks/useToxicityCheck';
import { useNSFWCheck } from '../../shared/hooks/useNSFWCheck';

const GroupChat = () => {
  const { groupId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [group, setGroup] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editMediaFiles, setEditMediaFiles] = useState([]);
  const [editMediaPreviews, setEditMediaPreviews] = useState([]);
  const [reactionMessage, setReactionMessage] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(null);
  const [showMentionSelector, setShowMentionSelector] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(null);
  const [lastAtIndex, setLastAtIndex] = useState(-1);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);

  // Hooks para verificación de contenido
  const { checkText } = useToxicityCheck();
  const { checkImage } = useNSFWCheck();
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: '' });

  // Función para mostrar notificación
  const mostrarNotificacion = (mensaje, tipo = 'error') => {
    setNotificacion({ show: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: '' }), 5000);
  };

  const handleRemoveReaction = async (messageId, reaction) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:3000/api/v1/groups/${groupId}/messages/${messageId}/reactions/${encodeURIComponent(reaction)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Actualizar el estado local con las reacciones actualizadas del servidor
      if (response.data && response.data.success) {
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg._id === messageId) {
              return {
                ...msg,
                reactions: response.data.reactions
              };
            }
            return msg;
          })
        );

        // Emitir evento de socket
        socket.emit('group:reactionUpdate', {
          messageId,
          groupId,
          reactions: response.data.reactions
        });
      }
    } catch (error) {
      console.error('Error al eliminar la reacción:', error);
    }
  };

  // Conectar al servidor de Socket.io y unirse a la sala del grupo
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !groupId) return;

    const newSocket = io('http://localhost:3000', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect_error', (err) => {
      console.error('Error de conexión Socket.IO:', err);
      setError(`Error de conexión al servidor: ${err.message}`);
      setLoading(false);
    });

    newSocket.on('connect', () => {
      setSocket(newSocket);
      // Unirse a la sala del grupo
      newSocket.emit('joinGroupChat', { groupId });
      setLoading(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [groupId]);

  // Cargar mensajes del grupo y datos del grupo
  useEffect(() => {
    const fetchGroupMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No hay token de autenticación');
          setLoading(false);
          return;
        }

        // Obtener información del grupo
        const groupResponse = await axios.get(`http://localhost:3000/api/v1/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGroup(groupResponse.data.data);

        // Obtener mensajes del grupo
        const messagesResponse = await axios.get(`http://localhost:3000/api/v1/groups/${groupId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Asegurarse de que todos los mensajes tengan la estructura correcta
        const formattedMessages = (messagesResponse.data.messages || []).map(msg => ({
          ...msg,
          media: msg.media || [],
          replyTo: msg.replyTo ? {
            ...msg.replyTo,
            messageId: msg.replyTo._id || msg.replyTo.messageId,
            content: msg.replyTo.content || '',
            sender: msg.replyTo.sender ? {
              _id: msg.replyTo.sender._id,
              username: msg.replyTo.sender.username || 'Usuario',
              avatar: msg.replyTo.sender.avatar
            } : { username: 'Usuario' },
            media: Array.isArray(msg.replyTo.media) ? msg.replyTo.media.map(file => ({
              ...file,
              url: file.url,
              type: file.type || file.url?.split('.').pop(),
              name: file.name || file.url?.split('/').pop()
            })) : []
          } : null
        }));
        
        setMessages(formattedMessages);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar mensajes del grupo:', err);
        setError('Error al cargar los mensajes. Por favor, intenta de nuevo más tarde.');
        setLoading(false);
      }
    };

    if (groupId) {
      fetchGroupMessages();
    }
  }, [groupId]);

  // Escuchar nuevos mensajes del grupo
  useEffect(() => {
    if (!socket) return;

    const handleGroupMessage = (message) => {
      setMessages((prevMessages) => {
        // Asegurarse de que la información del remitente y la respuesta esté completa
        const formatted = {
          ...message,
          media: message.media || [],
          sender: message.sender || { username: 'Usuario desconocido' },
          replyTo: message.replyTo ? {
            ...message.replyTo,
            messageId: message.replyTo._id || message.replyTo.messageId,
            content: message.replyTo.content || '',
            sender: message.replyTo.sender ? {
              _id: message.replyTo.sender._id,
              username: message.replyTo.sender.username || 'Usuario desconocido',
              avatar: message.replyTo.sender.avatar
            } : { username: 'Usuario desconocido' },
            media: Array.isArray(message.replyTo.media) ? message.replyTo.media.map(file => ({
              ...file,
              url: file.url,
              type: file.type || file.url?.split('.').pop(),
              name: file.name || file.url?.split('/').pop()
            })) : []
          } : null
        };

        const updatedMessages = [...prevMessages, formatted];
        localStorage.setItem('groupChatMessages', JSON.stringify(updatedMessages));
        return updatedMessages;
      });
    };

    const handleGroupMessageUpdated = (message) => {
      setMessages(prev => prev.map(m => m._id === message._id ? { ...m, ...message } : m));
    };

    const handleGroupReactionUpdated = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, reactions } : msg
      ));
    };

    socket.on('groupMessage', handleGroupMessage);
    socket.on('groupMessageUpdated', handleGroupMessageUpdated);
    socket.on('groupReactionUpdated', handleGroupReactionUpdated);

    return () => {
      socket.off('groupMessage', handleGroupMessage);
      socket.off('groupMessageUpdated', handleGroupMessageUpdated);
      socket.off('groupReactionUpdated', handleGroupReactionUpdated);
    };
  }, [socket]);

  // Escuchar eliminación de mensajes
  useEffect(() => {
    if (!socket) return;

    const handleDeleteMessage = ({ messageId }) => {
      setMessages((prevMessages) => {
        const updatedMessages = prevMessages.filter(msg => msg._id !== messageId);
        localStorage.setItem('groupChatMessages', JSON.stringify(updatedMessages));
        return updatedMessages;
      });
    };

    socket.on('deleteGroupMessage', handleDeleteMessage);

    return () => {
      socket.off('deleteGroupMessage', handleDeleteMessage);
    };
  }, [socket]);

  // Cerrar el emoji picker cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cerrar el reaction picker cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(false);
        setReactionMessage(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Agregar estilos para el efecto de resaltado al montar el componente
  useEffect(() => {
    const highlightKeyframes = `
      @keyframes highlight-message {
        0% { background-color: rgba(79, 70, 229, 0.2); }
        100% { background-color: transparent; }
      }
      @keyframes highlight-mention {
        0% { background-color: rgba(99, 102, 241, 0.3); }
        50% { background-color: rgba(99, 102, 241, 0.3); }
        100% { background-color: rgba(99, 102, 241, 0.2); }
      }
    `;
    const style = document.createElement('style');
    style.textContent = highlightKeyframes + `
      .highlight { animation: highlight-message 2s ease-out; }
      .mentioned-message { animation: highlight-mention 2s ease-out forwards; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar un nuevo mensaje al grupo (con archivos multimedia opcionales)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && mediaFiles.length === 0) || !socket) return;

    try {
      // Verificar contenido del mensaje
      if (newMessage.trim()) {
        const result = await checkText(newMessage);
        if (result.isToxic) {
          mostrarNotificacion('El contenido del mensaje parece ser inapropiado', 'error');
          return;
        }
      }

      // Verificar imágenes si hay
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const result = await checkImage(file);
          if (result.isNSFW) {
            mostrarNotificacion('Una o más imágenes parecen ser inapropiadas', 'error');
            return;
          }
        }
      }

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', newMessage);
      
      // Agregar archivos multimedia
      mediaFiles.forEach(file => {
        formData.append('media', file);
      });

      if (replyingTo && replyingTo._id) {
        formData.append('replyTo', replyingTo._id.toString());
      }

      // Enviar el mensaje al servidor
      const response = await axios.post(
        `http://localhost:3000/api/v1/groups/${groupId}/messages`, 
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Si el servidor responde con el mensaje, actualizamos el estado localmente
      if (response.data && response.data.message) {
        const newMessage = response.data.message;
        
        // Emitir el mensaje a través del socket para que todos los clientes lo reciban
        socket.emit('groupMessage', {
          groupId,
          message: newMessage
        });
        
        // No actualizamos los mensajes aquí porque lo haremos cuando recibamos el evento
        // Esto asegura que todos los clientes vean el mensaje al mismo tiempo y en el orden correcto
      }

      // Limpiar el formulario después de enviar exitosamente
      setNewMessage('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setShowEmojiPicker(false);
      setReplyingTo(null);

      // Auto-scroll al último mensaje
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      setError('Error al enviar el mensaje');
    }
  };

  // Manejar la respuesta a un mensaje
  const handleReply = (message) => {
    const replyData = {
      _id: message._id,
      content: message.content,
      sender: {
        _id: message.sender._id,
        username: message.sender.username,
        avatar: message.sender.avatar
      }
    };
    setReplyingTo(replyData);
  };

  // Iniciar edición de mensaje
  const startEdit = (msg) => {
    setEditingMessage(msg);
    setEditingText(msg.content || '');
    setEditMediaFiles([]);
    setEditMediaPreviews(msg.media ? msg.media.map(file => ({
      url: file.url,
      type: file.type || file.url?.split('/')[0],
      name: file.name || file.url?.split('/').pop()
    })) : []);
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingMessage(null);
    setEditingText('');
    setEditMediaFiles([]);
    setEditMediaPreviews([]);
  };

  // Previsualización de archivos al editar
  const handleEditMediaChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setEditMediaFiles(prev => [...prev, ...files]);
      
      // Crear previsualizaciones
      const newPreviews = files.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.split('/')[0],
        name: file.name
      }));
      setEditMediaPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveEditMedia = (index) => {
    setEditMediaFiles(prev => prev.filter((_, i) => i !== index));
    setEditMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Enviar edición al servidor
  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingMessage) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Añadir el contenido del mensaje
      formData.append('content', editingText);
      
      // Agregar nuevos archivos multimedia
      editMediaFiles.forEach(file => {
        formData.append('media', file);
      });

      // Filtrar y agregar archivos multimedia existentes que no fueron eliminados
      const existingMedia = editingMessage.media?.filter(media => 
        editMediaPreviews.some(preview => preview.url === media.url)
      ) || [];
      
      if (existingMedia.length > 0) {
        formData.append('existingMedia', JSON.stringify(existingMedia));
      }

      const response = await axios.patch(
        `http://localhost:3000/api/v1/groups/${groupId}/messages/${editingMessage._id}`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data && response.data.data) {
        const updated = response.data.data;
        
        // Actualizar el mensaje en el estado local
        setMessages(prev => prev.map(m => 
          m._id === updated._id ? { ...m, ...updated } : m
        ));

        // Emitir el evento de actualización a través del socket
        if (socket) {
          socket.emit('groupMessageUpdated', {
            messageId: updated._id,
            groupId,
            ...updated
          });
        }

        // Limpiar el estado de edición
        cancelEdit();
      }
    } catch (err) {
      console.error('Error al editar el mensaje:', err);
      mostrarNotificacion('Error al editar el mensaje', 'error');
    }
  };

  const handleCancelReply = () => setReplyingTo(null);

  

  // Eliminar un mensaje del grupo
  const handleDeleteMessage = async (messageId) => {
    if (!socket) return;
    
    const message = messages.find(msg => msg._id === messageId);
    const isCurrentUser = message && (message.sender?._id === currentUserId || message.sender === currentUserId);
    
    // Solo permitir eliminar si es el autor del mensaje, admin o creador
    if (!isCurrentUser && !isAdmin() && !isCreator()) {
      return;
    }

    let confirmMessage = '¿Seguro que quieres eliminar este mensaje?';
    if (!isCurrentUser) {
      if (isCreator()) {
        confirmMessage = '¿Estás seguro de que quieres eliminar este mensaje como creador del grupo? Esta acción no se puede deshacer.';
      } else if (isAdmin()) {
        confirmMessage = '¿Estás seguro de que quieres eliminar este mensaje como administrador? Esta acción no se puede deshacer.';
      }
    }
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/v1/groups/${groupId}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Emitir el evento de socket para notificar a todos los usuarios
      socket.emit('deleteGroupMessage', { messageId, groupId });
      
      // Actualizar el estado local
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (error) {
      console.error('Error al eliminar el mensaje:', error);
      alert('No se pudo eliminar el mensaje. Por favor, inténtalo de nuevo.');
    }
  };

  // Añadir emoji al mensaje
  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji.native);
  };

  // Manejar selección de archivos multimedia
  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setMediaFiles(prev => [...prev, ...files]);
      
      // Crear previsualizaciones
      const newPreviews = files.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.split('/')[0],
        name: file.name
      }));
      setMediaPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // Quitar archivo multimedia seleccionado
  const handleRemoveMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      return newPreviews;
    });
  };

  // Formatear la fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Obtener URL completa de la imagen
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  };

  // Obtener el userId actual del token
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId;
    } catch {
      return null;
    }
  };
  const currentUserId = getCurrentUserId();

  // Verificar si el usuario es administrador del grupo
  const isAdmin = () => {
    if (!group || !group.members || !currentUserId) return false;
    const member = group.members.find(member => {
      const userId = member.user._id || member.user;
      return userId === currentUserId;
    });
    return member && (member.role === 'admin' || member.role === 'creator');
  };

  // Verificar si el usuario es el creador del grupo
  const isCreator = () => {
    if (!group || !group.members || !currentUserId) return false;
    const member = group.members.find(member => {
      const userId = member.user._id || member.user;
      return userId === currentUserId;
    });
    return member && member.role === 'creator';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Componente de notificación */}
      {notificacion.show && (
        <div className={`fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-2 sm:px-4`}>
          <div className={`${notificacion.tipo === 'error' ? 'bg-red-500/20 border-red-500/50' : 'bg-green-500/20 border-green-500/50'} border text-white p-3 sm:p-4 rounded-lg flex items-start gap-2 sm:gap-3 backdrop-blur-sm shadow-lg`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm sm:text-base">{notificacion.mensaje}</span>
          </div>
        </div>
      )}

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 w-full z-20 bg-black backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img src="/logo.png" alt="Logo" className="h-10 sm:h-12 md:h-16 cursor-pointer" />
          </a>
        </div>
      </motion.nav>

      {/* Contenido principal */}
      <div className="fixed inset-0 top-[56px] sm:top-[64px] md:top-[88px] p-2 sm:p-4 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col flex-1 h-[calc(100%-0.5rem)] sm:h-[calc(100%-1rem)] mt-2 sm:mt-4 bg-black shadow-xl overflow-hidden border border-white/20 rounded-lg"
        >
          <div className="p-2 sm:p-4 bg-black border-b border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white flex flex-wrap items-center gap-1 sm:gap-2">
              <span className="whitespace-nowrap">Chat de grupo</span>
              {group && (
                <span className="text-sm sm:text-base font-normal text-gray-300 flex items-center flex-wrap gap-1 sm:gap-2">
                  <span className="hidden sm:inline mr-0 sm:mr-2">en</span>
                  {group.avatar ? (
                    <img src={getImageUrl(group.avatar)} alt="Avatar Grupo" className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover border-2 border-white" />
                  ) : (
                    <span className="inline-block h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-black font-bold text-xs sm:text-base border-2 border-white">
                      {group?.name?.charAt(0) || 'G'}
                    </span>
                  )}
                  <span className="ml-0 sm:ml-2 truncate max-w-[120px] sm:max-w-none">{group?.name || 'Grupo'}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">({group?.members?.length || 0} miembros)</span>
                </span>
              )}
            </h2>
            <a href={`/groups/${groupId}`} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition text-xs sm:text-sm whitespace-nowrap">
              Volver al grupo
            </a>
          </div>

          {/* Área de mensajes */}
          <div className="overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 bg-black flex-1 custom-scrollbar" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : error ? (
              <div className="text-red-400 text-center text-sm sm:text-base px-2">{error}</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-400 text-center text-sm sm:text-base px-2">No hay mensajes aún. ¡Sé el primero en escribir!</div>
            ) : (
              messages.map((msg, index) => {
                // Obtener información del usuario actual del token (como en Chat.jsx)
                const token = localStorage.getItem('token');
                let userId = null;
                try {
                  if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.userId;
                  }
                } catch {}

                const isCurrentUser = msg.sender?._id === userId;

                return (
                  <motion.div
                    key={msg._id || index}
                    id={`message-${msg._id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-3 py-2 px-2 hover:bg-white/5 group transition-colors duration-300 
                      ${msg.content?.includes(`@${group?.members?.find(member => 
                        member.user._id === userId || member.user === userId
                      )?.user?.username}`) ? 'mentioned-message' : ''}`}
                    style={{ width: '100%' }}
                  >
                    {/* Avatar */}
                    {(() => {
                      let currentUserId = null;
                      const token = localStorage.getItem('token');
                      try {
                        if (token) {
                          const payload = JSON.parse(atob(token.split('.')[1]));
                          currentUserId = payload.userId;
                        }
                      } catch {}
                      const isCurrentUserLocal = msg.sender?._id === currentUserId;
                      const profileHref = isCurrentUserLocal ? '/profile' : `/profile/${msg.sender?._id}`;
                      const avatarClass = "absolute inset-0 w-full h-full rounded-full object-cover border-2 border-white group-hover:ring-2 group-hover:ring-indigo-400 transition";
                      const defaultAvatarClass = "absolute inset-0 w-full h-full rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xs sm:text-base border-2 border-white/50 shadow-md group-hover:ring-2 group-hover:ring-indigo-400 transition";
                      if (msg.sender?.avatar && msg.sender.avatar !== '/uploads/default-avatar.png') {
                        return (
                          <a href={profileHref} className="group flex-shrink-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 relative">
                              <img
                                key={msg.sender.avatar}
                                src={getImageUrl(msg.sender.avatar)}
                                alt="Avatar"
                                className={avatarClass}
                                onError={e => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          </a>
                        );
                      } else {
                        return (
                          <a href={profileHref} className="group flex-shrink-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 relative">
                              <div className={defaultAvatarClass}>
                                {msg.sender?.username?.[0]?.toUpperCase() || "U"}
                              </div>
                            </div>
                          </a>
                        );
                      }
                    })()}

                    {/* Contenido del mensaje estilo Chat.jsx */}
                    <div className="flex flex-col w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-white group-hover:text-indigo-400 flex items-center gap-1 sm:gap-2">
                          <span className="truncate max-w-[100px] sm:max-w-none">{msg.sender?.username || 'Usuario'}</span>
                          {group?.members?.find(member => {
                            const userId = member.user._id || member.user;
                            return userId === msg.sender?._id && member.role === 'admin';
                          }) && (
                            <span className="text-[10px] sm:text-xs bg-purple-500/30 text-purple-200 px-1 sm:px-1.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1 flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 sm:h-2.5 sm:w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span className="hidden sm:inline">Admin</span>
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(msg.timestamp)}
                        </span>
                        <div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-2">
                          <button
                            onClick={() => {
                              setReactionMessage(msg);
                              setShowReactionPicker(prev => !prev);
                            }}
                            className="text-gray-600 hover:text-indigo-400 transition-all duration-200 
                                     opacity-100 sm:opacity-0 group-hover:opacity-100 transform hover:scale-110 p-1 touch-manipulation"
                            title="Reaccionar al mensaje"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {msg.reactions && msg.reactions.length > 0 && (
                            <button
                              onClick={() => setShowReactionsModal(msg._id)}
                              className="text-gray-600 hover:text-indigo-400 transition-all duration-200 
                                       opacity-100 sm:opacity-0 group-hover:opacity-100 transform hover:scale-110 p-1 touch-manipulation"
                              title="Ver todas las reacciones"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                      d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )}
                          {!isCurrentUser && (
                            <button
                              onClick={() => handleReply(msg)}
                              className="text-gray-600 hover:text-indigo-400 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 p-1 touch-manipulation"
                              title="Responder mensaje"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                          )}
                          {/* Botones de acciones solo para el autor del mensaje */}
                          {isCurrentUser && (
                            <>
                              <button 
                                onClick={() => startEdit(msg)}
                                className="text-gray-400 hover:text-indigo-400 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 p-1 touch-manipulation"
                                title="Editar mensaje"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18.71-11.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.83-1.66z" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleDeleteMessage(msg._id)}
                                className="text-gray-600 hover:text-red-500 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 p-1 touch-manipulation"
                                title="Eliminar mensaje"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                          
                          {/* Botón de eliminar para administradores y creador */}
                          {!isCurrentUser && (isAdmin() || isCreator()) && (
                            <button 
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="text-gray-600 hover:text-red-500 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 p-1 touch-manipulation"
                              title={`Eliminar mensaje como ${isCreator() ? 'creador' : 'administrador'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Edit mode for this message */}
                      {editingMessage && editingMessage._id === msg._id ? (
                        <form onSubmit={submitEdit} className="mt-2 flex flex-col space-y-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-black text-white rounded-lg px-3 py-2 border border-white/20 text-sm sm:text-base"
                          />
                          {/* Previsualización de archivos multimedia al editar */}
                          {editMediaPreviews.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {editMediaPreviews.map((preview, index) => (
                                <div key={index} className="relative group">
                                  {preview.type === 'image' ? (
                                    <img 
                                      src={preview.url} 
                                      alt={preview.name} 
                                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-white/30"
                                    />
                                  ) : preview.type === 'video' ? (
                                    <video 
                                      src={preview.url} 
                                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-white/30"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white/10 rounded-lg border border-white/30">
                                      <span className="text-[10px] sm:text-xs text-white text-center break-words p-1">
                                        {preview.name}
                                      </span>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditMedia(index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 touch-manipulation"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="flex items-center cursor-pointer bg-white/10 hover:bg-white/20 rounded-lg px-2 py-2 border border-white/30 touch-manipulation">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                              </svg>
                              <input
                                type="file"
                                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                                className="hidden"
                                onChange={handleEditMediaChange}
                                multiple
                              />
                            </label>
                            <button type="submit" className="bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm sm:text-base touch-manipulation">Guardar</button>
                            <button type="button" onClick={cancelEdit} className="text-gray-300 px-3 py-2 rounded-lg text-sm sm:text-base touch-manipulation">Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {/* Mostrar mensaje al que se responde con foto de perfil */}
                          {msg.replyTo && (
                            <div 
                              className="mt-1 flex items-center space-x-2 bg-white/5 rounded p-2 mb-2 cursor-pointer hover:bg-white/10 touch-manipulation"
                              onClick={() => {
                                const replyElement = document.getElementById(`message-${msg.replyTo.messageId}`);
                                if (replyElement) {
                                  replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  replyElement.classList.add('highlight');
                                  setTimeout(() => replyElement.classList.remove('highlight'), 2000);
                                }
                              }}
                            >
                              <div className="w-1 h-6 sm:h-8 bg-indigo-400 rounded-full flex-shrink-0"></div>
                              {/* Foto de perfil del usuario al que se responde */}
                              {msg.replyTo.sender && (
                                <div className="w-6 h-6 sm:w-7 sm:h-7 relative flex-shrink-0">
                                  {msg.replyTo.sender.avatar && msg.replyTo.sender.avatar !== '/uploads/default-avatar.png' ? (
                                    <img
                                      src={getImageUrl(msg.replyTo.sender.avatar)}
                                      alt="Avatar"
                                      className="absolute inset-0 w-full h-full rounded-full object-cover border-2 border-indigo-400"
                                      onError={e => { e.target.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-[10px] sm:text-xs border-2 border-indigo-400">
                                      {msg.replyTo.sender.username?.[0]?.toUpperCase() || "U"}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[10px] sm:text-xs text-indigo-400 truncate">
                                  {msg.replyTo.sender?.username || 'Usuario desconocido'}
                                </span>
                                <div className="text-xs sm:text-sm text-white/70 min-w-0">
                                  {msg.replyTo.content && (
                                    <span className="truncate block">{msg.replyTo.content}</span>
                                  )}
                                  {msg.replyTo.media && msg.replyTo.media.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                      {msg.replyTo.media.map((file, index) => {
                                        if (file.type === 'image') {
                                          return (
                                            <img
                                              key={index}
                                              src={getImageUrl(file.url)}
                                              alt={file.name}
                                              className="w-6 h-6 sm:w-8 sm:h-8 object-cover rounded flex-shrink-0"
                                            />
                                          );
                                        } else if (file.type === 'video') {
                                          return (
                                            <div key={index} className="flex items-center gap-1 flex-shrink-0">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                              </svg>
                                              <span className="text-[10px] sm:text-xs">Video</span>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div key={index} className="flex items-center gap-1 min-w-0">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                              </svg>
                                              <span className="text-[10px] sm:text-xs truncate">{file.name}</span>
                                            </div>
                                          );
                                        }
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Renderizar texto si existe */}
                          {msg.content && (
                            <p className="mt-1 text-sm sm:text-base text-white break-words" style={{ maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                              {msg.content.split(/(@\w+)/).map((part, index) => {
                                if (part.startsWith('@')) {
                                  const username = part.slice(1);
                                  const isMember = group?.members?.some(
                                    member => (member.user.username || (typeof member.user === 'string' ? '' : member.user._id)) === username
                                  );
                                  const userId = (() => {
                                  const token = localStorage.getItem('token');
                                  try {
                                    if (token) {
                                      const payload = JSON.parse(atob(token.split('.')[1]));
                                      return payload.userId;
                                    }
                                  } catch {}
                                  return null;
                                })();

                                const mentionedMember = group?.members?.find(member => 
                                  (member.user.username || (typeof member.user === 'string' ? '' : member.user._id)) === username
                                );
                                const mentionedUserId = mentionedMember?.user._id || mentionedMember?.user;
                                const isCurrentUser = username === group?.members?.find(member => 
                                  member.user._id === userId || member.user === userId
                                )?.user?.username;

                                return isMember ? (
                                    <Link
                                      key={index}
                                      to={isCurrentUser ? '/profile' : `/profile/${mentionedUserId}`}
                                      className={`text-indigo-400 hover:underline cursor-pointer ${
                                        isCurrentUser ? 'font-bold' : ''
                                      }`}
                                      onClick={(e) => {
                                        // Prevenir que el evento se propague si el usuario no existe
                                        if (!mentionedUserId) {
                                          e.preventDefault();
                                        }
                                      }}
                                    >
                                      {part}
                                    </Link>
                                  ) : part;
                                }
                                return part;
                              })}
                            </p>
                          )}
                          {/* Renderizar archivos multimedia */}
                          {msg.media && msg.media.length > 0 && (
                            <div className="mt-2">
                              {msg.media.some(file => file.type === 'image') && (
                                <div className={`grid gap-1 sm:gap-2 ${
                                  msg.media.filter(f => f.type === 'image').length === 1 ? 'grid-cols-1' :
                                  msg.media.filter(f => f.type === 'image').length === 2 ? 'grid-cols-2' :
                                  msg.media.filter(f => f.type === 'image').length <= 6 ? 'grid-cols-2 sm:grid-cols-3' :
                                  'grid-cols-2 sm:grid-cols-3'
                                } max-w-full sm:max-w-[360px]`}>
                                  {msg.media.filter(file => file.type === 'image').map((file, index) => (
                                    <button
                                      key={index}
                                      onClick={() => setFullScreenImage(getImageUrl(file.url))}
                                      className="block w-full cursor-zoom-in touch-manipulation"
                                    >
                                      <img
                                        src={getImageUrl(file.url)}
                                        alt={file.name}
                                        className={`rounded-lg border border-white/30 shadow-lg hover:opacity-95 transition-opacity ${
                                          msg.media.filter(f => f.type === 'image').length === 1 
                                            ? 'max-w-full sm:max-w-[360px] w-full h-auto object-contain' 
                                            : 'w-full h-[100px] sm:h-[140px] object-cover'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                              {msg.media.filter(file => file.type !== 'image').map((file, index) => (
                                <div key={index} className="mb-2">
                                  {file.type === 'video' ? (
                                    <video
                                      src={getImageUrl(file.url)}
                                      controls
                                      className="rounded-lg max-w-full sm:max-w-[320px] max-h-[300px] sm:max-h-[400px] w-full h-auto border border-white/30 shadow-lg"
                                    >
                                      Tu navegador no soporta la reproducción de video.
                                    </video>
                                  ) : (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 bg-white/10 border border-white/20 rounded-lg p-2 sm:p-4">
                                      <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-7 sm:w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6c-1.1 0-2 .9-2 2zm7 1.5V9h5.5L13 5.5z" />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                                        <div className="text-white font-semibold truncate text-sm sm:text-base">{file.name}</div>
                                        <div className="text-xs text-white/60">Archivo adjunto</div>
                                      </div>
                                      <a
                                        href={getImageUrl(file.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={file.name}
                                        className="px-3 py-1.5 sm:py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs sm:text-sm transition-colors whitespace-nowrap w-full sm:w-auto text-center"
                                      >
                                        Descargar
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Mostrar reacciones */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2">
                              {[...new Set(msg.reactions.map(r => r.reaction))].map(reactionEmoji => {
                                const reactionsForEmoji = msg.reactions.filter(r => r.reaction === reactionEmoji);
                                return (
                                  <div 
                                    key={reactionEmoji}
                                    className="flex items-center bg-white/10 hover:bg-white/20 
                                             border border-white/40 hover:border-white/60
                                             rounded-full px-2 sm:px-2.5 py-0.5 text-xs sm:text-sm transition-all duration-200 
                                             cursor-pointer transform hover:scale-105 touch-manipulation"
                                  >
                                    <span className="text-sm sm:text-base">{reactionEmoji}</span>
                                    {reactionsForEmoji.length > 1 && (
                                      <span className="ml-1 text-[10px] sm:text-xs font-medium text-gray-400">
                                        {reactionsForEmoji.length}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Selector de emojis para reacciones */}
          {showReactionPicker && (
            <div 
              ref={reactionPickerRef}
              className="fixed sm:absolute bottom-20 sm:bottom-20 left-2 sm:left-auto sm:right-4 z-20 max-w-[calc(100vw-1rem)] sm:max-w-none"
              style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))' }}
            >
              <Picker 
                data={data} 
                onEmojiSelect={async (emoji) => {
                  if (reactionMessage && socket) {
                    try {
                      console.log('Enviando reacción:', {
                        messageId: reactionMessage._id,
                        reaction: emoji.native
                      });
                      
                      const token = localStorage.getItem('token');
                      const response = await axios.post(
                        `http://localhost:3000/api/v1/groups/${groupId}/messages/${reactionMessage._id}/reaction`,
                        { reaction: emoji.native },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );

                      console.log('Respuesta del servidor:', response.data);

                      if (response.data && response.data.success) {
                        // Actualizar el estado local
                        setMessages(prev => prev.map(msg =>
                          msg._id === reactionMessage._id
                            ? { ...msg, reactions: response.data.reactions }
                            : msg
                        ));

                        // Notificar a otros usuarios
                        socket.emit('groupReactionUpdate', {
                          messageId: reactionMessage._id,
                          groupId,
                          reactions: response.data.reactions
                        });
                      }

                      setShowReactionPicker(false);
                      setReactionMessage(null);
                    } catch (error) {
                      console.error('Error al agregar reacción:', error.response || error);
                      setError('Error al agregar la reacción');
                    }
                  }
                }}
                theme="dark"
                previewPosition="none"
                skinTonePosition="none"
                searchPosition="none"
                perLine={8}
                maxFrequentRows={1}
                emojiSize={24}
              />
            </div>
          )}

          {/* Formulario para enviar mensajes */}
          <form onSubmit={handleSendMessage} className="p-2 sm:p-4 border-t border-white/20 bg-black sticky bottom-0 z-10">
            <div className="flex flex-col space-y-2">
              {/* Previsualización de respuesta */}
              {replyingTo && (
                <div className="flex items-center justify-between bg-white/10 p-2 rounded-lg gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="w-1 h-6 sm:h-8 bg-indigo-400 rounded-full flex-shrink-0"></div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs text-indigo-400 truncate">Respondiendo a {replyingTo.sender?.username}</span>
                      <span className="text-xs sm:text-sm text-white/70 truncate">{replyingTo.content || (replyingTo.imageUrl ? '📷 Imagen' : '')}</span>
                    </div>
                  </div>
                  <button type="button" onClick={handleCancelReply} className="text-gray-400 hover:text-white flex-shrink-0 p-1 touch-manipulation">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
              {/* Previsualización de archivos multimedia */}
              {mediaPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {preview.type === 'image' ? (
                        <img 
                          src={preview.url} 
                          alt={preview.name} 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-white/30"
                        />
                      ) : preview.type === 'video' ? (
                        <video 
                          src={preview.url} 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-white/30"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white/10 rounded-lg border border-white/30">
                          <span className="text-[10px] sm:text-xs text-white text-center break-words p-1">
                            {preview.name}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 touch-manipulation"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex space-x-2">
                <div className="flex-1 relative min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={e => {
                      const value = e.target.value;
                      setNewMessage(value);
                      
                      // Detectar '@' y actualizar estado
                      const atIndex = value.lastIndexOf('@');
                      if (atIndex !== -1 && (atIndex === 0 || value[atIndex - 1] === ' ')) {
                        setLastAtIndex(atIndex);
                        setShowMentionSelector(true);
                        setMentionSearch(value.slice(atIndex + 1));
                      } else if (lastAtIndex !== -1 && !value.includes('@', lastAtIndex)) {
                        setShowMentionSelector(false);
                        setLastAtIndex(-1);
                      }

                      // Actualizar búsqueda de menciones
                      if (showMentionSelector && lastAtIndex !== -1) {
                        setMentionSearch(value.slice(lastAtIndex + 1));
                      }
                    }}
                    onKeyDown={e => {
                      if (showMentionSelector && e.key === 'Escape') {
                        setShowMentionSelector(false);
                        setLastAtIndex(-1);
                      }
                    }}
                    placeholder="Escribe un mensaje... (@para mencionar)"
                    className="w-full bg-black text-white rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-white border border-white/30"
                    disabled={!socket || loading}
                  />
                  
                  {/* Selector de menciones */}
                  {showMentionSelector && group?.members && (
                    <div className="absolute bottom-full left-0 mb-2 w-full sm:w-64 max-h-48 overflow-y-auto bg-black border border-white/20 rounded-lg shadow-xl z-30 custom-scrollbar">
                      {group.members
                        .filter(member => {
                          const username = member.user.username || (typeof member.user === 'string' ? '' : member.user._id);
                          return username.toLowerCase().includes(mentionSearch.toLowerCase());
                        })
                        .map((member) => {
                          const username = member.user.username || (typeof member.user === 'string' ? '' : member.user._id);
                          return (
                            <button
                              key={member.user._id || member.user}
                              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 text-left text-white touch-manipulation"
                              onClick={() => {
                                const beforeMention = newMessage.slice(0, lastAtIndex);
                                const afterMention = newMessage.slice(lastAtIndex + mentionSearch.length + 1);
                                setNewMessage(beforeMention + `@${username} ` + afterMention);
                                setShowMentionSelector(false);
                                setLastAtIndex(-1);
                                inputRef.current?.focus();
                              }}
                            >
                              {member.user.avatar ? (
                                <img
                                  src={getImageUrl(member.user.avatar)}
                                  alt={username}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xs border-2 border-white/50 shadow-md flex-shrink-0">
                                  {username[0]?.toUpperCase() || "U"}
                                </div>
                              )}
                              <span className="truncate flex-1">{username}</span>
                              {member.role === 'admin' && (
                                <span className="text-xs bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  Admin
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors touch-manipulation p-1"
                    disabled={!socket || loading}
                  >
                    <span className="text-lg sm:text-xl">😊</span>
                  </button>
                  {showEmojiPicker && (
                    <div 
                      ref={emojiPickerRef}
                      className="absolute bottom-12 right-0 z-10 max-w-[calc(100vw-2rem)] sm:max-w-none"
                    >
                      <Picker 
                        data={data} 
                        onEmojiSelect={handleEmojiSelect}
                        theme="dark"
                        previewPosition="none"
                      />
                    </div>
                  )}
                </div>
                {/* Input para archivos multimedia */}
                <label className="flex items-center cursor-pointer bg-white/10 hover:bg-white/20 rounded-lg px-2 sm:px-2 py-2 border border-white/30 touch-manipulation flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    className="hidden"
                    onChange={handleMediaChange}
                    multiple
                    disabled={!socket || loading}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!socket || (!newMessage.trim() && mediaFiles.length === 0) || loading}
                  className="bg-white hover:bg-gray-200 text-black px-3 sm:px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base touch-manipulation whitespace-nowrap flex-shrink-0"
                >
                  <span className="hidden sm:inline">Enviar</span>
                  <span className="sm:hidden">✓</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Modal de reacciones */}
      {showReactionsModal && (
        <ReactionsModal
          isOpen={!!showReactionsModal}
          onClose={() => setShowReactionsModal(null)}
          reactions={(messages.find(msg => msg._id === showReactionsModal)?.reactions || [])}
          getImageUrl={(avatar) => {
            if (!avatar) return '/default-avatar.png';
            if (avatar.startsWith('http')) return avatar;
            return `http://localhost:3000${avatar}`;
          }}
          messageId={showReactionsModal}
          onRemoveReaction={handleRemoveReaction}
        />
      )}

      {/* Modal de imagen en pantalla completa */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={() => setFullScreenImage(null)}>
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full touch-manipulation"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 sm:h-8 sm:w-8" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
          <img
            src={fullScreenImage}
            alt="Imagen en pantalla completa"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default GroupChat;