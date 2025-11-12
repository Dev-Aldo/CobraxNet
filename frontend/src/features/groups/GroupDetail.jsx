import React, { useState, useEffect, useRef } from 'react';
import MultiMediaUpload from '../posts/MultiMediaUpload';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import UsersSidebar from '../../shared/components/UsersSidebar';
import RightSidebar from '../../shared/components/RightSidebar';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ReactionsModal from '../posts/ReactionsModal';
import { useToxicityCheck } from '../../shared/hooks/useToxicityCheck';
import { useNSFWCheck } from '../../shared/hooks/useNSFWCheck';

const GroupDetail = () => {
  // Estado para la barra de búsqueda
  const [search, setSearch] = useState("");
  // Estado para el usuario actual (debe ir antes de usarlo en filteredPosts)
  const [currentUserId, setCurrentUserId] = useState("");
  const { groupId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const fileInputRef = useRef(null);

  // Estados para el grupo y sus publicaciones
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  // Filtrar publicaciones por título, contenido o nombre de usuario
  const filteredPosts = posts.filter(post => {
    const searchLower = search.toLowerCase();
    const titleMatch = post.title?.toLowerCase().includes(searchLower);
    const contentMatch = post.content?.toLowerCase().includes(searchLower);
    const authorMatch = post.author?.username?.toLowerCase().includes(searchLower);
    // Si el usuario busca su propio nombre, mostrar sus posts
    const isMine = currentUserId && (post.author?._id === currentUserId || post.author === currentUserId);
    // Si el texto buscado coincide con el username del autor o es el propio usuario
    return titleMatch || contentMatch || authorMatch || (isMine && searchLower && post.author?.username?.toLowerCase().includes(searchLower));
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: '' });

  // Hooks para verificación de contenido
  const { checkText } = useToxicityCheck();
  const { checkImage } = useNSFWCheck();
  
  // Estados para la creación de publicaciones
  const [newPost, setNewPost] = useState({ title: '', content: '', file: null });
  const [mediaFiles, setMediaFiles] = useState([]); // Para archivos multimedia (imágenes, videos, docs)
  
  // Función para mostrar notificación
  const mostrarNotificacion = (mensaje, tipo = 'error') => {
    setNotificacion({ show: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: '' }), 5000);
  };

  // Componente de notificación
  const Notificacion = () => {
    if (!notificacion.show) return null;

    return (
      <div className="fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-2 sm:px-4">
        <div className={`${notificacion.tipo === 'error' ? 'bg-red-500/20 border-red-500/50' : 'bg-green-500/20 border-green-500/50'} border text-white p-3 sm:p-4 rounded-lg flex items-start gap-2 sm:gap-3 backdrop-blur-sm shadow-lg`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm sm:text-base">{notificacion.mensaje}</span>
        </div>
      </div>
    );
  };
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [postingInProgress, setPostingInProgress] = useState(false);
  
  // Estados para la edición del grupo
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', isPublic: true, avatar: null });

  // Estados para publicaciones (igual que Home.jsx)
  const [showPicker, setShowPicker] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostForm, setEditPostForm] = useState({ title: '', content: '', file: null });
  const [editMediaFiles, setEditMediaFiles] = useState([]); // nuevos archivos
  const [editExistingMedia, setEditExistingMedia] = useState([]); // archivos actuales (media)
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [openComments, setOpenComments] = useState({});
  // Estado para la imagen de comentario por post
  const [commentImages, setCommentImages] = useState({});
  const [showReactionsModal, setShowReactionsModal] = useState(null);
  const [showCreatePostForm, setShowCreatePostForm] = useState(false);
  // Estado para el índice del carrusel de cada post
  const [carouselIndexes, setCarouselIndexes] = useState({});
  const [openPostMenu, setOpenPostMenu] = useState(null);
  const postMenuRefs = useRef({});
  // Reaccionar a un post
  const handleReact = async (postId, emoji) => {
    const post = posts.find(p => p._id === postId);
    const yaReacciono = post?.reactions?.some(
      r => (r.user?._id || r.user) === currentUserId && r.emoji === emoji
    );
    try {
      if (yaReacciono) {
        await axios.delete(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts/${postId}/reaction`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { emoji }
        });
      } else {
        await axios.post(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts/${postId}/reaction`, { emoji }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchGroupPosts();
    } catch (err) {
      setError('Error al reaccionar');
    }
  };

  // Editar post
  const handleEditPost = async (e, postId) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', editPostForm.title);
      formData.append('content', editPostForm.content);
      // Adjuntar nuevos archivos
      editMediaFiles.forEach(file => formData.append('media', file));
      // Adjuntar los archivos existentes que no se eliminaron
      formData.append('existingMedia', JSON.stringify(editExistingMedia));
      await axios.put(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts/${postId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingPostId(null);
      setEditPostForm({ title: '', content: '', file: null });
      setEditMediaFiles([]);
      setEditExistingMedia([]);
      fetchGroupPosts();
    } catch (err) {
      setError('Error al editar la publicación');
    }
  };

  // Eliminar post
  const handleDeletePost = async (postId) => {
    const post = posts.find(p => p._id === postId);
    const isAuthor = currentUserId && post.author && (post.author._id === currentUserId || post.author === currentUserId);
    
    let confirmMessage = '¿Seguro que quieres eliminar este post?';
    if (!isAuthor && isAdmin()) {
      confirmMessage = '¿Estás seguro de que quieres eliminar esta publicación como administrador? Esta acción no se puede deshacer.';
    }
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await axios.delete(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroupPosts();
    } catch (err) {
      setError('Error al eliminar la publicación');
    }
  };

  // Editar comentario
  const handleEditComment = async (postId, commentId) => {
    try {
      await axios.put(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts/${postId}/comment/${commentId}`,
        { content: editCommentContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingCommentId(null);
      setEditCommentContent('');
      fetchGroupPosts();
    } catch (err) {
      setError('Error al editar el comentario');
    }
  };

  // Eliminar comentario
  const handleDeleteComment = async (postId, commentId) => {
    const post = posts.find(p => p._id === postId);
    const comment = post?.comments?.find(c => c._id === commentId);
    const isCommentAuthor = currentUserId && comment && (comment.user?._id === currentUserId || comment.user === currentUserId);
    
    let confirmMessage = '¿Seguro que quieres eliminar este comentario?';
    if (!isCommentAuthor && isAdmin()) {
      confirmMessage = '¿Estás seguro de que quieres eliminar este comentario como administrador? Esta acción no se puede deshacer.';
    }
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await axios.delete(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts/${postId}/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroupPosts();
    } catch (err) {
      setError('Error al eliminar el comentario');
    }
  };

  // Agregar comentario
  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const content = e.target.elements[`comment-${postId}`].value;
    const image = commentImages[postId] || null;
    if (!content && !image) return;
    try {
      // Verificar contenido del comentario
      const result = await checkText(content);
      if (result.isToxic) {
        mostrarNotificacion('El contenido del comentario parece ser inapropiado', 'error');
        return;
      }

      // Verificar imagen si existe
      if (image) {
        const result = await checkImage(image);
        if (result.isNSFW) {
          mostrarNotificacion('La imagen parece ser inapropiada', 'error');
          return;
        }
      }

      const formData = new FormData();
      formData.append('content', content);
      if (image) formData.append('image', image);
      await axios.post(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts/${postId}/comment`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroupPosts();
      e.target.reset();
      setCommentImages((prev) => ({ ...prev, [postId]: null }));
      // Mostrar notificación de éxito
      mostrarNotificacion('Comentario agregado exitosamente', 'success');
    } catch (err) {
      setError('Error al comentar');
      // Mostrar notificación de error
      mostrarNotificacion('Error al agregar el comentario', 'error');
    }
  };
  
  // Estados para la gestión de miembros
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };
  
  // Obtener información del usuario actual
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
      } catch (error) {
        console.error('Error al decodificar el token:', error);
      }
    }
  }, [token]);
  
  // Obtener detalles del grupo
  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroup(response.data.data);
      
      // Inicializar el formulario de edición con los datos actuales
      setEditForm({
        name: response.data.data.name,
        description: response.data.data.description,
        isPublic: response.data.data.isPublic,
        avatar: null
      });
      
      setLoading(false);
    } catch (err) {
      setError('Error al cargar los detalles del grupo');
      setLoading(false);
    }
  };
  
  // Obtener publicaciones del grupo
  const fetchGroupPosts = async () => {
    try {
      const response = await axios.get(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data.data);
    } catch (err) {
      console.error('Error al cargar las publicaciones del grupo:', err);
    }
  };
  
  useEffect(() => {
    fetchGroupDetails();
    fetchGroupPosts();
  }, [groupId]);

  // Cerrar menú de post al hacer click fuera o presionar Escape
  useEffect(() => {
    if (!openPostMenu) return;
    const handleClick = (e) => {
      const clickedElement = e.target;
      const menuButton = postMenuRefs.current[openPostMenu];
      if (menuButton && !menuButton.contains(clickedElement)) {
        const menuElement = menuButton.nextElementSibling;
        if (menuElement && !menuElement.contains(clickedElement)) {
          setOpenPostMenu(null);
        }
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpenPostMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openPostMenu]);
  
  // Verificar si el usuario es miembro del grupo
  const isMember = () => {
    if (!group || !group.members || !currentUserId) return false;
    return group.members.some(member => (member.user._id || member.user) === currentUserId);
  };
  
  // Verificar si el usuario es administrador del grupo
  const isAdmin = () => {
    if (!group || !group.members || !currentUserId) return false;
    const member = group.members.find(member => (member.user._id || member.user) === currentUserId);
    return member && member.role === 'admin';
  };
  
  // Verificar si el usuario es el creador del grupo
  const isCreator = () => {
    if (!group || !currentUserId) return false;
    return group.creator === currentUserId;
  };
  
  // Unirse al grupo
  const handleJoinGroup = async () => {
    try {
      await axios.post(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroupDetails();
    } catch (err) {
      setError('Error al unirse al grupo');
    }
  };
  
  // Abandonar el grupo
  const handleLeaveGroup = async () => {
    try {
      await axios.delete(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroupDetails();
    } catch (err) {
      setError('Error al abandonar el grupo. Si el grupo ya fue eliminado, por favor recarga la página.');
    }
  };
  
  // Cambiar rol de miembro
  const handleChangeRole = async (memberId, newRole) => {
    try {
      await axios.put(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/members/${memberId}/role`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchGroupDetails();
    } catch (err) {
      setError(`Error al cambiar el rol del miembro`);
    }
  };
  
  // Eliminar miembro
  const handleRemoveMember = async (memberId) => {
    try {
      await axios.delete(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroupDetails();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Error al eliminar al miembro');
      }
    }
  };
  
  // Manejar cambios en el formulario de edición
  const handleEditChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === 'avatar' && files.length > 0) {
      setEditForm({ ...editForm, avatar: files[0] });
    } else if (type === 'checkbox') {
      setEditForm({ ...editForm, [name]: checked });
    } else {
      setEditForm({ ...editForm, [name]: value });
    }
  };
  
  // Actualizar grupo
  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('description', editForm.description);
      formData.append('isPublic', editForm.isPublic);
      if (editForm.avatar) {
        formData.append('avatar', editForm.avatar);
      }
      
  await axios.put(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setIsEditing(false);
      fetchGroupDetails();
    } catch (err) {
      setError('Error al actualizar el grupo');
    }
  };
  
  // Eliminar grupo
  const handleDeleteGroup = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.')) {
      try {
        await axios.delete(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/groups');
      } catch (err) {
        setError('Error al eliminar el grupo');
      }
    }
  };
  
  // Manejar cambios en el formulario de nueva publicación
  const handlePostChange = (e) => {
    const { name, value } = e.target;
    setNewPost({ ...newPost, [name]: value });
  };
  
  // Agregar emoji al contenido de la publicación
  const addEmoji = (e) => {
    const sym = e.unified.split('-');
    const codesArray = [];
    sym.forEach(el => codesArray.push('0x' + el));
    const emoji = String.fromCodePoint(...codesArray);
    setNewPost({ ...newPost, content: newPost.content + emoji });
  };
  
  // Crear nueva publicación
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      setError('El título y el contenido son obligatorios');
      return;
    }
    try {
      // Verificar contenido de texto
      const textToCheck = newPost.title + ' ' + newPost.content;
      const result = await checkText(textToCheck);
      if (result.isToxic) {
        mostrarNotificacion('El contenido del texto parece ser inapropiado', 'error');
        return;
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

      setPostingInProgress(true);
      const formData = new FormData();
      formData.append('title', newPost.title);
      formData.append('content', newPost.content);
      mediaFiles.forEach((file) => {
        formData.append('media', file);
      });
      await axios.post(`https://cobraxnet.onrender.com/api/v1/groups/${groupId}/posts`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setNewPost({ title: '', content: '', file: null });
      setMediaFiles([]);
      fetchGroupPosts();
      setPostingInProgress(false);
      // Mostrar notificación de éxito
      mostrarNotificacion('Publicación creada exitosamente', 'success');
    } catch (err) {
      setError('Error al crear la publicación');
      setPostingInProgress(false);
      // Mostrar notificación de error
      mostrarNotificacion('Error al crear la publicación', 'error');
    }
  };
  
  // Obtener URL de imagen
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://cobraxnet.onrender.com${url}`;
  };
  
  // Formatear fecha
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }
  
  if (!group) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black text-white px-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-center">Grupo no encontrado</h2>
        <p className="mb-4 sm:mb-6 text-sm sm:text-base text-center">El grupo que buscas no existe o no tienes permisos para verlo.</p>
        <Link to="/groups" className="px-4 sm:px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition text-sm sm:text-base touch-manipulation">
          Volver a Grupos
        </Link>
      </div>
    );
  }
  
  return (
    <>
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

      {/* Panel lateral de usuarios */}
      <UsersSidebar />

      {/* Sidebar derecho */}
      <RightSidebar onLogout={handleLogout} />
      
      {/* Nav superior */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1.0],
          opacity: { duration: 0.2 },
          y: { 
            type: "spring",
            damping: 20,
            stiffness: 300
          }
        }}
        className="fixed top-0 left-0 w-full z-20 bg-black/80 backdrop-blur-md border-b border-white/10"
        layout
        layoutRoot>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between relative">
          <Link to="/">
            <img src="/logo.png" alt="Logo" className="h-10 sm:h-12 md:h-14 lg:h-16" />
          </Link>
          {/* Barra de búsqueda */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 sm:w-40 md:w-64 lg:w-80">
            <input
              type="text"
              placeholder="Buscar publicaciones..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/20 focus:border-white/40 focus:outline-none text-sm sm:text-base"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
            {/* Botón para abandonar grupo y crear publicación (orden intercambiado) */}
            {isMember() ? (
              <button
                onClick={handleLeaveGroup}
                className="hidden lg:block px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-red-500/20 hover:bg-red-500/40 text-white rounded-lg transition text-xs sm:text-sm md:text-base touch-manipulation"
              >
                <span className="hidden md:inline">Abandonar Grupo</span>
                <span className="md:hidden">Salir</span>
              </button>
            ) : (
              <button
                onClick={handleJoinGroup}
                className="px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition text-xs sm:text-sm md:text-base touch-manipulation whitespace-nowrap"
              >
                <span className="hidden sm:inline">Unirse al Grupo</span>
                <span className="sm:hidden">Unirse</span>
              </button>
            )}
            {isMember() && (
              <button
                onClick={() => setShowCreatePostForm(v => !v)}
                className="hidden lg:flex px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition items-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base touch-manipulation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden md:inline">{showCreatePostForm ? 'Cerrar' : 'Crear publicación'}</span>
                <span className="md:hidden">Crear</span>
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Fondo animado negro con estrellas */}
      <div className="fixed inset-0 -z-10 bg-black overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative min-h-screen flex flex-col items-center justify-start pt-20 sm:pt-24 pb-12 sm:pb-24 z-10 mx-2 sm:mx-4 md:mx-6 lg:ml-72 lg:mr-72">
        <div className="w-full max-w-4xl mx-auto">
          {/* Cabecera del grupo */}
          <div className="relative mb-4 sm:mb-8 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl sm:rounded-2xl overflow-hidden border border-white/20">
            {group.avatar && (
              <div className="absolute inset-0 opacity-30">
                <img 
                  src={getImageUrl(group.avatar)} 
                  alt={group.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="relative z-10 p-4 sm:p-6 md:p-8 backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 min-w-0 flex-1">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 flex-shrink-0 border-2 border-white/30">
                    {group.avatar ? (
                      <img 
                        src={getImageUrl(group.avatar)} 
                        alt={group.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xl sm:text-2xl md:text-3xl font-bold">
                        {group.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 truncate">{group.name}</h1>
                    <p className="text-sm sm:text-base text-white/70 break-words">{group.description}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                      <span className="text-white/60 text-xs sm:text-sm whitespace-nowrap">
                        {group.members?.length || 0} miembros
                      </span>
                      <span className="text-white/60 text-xs sm:text-sm whitespace-nowrap hidden sm:inline">
                        Creado el {formatDate(group.createdAt)}
                      </span>
                      <span className="text-white/60 text-xs sm:text-sm whitespace-nowrap sm:hidden">
                        {formatDate(group.createdAt)}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[10px] sm:text-xs bg-white/10 text-white whitespace-nowrap">
                        {group.isPublic ? 'Público' : 'Privado'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowMembersModal(true)}
                    className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation flex-1 sm:flex-initial justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="hidden sm:inline">Miembros</span>
                    <span className="sm:hidden">Miembros</span>
                  </button>
                  {isMember() && (
                    <Link
                      to={`/group-chat/${groupId}`}
                      className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-200 text-black rounded-lg transition flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation flex-1 sm:flex-initial justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="hidden sm:inline">Chat</span>
                      <span className="sm:hidden">Chat</span>
                    </Link>
                  )}
                  {isAdmin() && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation flex-1 sm:flex-initial justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="hidden sm:inline">Editar</span>
                      <span className="sm:hidden">Editar</span>
                    </button>
                  )}
                  {isCreator() && (
                    <button
                      onClick={handleDeleteGroup}
                      className="px-3 sm:px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-white rounded-lg transition flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation flex-1 sm:flex-initial justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden sm:inline">Eliminar</span>
                      <span className="sm:hidden">Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-white p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 flex items-start justify-between gap-2">
              <span className="text-sm sm:text-base break-words flex-1">{error}</span>
              <button 
                onClick={() => setError('')} 
                className="text-white/80 hover:text-white flex-shrink-0 p-1 touch-manipulation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Formulario para crear publicación (solo para miembros) */}
          {isMember() && showCreatePostForm && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="mb-4 sm:mb-8 bg-black rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl w-full relative border border-white/30 backdrop-blur-lg"
            >
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-base sm:text-lg md:text-xl">Crear Publicación</span>
              </h2>
              
              <form onSubmit={handleCreatePost} className="flex flex-col gap-3 sm:gap-4">
                <input
                  type="text"
                  name="title"
                  placeholder="Título de la publicación"
                  value={newPost.title}
                  onChange={handlePostChange}
                  required
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all text-sm sm:text-base
                    hover:border-white/40 focus:border-white
                    hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                    focus:outline-none placeholder:text-white/40"
                />
                
                <div className="relative">
                  <textarea
                    name="content"
                    placeholder="¿Qué quieres compartir con el grupo?"
                    value={newPost.content}
                    onChange={handlePostChange}
                    required
                    rows="4"
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all text-sm sm:text-base
                      hover:border-white/40 focus:border-white
                      hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                      focus:outline-none placeholder:text-white/40 w-full resize-y"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-white/60 hover:text-white transition-colors p-1 touch-manipulation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute right-0 bottom-12 z-10 max-w-[calc(100vw-2rem)] sm:max-w-none">
                      <Picker 
                        data={data} 
                        onEmojiSelect={addEmoji} 
                        theme="dark"
                        previewPosition="none"
                      />
                    </div>
                  )}
                </div>
                
                {/* Archivos multimedia (imágenes, videos, docs) */}
                <MultiMediaUpload files={mediaFiles} setFiles={setMediaFiles} />
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={postingInProgress}
                    className={`px-4 sm:px-6 py-2 bg-white text-black rounded-lg font-semibold transition flex items-center gap-2 text-sm sm:text-base touch-manipulation
                      ${postingInProgress ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                  >
                    {postingInProgress ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                        <span className="hidden sm:inline">Publicando...</span>
                        <span className="sm:hidden">Publicando...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span className="hidden sm:inline">Publicar</span>
                        <span className="sm:hidden">Publicar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Listado de publicaciones igual a Home.jsx */}
          <div className="flex flex-col gap-10">
            <h2 className="text-2xl font-bold text-white mb-4">Publicaciones</h2>
            {filteredPosts.length === 0 && !loading ? (
              <div className="text-center py-8 sm:py-12 text-white/60 bg-white/5 rounded-xl border border-white/10 px-4">
                {isMember() ? (
                  <p className="text-sm sm:text-base">No hay publicaciones en este grupo. ¡Sé el primero en publicar algo!</p>
                ) : (
                  <p className="text-sm sm:text-base">No hay publicaciones en este grupo o debes unirte para verlas.</p>
                )}
              </div>
            ) : (
              filteredPosts.map((post) => {
                const grouped = {};
                (post.reactions || []).forEach(r => {
                  if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [] };
                  grouped[r.emoji].count++;
                  grouped[r.emoji].users.push(r.user || { username: 'Usuario' });
                });
                const isAuthor = currentUserId && post.author && (post.author._id === currentUserId || post.author === currentUserId);
                return (
                  <div
                    key={post._id}
                    className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden hover:scale-[1.01] transition-transform duration-200 max-w-4xl w-full mx-auto"
                  >
                    {/* Header: usuario, avatar y fecha */}
                    <div className="flex items-center justify-between px-8 pt-6 pb-3">
                      <Link
                        to={currentUserId && (post.author?._id === currentUserId || post.author === currentUserId)
                          ? '/profile'
                          : `/profile/${post.author?._id || post.author}`}
                        className="flex items-center gap-3 group"
                      >
                        {post.author?.avatar && post.author.avatar !== '/uploads/default-avatar.png' ? (
                          <img
                            src={getImageUrl(post.author.avatar)}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full object-cover border-2 border-white group-hover:ring-2 group-hover:ring-indigo-400 transition"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xl border-2 border-white group-hover:ring-2 group-hover:ring-indigo-400 transition">
                            {post.author?.username?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white text-lg group-hover:text-indigo-300 transition">{post.author?.username || 'Usuario eliminado'}</div>
                          <div className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</div>
                        </div>
                      </Link>
                      
                      <div className="flex items-center gap-2">
                        {/* Indicador de permisos de administrador */}
                        {isAdmin() && !isAuthor && (
                          <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full border border-purple-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Admin
                          </span>
                        )}
                        {/* Menú de 3 puntos solo en móviles y solo para el autor o admin */}
                        {(isAuthor || isAdmin()) && (
                          <div className="relative md:hidden">
                            <button
                              onClick={() => setOpenPostMenu(openPostMenu === post._id ? null : post._id)}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                              aria-label="Opciones del post"
                              ref={el => postMenuRefs.current[post._id] = el}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 21a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                              </svg>
                            </button>
                            {openPostMenu === post._id && (
                              <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-2 w-40 bg-black/90 border border-white/10 rounded-xl shadow-xl overflow-hidden z-30"
                              >
                                {isAuthor && (
                                  <button
                                    className="w-full text-left px-4 py-3 text-white/90 hover:bg-white/10 flex items-center gap-2"
                                    onClick={() => {
                                      setEditingPostId(post._id);
                                      setEditPostForm({ title: post.title, content: post.content, file: null });
                                      setEditMediaFiles([]);
                                      setEditExistingMedia(Array.isArray(post.media) ? post.media.map(m => ({
                                        ...m,
                                        url: m.url || m.path || m.fileUrl
                                      })) : []);
                                      setOpenPostMenu(null);
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Editar
                                  </button>
                                )}
                                <button
                                  className="w-full text-left px-4 py-3 text-white/90 hover:bg-white/10 flex items-center gap-2 text-red-400"
                                  onClick={async () => {
                                    const confirmMessage = isAuthor 
                                      ? '¿Seguro que quieres eliminar este post?'
                                      : '¿Estás seguro de que quieres eliminar esta publicación como administrador? Esta acción no se puede deshacer.';
                                    if (!window.confirm(confirmMessage)) {
                                      setOpenPostMenu(null);
                                      return;
                                    }
                                    await handleDeletePost(post._id);
                                    setOpenPostMenu(null);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  {isAuthor ? 'Eliminar' : 'Eliminar como Admin'}
                                </button>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Contenido y acciones */}
                    <div className="flex-1 flex flex-col px-8 py-5">
                      {editingPostId === post._id ? (
                        <form
                          onSubmit={e => handleEditPost(e, post._id)}
                          className="flex flex-col gap-6"
                        >
                          <div className="flex flex-col gap-2">
                            <label className="block text-white font-semibold flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Título
                            </label>
                            <input
                              type="text"
                              name="title"
                              placeholder="Escribe un título para tu publicación"
                              value={editPostForm.title}
                              onChange={e => setEditPostForm({ ...editPostForm, title: e.target.value })}
                              className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all hover:border-white/40 focus:border-white hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] focus:outline-none placeholder:text-white/40"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="block text-white font-semibold flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                              </svg>
                              Contenido
                            </label>
                            <textarea
                              name="content"
                              placeholder="¿Qué estás pensando?"
                              value={editPostForm.content}
                              onChange={e => setEditPostForm({ ...editPostForm, content: e.target.value })}
                              required
                              rows="4"
                              className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all hover:border-white/40 focus:border-white hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] focus:outline-none placeholder:text-white/40"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            {/* Archivos existentes */}
                            <div className="flex flex-wrap gap-3 mt-2">
                              {editExistingMedia.map((file, idx) => (
                                <div key={idx} className="relative group">
                                  {file.type === 'image' ? (
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="w-24 h-24 object-cover rounded-lg border border-white/20 shadow"
                                    />
                                  ) : file.type === 'video' ? (
                                    <video
                                      src={file.url}
                                      controls
                                      className="w-24 h-24 object-cover rounded-lg border border-white/20 shadow"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center w-24 h-24 bg-white/10 rounded-lg border border-white/20 shadow text-xs text-white">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6c-1.1 0-2 .9-2 2zm7 1.5V9h5.5L13 5.5z" /></svg>
                                      {file.name}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 text-xs opacity-80 group-hover:opacity-100"
                                    onClick={() => setEditExistingMedia(files => files.filter((_, i) => i !== idx))}
                                    title="Quitar archivo"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                            {/* Nuevos archivos */}
                            <MultiMediaUpload files={editMediaFiles} setFiles={setEditMediaFiles} />
                          </div>
                          <div className="flex gap-3 mt-2">
                            <button type="submit" className="py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-transparent hover:border-black/20 flex-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Guardar
                            </button>
                            <button type="button" onClick={() => setEditingPostId(null)} className="py-3 bg-black/50 text-white rounded-lg font-semibold hover:bg-black/70 transition-all duration-300 flex items-center justify-center gap-2 border border-white/30 hover:border-white/50 flex-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancelar
                            </button>
                          </div>
                          {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-white p-4 rounded-lg flex items-start gap-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{error}</span>
                            </div>
                          )}
                        </form>
                      ) : (
                        <>
                          <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                          <p className="text-white/90 mb-4 text-lg post-content">{post.content}</p>
                          {/* Mostrar media: carrusel de imágenes/videos y caja de descarga para otros archivos */}
                          {Array.isArray(post.media) && post.media.length > 0 && (
                            <div className="w-full flex flex-col items-center mt-2 mb-4">
                              {/* Carrusel solo para imágenes y videos */}
                              {(() => {
                                const safeMedia = Array.isArray(post.media) ? post.media : [];
                                const mediaItems = safeMedia.filter(m => m.type === 'image' || m.type === 'video');
                                const otherFiles = safeMedia.filter(m => m.type === 'file');
                                const idx = carouselIndexes?.[post._id] || 0;
                                return <>
                                  {mediaItems.length > 0 && (
                                    <div className="relative w-full flex flex-col items-center">
                                      {mediaItems[idx].type === 'image' ? (
                                        <img
                                          src={getImageUrl(mediaItems[idx].url)}
                                          alt={mediaItems[idx].name}
                                          className="w-full max-h-[500px] object-cover bg-black/30 rounded-lg"
                                        />
                                      ) : (
                                        <video
                                          src={getImageUrl(mediaItems[idx].url)}
                                          controls
                                          className="w-full max-h-[500px] bg-black/30 rounded-lg"
                                        >
                                          Tu navegador no soporta la reproducción de video.
                                        </video>
                                      )}
                                      {mediaItems.length > 1 && (
                                        <>
                                          <button
                                            type="button"
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 z-10"
                                            onClick={() => setCarouselIndexes(idxObj => ({
                                              ...idxObj,
                                              [post._id]: (idx - 1 + mediaItems.length) % mediaItems.length
                                            }))}
                                            aria-label="Anterior"
                                          >&#8592;</button>
                                          <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 z-10"
                                            onClick={() => setCarouselIndexes(idxObj => ({
                                              ...idxObj,
                                              [post._id]: (idx + 1) % mediaItems.length
                                            }))}
                                            aria-label="Siguiente"
                                          >&#8594;</button>
                                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                            {mediaItems.map((_, i) => (
                                              <span
                                                key={i}
                                                className={`inline-block w-2 h-2 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`}
                                              />
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  {/* Archivos adjuntos (no imagen/video) */}
                                  {otherFiles.length > 0 && (
                                    <div className="flex flex-col gap-2 w-full mt-4">
                                      {otherFiles.map((file, i) => (
                                        <div key={i} className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-lg p-4">
                                          <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6c-1.1 0-2 .9-2 2zm7 1.5V9h5.5L13 5.5z" />
                                            </svg>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-white font-semibold truncate">{file.name}</div>
                                            <div className="text-xs text-white/60">Archivo adjunto</div>
                                          </div>
                                          <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download={file.name}
                                            className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/40 text-white rounded-lg font-semibold text-sm transition-all"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                                            </svg>
                                            Descargar
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>;
                              })()}
                            </div>
                          )}
                        </>
                      )}
                      {/* --- Acciones del post (responsive) - Solo mostrar cuando NO está en modo edición --- */}
                      {editingPostId !== post._id && (
                        <div className="grid grid-cols-3 gap-2 mt-4 sm:flex sm:flex-wrap sm:items-center">
                          <button
                            type="button"
                            className="w-full sm:w-auto px-3 sm:px-4 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 border border-transparent hover:border-black/20"
                            onClick={() => setShowReactionsModal(post._id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.9 9A5 5 0 0 0 13 5H9.27a7 7 0 0 1 .66 12h3a8 8 0 0 0 7.61-5.96A5 5 0 0 0 14.9 9Z"/>
                              <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>
                            </svg>
                            <span className="hidden xs:inline sm:inline">Reacciones</span>
                            {Object.keys(grouped).length > 0 && (
                              <span className="bg-black/20 px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                                {Object.values(grouped).reduce((acc, curr) => acc + curr.count, 0)}
                              </span>
                            )}
                          </button>
                          {token && (
                            <button
                              type="button"
                              className="w-full sm:w-auto px-1.5 sm:px-2 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition border border-transparent hover:border-black/20 text-base sm:text-lg font-semibold"
                              onClick={() => setShowPicker(showPicker === post._id ? null : post._id)}
                              title="Agregar reacción"
                            >
                              +
                            </button>
                          )}
                          {showPicker === post._id && (
                            <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-50 sm:absolute sm:left-auto sm:translate-x-0 sm:bottom-auto sm:mt-2">
                            <Picker
                              data={data}
                              onEmojiSelect={emoji => {
                                setShowPicker(null);
                                handleReact(post._id, emoji.native);
                              }}
                              theme="dark"
                            />
                          </div>
                        )}
                          <button
                            type="button"
                            className="w-full sm:w-auto px-3 sm:px-4 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-xs sm:text-sm border border-transparent hover:border-black/20"
                            onClick={() =>
                              setOpenComments((prev) => ({
                                ...prev,
                                [post._id]: !prev[post._id],
                              }))
                            }
                          >
                            Comentar
                          </button>
                        {/* Acciones del autor/admin - Solo visible en desktop */}
                        {(isAuthor || isAdmin()) && (
                          <>
                            {isAuthor && (
                              <button
                                onClick={() => {
                                  setEditingPostId(post._id);
                                  setEditPostForm({ title: post.title, content: post.content, file: null });
                                  setEditMediaFiles([]);
                                  setEditExistingMedia(Array.isArray(post.media) ? post.media.map(m => ({
                                    ...m,
                                    url: m.url || m.path || m.fileUrl // compatibilidad
                                  })) : []);
                                }}
                                className="hidden md:flex w-full sm:w-auto px-3 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-sm border border-transparent hover:border-black/20 items-center justify-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editar
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className={`hidden md:flex w-full sm:w-auto px-3 py-1 rounded-full transition text-sm border border-transparent items-center justify-center gap-1 ${
                                isAuthor 
                                  ? 'bg-white text-black hover:bg-gray-200 hover:border-black/20' 
                                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/40 border-red-500/30'
                              }`}
                              title={isAuthor ? 'Eliminar mi publicación' : 'Eliminar publicación como administrador'}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {isAuthor ? 'Eliminar' : 'Eliminar como Admin'}
                            </button>
                          </>
                        )}
                        </div>
                      )}
                      {/* Comentarios */}
                      {openComments[post._id] && (
                        <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 mt-3 border border-white/20 shadow-lg transition-all duration-300 ease-in-out">
                          <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                            Comentarios
                          </h3>
                          <div className="mb-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {post.comments && post.comments.length > 0 ? (
                              <ul className="space-y-2">
                                {(post.comments || []).map((comment) => {
                                  const isCommentAuthor = currentUserId && (comment.user?._id === currentUserId || comment.user === currentUserId);
                                  const isEditing = editingCommentId === comment._id;
                                  return (
                                    <li key={comment._id} className="bg-white/5 hover:bg-white/10 transition-all duration-200 rounded-lg p-2 shadow-sm">
                                      <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0">
                                          {comment.user?.avatar && comment.user.avatar !== '/uploads/default-avatar.png' ? (
                                            <img
                                              src={getImageUrl(comment.user.avatar)}
                                              alt="Avatar"
                                              className="w-8 h-8 rounded-full object-cover border-2 border-white/50 shadow-md"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-sm border-2 border-white/50 shadow-md">
                                              {comment.user?.username?.[0]?.toUpperCase() || "U"}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-white">{comment.user?.username || 'Usuario'}</span>
                                            <span className="text-xs text-gray-400">
                                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {/* Indicador de permisos de administrador para comentarios */}
                                            {isAdmin() && !isCommentAuthor && (
                                              <span className="text-xs bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded-full border border-purple-500/30">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                Admin
                                              </span>
                                            )}
                                          </div>
                                          {isEditing ? (
                                            <div className="flex flex-col gap-2">
                                              <input
                                                type="text"
                                                value={editCommentContent}
                                                onChange={e => setEditCommentContent(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20"
                                              />
                                              <div className="flex justify-end gap-2 mt-1">
                                                <button
                                                  onClick={() => handleEditComment(post._id, comment._id)}
                                                  className="bg-white text-black px-3 py-1 rounded-lg hover:bg-gray-200 transition shadow-md text-xs font-medium border border-transparent hover:border-black/20"
                                                >
                                                  Guardar
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingCommentId(null);
                                                    setEditCommentContent('');
                                                  }}
                                                  className="bg-white text-black px-3 py-1 rounded-lg hover:bg-gray-200 transition shadow-md text-xs font-medium border border-transparent hover:border-black/20"
                                                >
                                                  Cancelar
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <p className="text-sm text-white/90 comment-content" style={{ maxWidth: '100%', width: '100%', wordBreak: 'break-all' }}>{comment.content}</p>
                                              {/* Mostrar imagen del comentario si existe */}
                                              {(comment.imageUrl || comment.fileUrl) && (
                                                <img
                                                  src={getImageUrl(comment.imageUrl || comment.fileUrl)}
                                                  alt="Imagen del comentario"
                                                  className="max-h-40 rounded-lg mt-2 border border-white/20 w-full object-contain"
                                                  onError={(e) => {
                                                    console.error('Error al cargar imagen del comentario:', comment.imageUrl || comment.fileUrl);
                                                    e.target.style.display = 'none';
                                                  }}
                                                />
                                              )}
                                              {(isCommentAuthor || isAdmin()) && (
                                                <div className="flex justify-end gap-2 mt-1">
                                                  {isCommentAuthor && (
                                                    <button
                                                      onClick={() => {
                                                        setEditingCommentId(comment._id);
                                                        setEditCommentContent(comment.content);
                                                      }}
                                                      className="bg-white text-black px-2 py-1 rounded hover:bg-gray-200 transition text-xs flex items-center gap-1 font-medium border border-transparent hover:border-black/20"
                                                    >
                                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                      </svg>
                                                      Editar
                                                    </button>
                                                  )}
                                                  <button
                                                    onClick={() => handleDeleteComment(post._id, comment._id)}
                                                    className={`px-2 py-1 rounded hover:bg-gray-200 transition text-xs flex items-center gap-1 font-medium border border-transparent ${
                                                      isCommentAuthor 
                                                        ? 'bg-white text-black hover:border-black/20' 
                                                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/40 border-red-500/30'
                                                    }`}
                                                    title={isCommentAuthor ? 'Eliminar mi comentario' : 'Eliminar comentario como administrador'}
                                                  >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    {isCommentAuthor ? 'Eliminar' : 'Eliminar como Admin'}
                                                  </button>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-center text-white/50 italic text-sm py-2">No hay comentarios aún. ¡Sé el primero en comentar!</p>
                            )}
                          </div>
                          {token && (
                            <form
                              onSubmit={e => handleAddComment(e, post._id)}
                              className="flex items-center gap-2 mt-2"
                            >
                              <div className="flex w-full items-center gap-2 relative">
                                <input
                                  name={`comment-${post._id}`}
                                  type="text"
                                  placeholder="Escribe un comentario..."
                                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/10 transition-all duration-300"
                                  required={!commentImages[post._id]}
                                  autoComplete="off"
                                />
                                {commentImages[post._id] && (
                                  <>
                                    <img
                                      src={URL.createObjectURL(commentImages[post._id])}
                                      alt="Vista previa"
                                      className="h-10 w-10 object-cover rounded-lg border border-white/20 ml-2"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setCommentImages(prev => ({ ...prev, [post._id]: null }))}
                                      className="text-red-400 hover:text-red-600 ml-1 text-xs"
                                      title="Quitar imagen"
                                    >
                                      Quitar
                                    </button>
                                  </>
                                )}
                                <button
                                  type="submit"
                                  className="bg-white text-black p-1.5 rounded-full hover:bg-gray-200 transition-all duration-300 shadow-lg ml-2"
                                  title="Enviar comentario"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
                                    />
                                  </svg>
                                </button>
                                <label className="inline-flex items-center cursor-pointer ml-2">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                      const file = e.target.files[0];
                                      setCommentImages((prev) => ({ ...prev, [post._id]: file }));
                                    }}
                                    title="Adjuntar imagen"
                                  />
                                  <span className="bg-white/20 hover:bg-white/40 text-white/80 rounded-full p-1 flex items-center justify-center transition-all border border-white/10 text-xs" style={{ width: 28, height: 28 }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828M7 7h.01M7 7a4 4 0 015.657 5.657l-6.586 6.586a4 4 0 01-5.657-5.657L7 7z" />
                                    </svg>
                                  </span>
                                </label>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal de reacciones */}
          {showReactionsModal && (
            <ReactionsModal
              isOpen={true}
              onClose={() => setShowReactionsModal(null)}
              reactions={posts.find(p => p._id === showReactionsModal)?.reactions || []}
              getImageUrl={getImageUrl}
              postId={showReactionsModal}
              onRemoveReaction={handleReact}
            />
          )}
        </div>
      </div>

      {/* Modal de edición del grupo */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setIsEditing(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-black rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl w-full max-w-2xl relative border border-white/30 backdrop-blur-lg overflow-y-auto max-h-[90vh] custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8 pb-3 sm:pb-4 border-b border-white/10">
              <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-base sm:text-lg md:text-2xl">Editar Grupo</span>
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-white/60 hover:text-white transition-colors p-1 sm:p-2 hover:bg-white/10 rounded-lg touch-manipulation"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateGroup} className="flex flex-col gap-4 sm:gap-6">
              {/* Nombre */}
              <div className="flex flex-col gap-2">
                <label className="block text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Nombre del grupo"
                  value={editForm.name}
                  onChange={handleEditChange}
                  required
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all text-sm sm:text-base
                    hover:border-white/40 focus:border-white
                    hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                    focus:outline-none placeholder:text-white/40"
                />
              </div>
              
              {/* Descripción */}
              <div className="flex flex-col gap-2">
                <label className="block text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Descripción
                </label>
                <textarea
                  name="description"
                  placeholder="Describe el propósito del grupo"
                  value={editForm.description}
                  onChange={handleEditChange}
                  required
                  rows="4"
                  maxLength={50}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all text-sm sm:text-base
                    hover:border-white/40 focus:border-white
                    hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                    focus:outline-none placeholder:text-white/40 resize-y"
                />
                <div className="text-right text-xs text-white/60 mt-1">
                  {editForm.description.length}/50 caracteres
                </div>
              </div>
              
              {/* Avatar */}
              <div className="flex flex-col gap-2">
                <label className="block text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Nuevo Avatar (opcional)
                </label>
                <input
                  type="file"
                  name="avatar"
                  onChange={handleEditChange}
                  accept="image/*"
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all text-xs sm:text-sm
                    hover:border-white/40 focus:border-white
                    hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                    focus:outline-none placeholder:text-white/40 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4
                    file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold
                    file:bg-white file:text-black
                    hover:file:bg-gray-200 file:cursor-pointer"
                />
              </div>
              
              {/* Visibilidad */}
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="checkbox"
                  name="isPublic"
                  id="isPublic"
                  checked={editForm.isPublic}
                  onChange={handleEditChange}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded border-white/20 text-indigo-600 focus:ring-indigo-500 touch-manipulation"
                />
                <label htmlFor="isPublic" className="text-white font-semibold text-sm sm:text-base cursor-pointer">
                  Grupo Público (cualquiera puede unirse)
                </label>
              </div>
              
              {/* Botones */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 sm:px-6 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition text-sm sm:text-base touch-manipulation"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition text-sm sm:text-base touch-manipulation"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal de miembros */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setShowMembersModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-black rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl w-full max-w-2xl relative border border-white/30 backdrop-blur-lg overflow-y-auto max-h-[90vh] custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8 pb-3 sm:pb-4 border-b border-white/10">
              <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-base sm:text-lg md:text-2xl">Miembros del Grupo</span>
              </h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-white/60 hover:text-white transition-colors p-1 sm:p-2 hover:bg-white/10 rounded-lg touch-manipulation"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Lista de miembros */}
            <div className="space-y-3 sm:space-y-4">
              {group.members && group.members.length > 0 ? (
                group.members.map(member => {
                  const memberUser = member.user._id ? member.user : { _id: member.user, username: 'Usuario', avatar: null };
                  const isCurrentUser = memberUser._id === currentUserId;
                  const isGroupCreator = group.creator === memberUser._id;
                  
                  return (
                    <div key={memberUser._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 flex-shrink-0">
                          {memberUser.avatar ? (
                            <img 
                              src={getImageUrl(memberUser.avatar)} 
                              alt={memberUser.username} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                              {memberUser.username?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-white flex flex-wrap items-center gap-2 text-sm sm:text-base">
                            <span className="truncate">{memberUser.username}</span>
                            {isCurrentUser && <span className="text-[10px] sm:text-xs bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">Tú</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${member.role === 'admin' ? 'bg-purple-500/30 text-purple-200' : 'bg-white/10 text-white/70'}`}>
                              {member.role === 'admin' ? 'Administrador' : 'Miembro'}
                            </span>
                            {isGroupCreator && (
                              <span className="text-[10px] sm:text-xs bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded-full">
                                Creador
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isAdmin() && !isCurrentUser && !isGroupCreator && (
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                          {/* Solo el owner puede cambiar roles de administradores */}
                          {member.role === 'member' ? (
                            <button
                              onClick={() => handleChangeRole(memberUser._id, 'admin')}
                              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition touch-manipulation flex-1 sm:flex-initial text-center"
                            >
                              Hacer Admin
                            </button>
                          ) : (
                            /* Solo mostrar botón "Quitar Admin" si es el owner */
                            isCreator() && (
                              <button
                                onClick={() => handleChangeRole(memberUser._id, 'member')}
                                className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition touch-manipulation flex-1 sm:flex-initial text-center"
                              >
                                Quitar Admin
                              </button>
                            )
                          )}
                          {/* Solo mostrar botón "Eliminar" si no es el owner del grupo */}
                          {!isGroupCreator && (
                            <button
                              onClick={() => handleRemoveMember(memberUser._id)}
                              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-white rounded transition touch-manipulation flex-1 sm:flex-initial text-center"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 sm:py-8 text-white/60 text-sm sm:text-base">
                  No hay miembros en este grupo.
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4 sm:mt-6">
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-4 sm:px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition text-sm sm:text-base touch-manipulation w-full sm:w-auto"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Nav para móviles */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 safe-area-bottom">
        <div className="relative mx-auto max-w-3xl">
          {/* Barra */}
          <div className="bg-black/80 backdrop-blur-md border-t border-white/10 h-16 px-4 flex items-center justify-between">
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] mt-0.5">Inicio</span>
            </motion.a>
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/groups" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-2a4 4 0 00-3-3.87M7 20v-2a4 4 0 013-3.87m5-4a4 4 0 11-8 0 4 4 0 018 0zm6 8v-2a4 4 0 00-3-3.87M3 20v-2a4 4 0 013-3.87" />
              </svg>
              <span className="text-[10px] mt-0.5">Grupos</span>
            </motion.a>
            {/* Botón central flotante */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.6)', '0 0 0 12px rgba(255,255,255,0)'] }}
                transition={{ repeat: Infinity, duration: 3.6, ease: 'easeOut' }}
                onClick={() => setShowCreatePostForm(v => !v)}
                className="w-14 h-14 rounded-full bg-white text-black font-bold text-2xl shadow-xl border border-black/10 flex items-center justify-center"
                aria-label="Crear publicación"
              >
                +
              </motion.button>
            </div>
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/marketplace" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 8h14l1 12a2 2 0 01-2 2H6a2 2 0 01-2-2l1-12z" />
              </svg>
              <span className="text-[10px] mt-0.5">Market</span>
            </motion.a>
            {isMember() ? (
              <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={handleLeaveGroup} className="flex flex-col items-center text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-[10px] mt-0.5">Salir</span>
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={handleJoinGroup} className="flex flex-col items-center text-white/80">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="text-[10px] mt-0.5">Unirse</span>
              </motion.button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default GroupDetail;
