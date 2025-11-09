import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import MultiMediaUpload from '../posts/MultiMediaUpload';
import { Link } from 'react-router-dom';
import UsersSidebar from '../../shared/components/UsersSidebar';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import ReactionsModal from '../posts/ReactionsModal';
import { useToxicityCheck } from '../../shared/hooks/useToxicityCheck';
import { useNSFWCheck } from '../../shared/hooks/useNSFWCheck';

const API_URL = 'http://localhost:3000/api/v1/profile';
const POSTS_API_URL = 'http://localhost:3000/api/v1/posts';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', file: null });
  const [mediaFiles, setMediaFiles] = useState([]);
  
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: '' });

  // Función para mostrar notificación
  const mostrarNotificacion = (mensaje, tipo = 'error') => {
    setNotificacion({ show: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: '' }), 5000);
  };

  // Componente de notificación
  const Notificacion = () => {
    if (!notificacion.show) return null;

    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <div className="bg-red-500/20 border border-red-500/50 text-white p-4 rounded-lg flex items-start gap-3 backdrop-blur-sm shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{notificacion.mensaje}</span>
        </div>
      </div>
    );
  };
  
  // Estados para los posts
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [showPicker, setShowPicker] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostForm, setEditPostForm] = useState({ title: '', content: '', file: null });
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [commentImages, setCommentImages] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [showReactionsModal, setShowReactionsModal] = useState(null);
  const [openPostMenu, setOpenPostMenu] = useState(null);
  const postMenuRefs = useRef({});
  
  const [editForm, setEditForm] = useState({
    username: '',
    pronombre: '',
    biography: '',
    carrera: '',
    semestre: '',
    redesSociales: {
      instagram: '',
      twitter: '',
      linkedin: '',
      github: ''
    }
  });

  // Estado para el carrusel de cada post (igual que Home.jsx)
  const [carouselIndexes, setCarouselIndexes] = useState({});

  // Obtener perfil del usuario actual
  const getMyProfile = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  };

  // Actualizar perfil
  const updateMyProfile = async (profileData) => {
    const token = localStorage.getItem('token');

    // Verificar si la biografía contiene contenido inapropiado
    if (profileData.biography) {
      try {
        const result = await checkText(profileData.biography);
        if (result.isToxic) {
          mostrarNotificacion('⚠️ La biografía contiene contenido inapropiado');
          return null;
        }
      } catch (err) {
        console.error('Error al verificar texto:', err);
        mostrarNotificacion('Error al verificar el contenido de la biografía');
        return null;
      }
    }

    const response = await axios.put(
      `${API_URL}/me`,
      profileData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };

  // Actualizar avatar
  const updateAvatar = async (file) => {
    const token = localStorage.getItem('token');

    // Verificar si el archivo es una imagen
    if (file.type.startsWith('image/')) {
      try {
        const nsfwResult = await checkImage(file);
        if (nsfwResult.isNSFW) {
          const categories = nsfwResult.predictions
            .filter(p => p.probability > 0.7)
            .map(p => {
              const percent = Math.round(p.probability * 100);
              return `${p.className} (${percent}%)`;
            })
            .join(', ');
          mostrarNotificacion(`⚠️ Contenido no permitido detectado en la imagen: ${categories}`);
          return null;
        }
      } catch (err) {
        console.error('Error al verificar imagen:', err);
        mostrarNotificacion('Error al verificar el contenido de la imagen.');
        return null;
      }
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await axios.post(
      `${API_URL}/me/avatar`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  };

  // Actualizar foto de portada
  const updateCover = async (file) => {
    const token = localStorage.getItem('token');

    // Verificar si el archivo es una imagen
    if (file.type.startsWith('image/')) {
      try {
        const nsfwResult = await checkImage(file);
        if (nsfwResult.isNSFW) {
          const categories = nsfwResult.predictions
            .filter(p => p.probability > 0.7)
            .map(p => {
              const percent = Math.round(p.probability * 100);
              return `${p.className} (${percent}%)`;
            })
            .join(', ');
          mostrarNotificacion(`⚠️ Contenido no permitido detectado en la imagen: ${categories}`);
          return null;
        }
      } catch (err) {
        console.error('Error al verificar imagen:', err);
        mostrarNotificacion('Error al verificar el contenido de la imagen.');
        return null;
      }
    }

    const formData = new FormData();
    formData.append('cover', file);

    const response = await axios.post(
      `${API_URL}/me/cover`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  };

  // Eliminar avatar
  const deleteAvatar = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/me/avatar`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  };

  // Eliminar foto de portada
  const deleteCover = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/me/cover`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  };



  // Función para obtener los posts del usuario
  const fetchUserPosts = async (userId) => {
    if (!userId) return;
    try {
      setPostsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${POSTS_API_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data.posts);
    } catch (err) {
      setPostsError('Error al cargar las publicaciones');
      console.error('Error al cargar posts:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  // Función para manejar reacciones a posts
  const handleReact = async (postId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${POSTS_API_URL}/${postId}/reaction`, 
        { emoji },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      // Actualizar los posts después de reaccionar
      if (profile?._id) {
        fetchUserPosts(profile.user);
      }
    } catch (err) {
      console.error('Error al reaccionar:', err);
    }
  };

  // Función para eliminar una reacción
  const handleRemoveReaction = async (postId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${POSTS_API_URL}/${postId}/reaction`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { emoji } // Enviar el emoji en el cuerpo de la solicitud DELETE
      });
      // Actualizar los posts después de eliminar la reacción
      if (profile?._id) {
        fetchUserPosts(profile.user);
      }
    } catch (err) {
      console.error('Error al eliminar reacción:', err);
    }
  };

  // Función para agregar un comentario
  const handleAddComment = async (postId, content) => {
    try {
      // Verificar contenido inapropiado en el texto del comentario
      if (content.trim()) {
        const toxicityResult = await checkText(content);
        if (toxicityResult.isToxic) {
          const categories = toxicityResult.categories
            .map(c => {
              const tipo = {
                'identity_attack': 'ataque a la identidad',
                'insult': 'insulto',
                'obscene': 'obscenidad',
                'severe_toxicity': 'toxicidad severa',
                'sexual_explicit': 'contenido sexual explícito',
                'threat': 'amenaza',
                'toxicity': 'toxicidad',
                'palabra_prohibida': 'palabra prohibida'
              }[c.category] || c.category;
              const porcentaje = Math.round(c.probability * 100);
              return `${tipo} (${porcentaje}%)`;
            })
            .join(', ');
          mostrarNotificacion(`⚠️ Tu comentario contiene contenido inapropiado: ${categories}`);
          return;
        }
      }

      // Verificar imagen inapropiada en el comentario
      if (commentImages[postId]) {
        try {
          const nsfwResult = await checkImage(commentImages[postId]);
          if (nsfwResult.isNSFW) {
            const categories = nsfwResult.predictions
              .filter(p => p.probability > 0.7)
              .map(p => {
                const percent = Math.round(p.probability * 100);
                return `${p.className} (${percent}%)`;
              })
              .join(', ');
            mostrarNotificacion(`⚠️ Contenido no permitido detectado en la imagen: ${categories}`);
            setCommentImages(prev => ({...prev, [postId]: null}));
            return;
          }
        } catch (err) {
          console.error('Error al verificar imagen del comentario:', err);
          mostrarNotificacion('Error al verificar el contenido de la imagen. Por favor, intenta con otra.');
          return;
        }
      }

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', content);
      if (commentImages[postId]) formData.append('image', commentImages[postId]);
      await axios.post(`${POSTS_API_URL}/${postId}/comment`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Actualizar los posts después de comentar
      if (profile?._id) {
        fetchUserPosts(profile.user);
      }
    } catch (err) {
      console.error('Error al comentar:', err);
    }
  };
  
  // Función para manejar cambios en el formulario de creación de posts
  const handleChange = e => {
    const { name, value, files } = e.target;
    if (name === 'media') {
      // Convertir FileList a Array y agregarlo a mediaFiles
      const newFiles = Array.from(files);
      setMediaFiles(prevFiles => [...prevFiles, ...newFiles]);
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const { checkText } = useToxicityCheck();
  const { checkImage } = useNSFWCheck();

  // Función para enviar el formulario de creación de posts
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      // Verificar contenido inapropiado en el texto
      if (form.content.trim()) {
        const toxicityResult = await checkText(form.content);
        if (toxicityResult.isToxic) {
          const categories = toxicityResult.categories
            .map(c => {
              const tipo = {
                'identity_attack': 'ataque a la identidad',
                'insult': 'insulto',
                'obscene': 'obscenidad',
                'severe_toxicity': 'toxicidad severa',
                'sexual_explicit': 'contenido sexual explícito',
                'threat': 'amenaza',
                'toxicity': 'toxicidad',
                'palabra_prohibida': 'palabra prohibida'
              }[c.category] || c.category;
              const porcentaje = Math.round(c.probability * 100);
              return `${tipo} (${porcentaje}%)`;
            })
            .join(', ');
          mostrarNotificacion(`⚠️ Tu mensaje contiene contenido inapropiado: ${categories}`);
          return;
        }
      }

      // Verificar imágenes inapropiadas
      for (const file of mediaFiles) {
        if (file.type.startsWith('image/')) {
          try {
            const nsfwResult = await checkImage(file);
            if (nsfwResult.isNSFW) {
              const categories = nsfwResult.predictions
                .filter(p => p.probability > 0.7)
                .map(p => {
                  const percent = Math.round(p.probability * 100);
                  return `${p.className} (${percent}%)`;
                })
                .join(', ');
              mostrarNotificacion(`⚠️ Contenido no permitido detectado en la imagen "${file.name}": ${categories}`);
              setMediaFiles([]); // Limpiar los archivos
              return;
            }
          } catch (err) {
            console.error('Error al verificar imagen:', err);
            mostrarNotificacion('Error al verificar el contenido de la imagen. Por favor, intenta con otra.');
            return;
          }
        }
      }

      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('content', form.content);
      // Adjuntar archivos multimedia
      mediaFiles.forEach((file) => {
        formData.append('media', file);
      });
      const token = localStorage.getItem('token');
      const res = await fetch(POSTS_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al crear el post');
      }
      setForm({ title: '', content: '', file: null });
      setMediaFiles([]);
      // Actualizar los posts después de crear uno nuevo
      if (profile?.user) {
        fetchUserPosts(profile.user);
      }
      setShowForm(false); // Ocultar el formulario después de publicar
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
        setEditForm({
          username: res.data.username,
          pronombre: res.data.pronombre || '',
          biography: res.data.biography || '',
          carrera: res.data.carrera || '',
          semestre: res.data.semestre || '',
          redesSociales: {
            instagram: res.data.redesSociales?.instagram || '',
            twitter: res.data.redesSociales?.twitter || '',
            linkedin: res.data.redesSociales?.linkedin || '',
            github: res.data.redesSociales?.github || ''
          }
        });
        
        // Cargar los posts del usuario una vez que tenemos su ID
        if (res.data.user) {
          fetchUserPosts(res.data.user);
        }
      } catch (err) {
        mostrarNotificacion('No se pudo cargar el perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

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


  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        try {
          const nsfwResult = await checkImage(file);
          if (nsfwResult.isNSFW) {
            const categories = nsfwResult.predictions
              .filter(p => p.probability > 0.7)
              .map(p => {
                const percent = Math.round(p.probability * 100);
                return `${p.className} (${percent}%)`;
              })
              .join(', ');
            mostrarNotificacion(`⚠️ Contenido no permitido detectado en la imagen: ${categories}`);
            return;
          }
          setAvatarFile(file);
        } catch (err) {
          console.error('Error al verificar imagen:', err);
          mostrarNotificacion('Error al verificar el contenido de la imagen.');
          return;
        }
      }
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        try {
          const nsfwResult = await checkImage(file);
          if (nsfwResult.isNSFW) {
            const categories = nsfwResult.predictions
              .filter(p => p.probability > 0.7)
              .map(p => {
                const percent = Math.round(p.probability * 100);
                return `${p.className} (${percent}%)`;
              })
              .join(', ');
            mostrarNotificacion(`⚠️ Contenido no permitido detectado en la imagen: ${categories}`);
            return;
          }
          setCoverFile(file);
        } catch (err) {
          console.error('Error al verificar imagen:', err);
          mostrarNotificacion('Error al verificar el contenido de la imagen.');
          return;
        }
      }
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        'http://localhost:3000/api/v1/profile/avatar',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Actualiza el perfil localmente con la nueva URL del avatar
      setProfile(prev => ({ ...prev, avatar: res.data.avatar }));
      setAvatarFile(null);
      alert('Avatar actualizado correctamente');
    } catch (err) {
      alert('Error al actualizar el avatar');
    }
  };

  const handleCoverUpload = async (e) => {
    e.preventDefault();
    if (!coverFile) return;
    try {
      const formData = new FormData();
      formData.append('cover', coverFile);
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:3000/api/v1/profile/cover', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setProfile(res.data); // Actualiza el perfil con la nueva imagen
      setCoverFile(null);
    } catch (err) {
      mostrarNotificacion('Error al actualizar la portada');
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar tu foto de perfil?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete('http://localhost:3000/api/v1/profile/avatar', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(prev => ({ ...prev, avatar: res.data.avatar }));
      alert('Avatar eliminado y restablecido al valor por defecto');
    } catch (err) {
      alert('Error al eliminar el avatar');
    }
  };

  const handleDeleteCover = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar tu portada?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete('http://localhost:3000/api/v1/profile/cover', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(prev => ({ ...prev, cover: res.data.cover }));
      alert('Portada eliminada y restablecida al valor por defecto');
    } catch (err) {
      alert('Error al eliminar la portada');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      // Verificar si la biografía contiene contenido inapropiado
      if (editForm.biography) {
        try {
          const result = await checkText(editForm.biography);
          if (result.isToxic) {
            mostrarNotificacion('⚠️ La biografía contiene contenido inapropiado');
            return;
          }
        } catch (err) {
          console.error('Error al verificar texto:', err);
          mostrarNotificacion('Error al verificar el contenido de la biografía');
          return;
        }
      }

      // Asegura que todos los campos requeridos estén presentes
      const payload = {
        username: editForm.username || profile.username || '',
        pronombre: editForm.pronombre || '',
        biography: editForm.biography || '',
        carrera: editForm.carrera || '',
        semestre: editForm.semestre || '',
        redesSociales: {
          instagram: editForm.redesSociales.instagram || '',
          twitter: editForm.redesSociales.twitter || '',
          linkedin: editForm.redesSociales.linkedin || '',
          github: editForm.redesSociales.github || ''
        }
      };
      const res = await axios.put(
        'http://localhost:3000/api/v1/profile/me',
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setProfile(prev => ({
        ...res.data,
        email: prev.email // conserva el email anterior
      }));
      setShowEdit(false);
      alert('Perfil actualizado correctamente');
    } catch (err) {
      alert('Error al actualizar el perfil: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('redesSociales.')) {
      const key = name.split('.')[1];
      setEditForm(prev => ({
        ...prev,
        redesSociales: {
          ...prev.redesSociales,
          [key]: value
        }
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  };
  
  // Función para editar un post
  const handleEditPost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', editPostForm.title);
      formData.append('content', editPostForm.content);
      
      if (editPostForm.image) {
        formData.append('image', editPostForm.image);
      }
      
      await axios.put(`${POSTS_API_URL}/${postId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setEditingPostId(null);
      setEditPostForm({ title: '', content: '', image: null });
      
      // Actualizar los posts después de editar
      if (profile?._id) {
        fetchUserPosts(profile.user);
      }
    } catch (err) {
      console.error('Error al editar post:', err);
    }
  };
  
  // Función para eliminar un post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta publicación?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${POSTS_API_URL}/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Actualizar los posts después de eliminar
      if (profile?._id) {
        fetchUserPosts(profile.user);
      }
    } catch (err) {
      console.error('Error al eliminar post:', err);
    }
  };
  
  // Función para agrupar reacciones
  const groupReactions = (reactions) => {
    if (!reactions || reactions.length === 0) return {};
    
    return reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          count: 1,
          users: [reaction.user]
        };
      } else {
        acc[reaction.emoji].count += 1;
        acc[reaction.emoji].users.push(reaction.user);
      }
      return acc;
    }, {});
  };
  
  // Verificar si el usuario actual es el autor del post
  const isPostAuthor = (post) => {
    if (!post || !profile) return false;
    return post.author?._id === profile.user || post.author === profile.user;
  };

  const handleSendRequest = async () => {
    try {
      // Esta función se eliminó porque la funcionalidad de amigos está en UserProfile
      console.log('La funcionalidad de amigos está en el componente UserProfile');
    } catch (err) {
      alert('Error al enviar solicitud');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl">Cargando perfil...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-red-500 text-xl">Perfil no encontrado</div>
      </div>
    );
  }

  return (
    <>
      {/* Componente de notificación */}
      <Notificacion />
      
      {/* Barra lateral de usuarios */}
      <UsersSidebar />
      
      {/* Nav superior */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 w-full z-20 bg-black/80 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          <Link to="/">
            <img src="/logo.png" alt="Logo" className="h-16" />
          </Link>
          <div className="flex items-center gap-4">
            {/* Botón para crear publicación - oculto en móviles */}
            <button
              onClick={() => setShowForm((prev) => !prev)}
              className="hidden lg:flex px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {showForm ? 'Cerrar formulario' : 'Crear publicación'}
            </button>
            {/* Botón para abrir el formulario de editar perfil - oculto en móviles */}
            <button
              onClick={() => setShowEdit(true)}
              className="hidden lg:block px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Editar perfil
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Fondo animado negro con estrellas */}
      <div className="fixed inset-0 -z-10 bg-black overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Contenedor principal estilo Facebook */}
      <div className="relative min-h-screen flex flex-col items-center justify-start pt-24 pb-24 z-10 bg-transparent mx-4 sm:mx-6 lg:ml-64 lg:mr-72">
        <div className="w-full max-w-4xl mx-auto">
          {/* Portada */}
          <div className="relative h-96 rounded-t-2xl shadow-lg bg-transparent border-t-2 border-x-2 border-white">
            {profile.cover && profile.cover !== '/uploads/default-cover.jpg' ? (
              <img
                src={getImageUrl(profile.cover)}
                alt="Portada"
                className="absolute inset-0 w-full h-full object-cover rounded-t-2xl"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full rounded-t-2xl bg-gradient-to-r from-white via-gray-400 to-black flex items-center justify-center">
                <span className="text-black text-4xl font-bold opacity-40">Sin portada</span>
              </div>
            )}
          </div>
          {/* Avatar y datos principales */}
          <div className="relative bg-transparent border-x-2 border-b-2 border-white rounded-b-2xl shadow-lg px-8 pb-8 pt-0 flex flex-col items-center gap-6 -mt-16">
            {/* Avatar grande perfectamente centrado */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-16">
              {profile.avatar && profile.avatar !== '/uploads/default-avatar.png' ? (
                <img
                  src={getImageUrl(profile.avatar)}
                  alt="Avatar"
                  className="w-36 h-36 rounded-full object-cover shadow-lg border-4 border-white"
                />
              ) : (
                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-5xl shadow-lg border-4 border-white">
                  {profile.pronombre?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            {/* Espacio para el avatar */}
            <div className="h-20" />
            {/* Nombre de usuario */}
            <div className="font-bold text-3xl text-white text-center mt-4">
              {profile.username}
            </div>
            {/* Sección de acciones de perfil */}
            <div className="mt-2">
              {/* Espacio reservado para futuras acciones */}
            </div>
          </div>
          {/* Sección de información y acciones */}
          <div className="flex flex-col md:flex-row gap-8 mt-8">
            {/* Información de perfil */}
            <div className="flex-1 bg-black/40 border border-white/30 rounded-2xl shadow-lg p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Información de perfil
              </h2>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-white/60">Nombre de usuario</div>
                      <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">{profile.username}</div>
                    </div>
                  </div>
                </div>

                {/* Pronombre */}
                {profile.pronombre && (
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-white/60">Pronombre</div>
                        <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">{profile.pronombre}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Correo electrónico */}
                <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-white/60">Correo electrónico</div>
                      <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">{profile.email}</div>
                    </div>
                  </div>
                </div>

                {/* Carrera */}
                {profile.carrera && (
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-white/60">Carrera</div>
                        <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">{profile.carrera}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Semestre */}
                {profile.semestre && (
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-white/60">Semestre</div>
                        <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">{profile.semestre}°</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Redes sociales */}
                {profile.redesSociales?.instagram && (
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-white/60">Instagram</div>
                        <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">
                          <a href={`https://instagram.com/${profile.redesSociales.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer">
                            {profile.redesSociales.instagram}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {profile.redesSociales?.twitter && (
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-white/60">Twitter</div>
                        <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">
                          <a href={`https://twitter.com/${profile.redesSociales.twitter.replace('@','')}`} target="_blank" rel="noopener noreferrer">
                            {profile.redesSociales.twitter}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {profile.redesSociales?.linkedin && (
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-white/60">LinkedIn</div>
                        <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">
                          <a href={profile.redesSociales.linkedin} target="_blank" rel="noopener noreferrer">
                            {profile.redesSociales.linkedin}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {profile.redesSociales?.github && (
                  <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-white/60">GitHub</div>
                        <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">
                          <a href={profile.redesSociales.github} target="_blank" rel="noopener noreferrer">
                            {profile.redesSociales.github}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Biografía */}
            <div className="w-full md:w-72 flex flex-col gap-4">
              <div className="bg-black/40 border border-white/30 rounded-2xl shadow-lg p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Biografía
                </h3>
                <div className="text-white/80 text-sm whitespace-pre-wrap message-content" style={{ maxWidth: '250px', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                  {profile.biography || 'No hay biografía aún. ¡Agrega una!'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Sección de Posts */}
          <div className="w-full mt-8">
            <div className="bg-black/40 border border-white/30 rounded-2xl shadow-lg p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                Publicaciones
              </h2>
              
              {/* Formulario para crear post */}
              {showForm && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="mb-8 bg-black rounded-2xl p-8 shadow-2xl w-full relative border border-white/30 backdrop-blur-lg overflow-y-auto"
                >
                  {/* Encabezado */}
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                    <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Nueva Publicación
                    </h2>
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                      aria-label="Cerrar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* Título */}
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
                        value={form.title}
                        onChange={handleChange}
                        className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                          hover:border-white/40 focus:border-white
                          hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                          focus:outline-none placeholder:text-white/40"
                      />
                    </div>
                    
                    {/* Contenido */}
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
                        value={form.content}
                        onChange={handleChange}
                        required
                        rows="4"
                        className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                          hover:border-white/40 focus:border-white
                          hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                          focus:outline-none placeholder:text-white/40"
                      />
                    </div>
                    
                    {/* Archivos multimedia (imágenes, videos, docs) */}
                    <MultiMediaUpload files={mediaFiles} setFiles={setMediaFiles} />
                    
                    {/* Botón de envío */}
                    <button 
                      type="submit" 
                      className="mt-2 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-transparent hover:border-black/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Publicar
                    </button>
                    
                    {/* Mensaje de error */}
                    {error && (
                      <div className="bg-red-500/20 border border-red-500/50 text-white p-4 rounded-lg flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}
                  </form>
                </motion.div>
              )}
              
              {postsLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
              ) : postsError ? (
                <div className="text-red-500 text-center py-10">{postsError}</div>
              ) : posts.length === 0 ? (
                <div className="text-white/60 text-center py-10">
                  <p className="text-lg">No hay publicaciones aún</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map(post => {
                    const isAuthor = isPostAuthor(post);
                    const grouped = groupReactions(post.reactions);
                    
                    return (
                      <div key={post._id} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition border border-white/20">
                        {/* Cabecera del post con avatar y nombre */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            {post.author?.avatar && post.author.avatar !== '/uploads/default-avatar.png' ? (
                              <img
                                src={getImageUrl(post.author.avatar)}
                                alt="Avatar"
                                className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-md"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-sm border-2 border-white/50 shadow-md">
                                {post.author?.username?.[0]?.toUpperCase() || "U"}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white">{post.author?.username || 'Usuario'}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(post.createdAt).toLocaleDateString()} - {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          {/* Menú de 3 puntos solo en móviles y solo para el autor */}
                          {isAuthor && (
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
                                  <button
                                    className="w-full text-left px-4 py-3 text-white/90 hover:bg-white/10 flex items-center gap-2"
                                    onClick={() => {
                                      setEditingPostId(post._id);
                                      setEditPostForm({ 
                                        title: post.title, 
                                        content: post.content, 
                                        image: null 
                                      });
                                      setOpenPostMenu(null);
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Editar
                                  </button>
                                  <button
                                    className="w-full text-left px-4 py-3 text-white/90 hover:bg-white/10 flex items-center gap-2 text-red-400"
                                    onClick={async () => {
                                      if (!window.confirm('¿Seguro que quieres eliminar este post?')) {
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
                                    Eliminar
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Contenido del post */}
                        {editingPostId === post._id ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-white font-semibold mb-1">Título</label>
                              <input
                                type="text"
                                value={editPostForm.title}
                                onChange={(e) => setEditPostForm({...editPostForm, title: e.target.value})}
                                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20"
                              />
                            </div>
                            <div>
                              <label className="block text-white font-semibold mb-1">Contenido</label>
                              <textarea
                                value={editPostForm.content}
                                onChange={(e) => setEditPostForm({...editPostForm, content: e.target.value})}
                                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20 min-h-[100px]"
                              />
                            </div>
                            <div>
                              <label className="block text-white font-semibold mb-1">Imagen (opcional)</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setEditPostForm({...editPostForm, image: e.target.files[0]})}
                                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditPost(post._id)}
                                className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition shadow-md text-sm font-medium"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPostId(null);
                                  setEditPostForm({ title: '', content: '', image: null });
                                }}
                                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition shadow-md text-sm font-medium"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {post.title && <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>}
                            <p className="text-white/90 whitespace-pre-wrap mb-4">{post.content}</p>
                            {/* Carrusel de imágenes/videos y caja de descarga para otros archivos */}
                            {Array.isArray(post.media) && post.media.length > 0 && (
                              <div className="w-full flex flex-col items-center mt-2 mb-4">
                                {/* Carrusel solo para imágenes y videos */}
                                {(() => {
                                  const mediaItems = post.media.filter(m => m.type === 'image' || m.type === 'video');
                                  const otherFiles = post.media.filter(m => m.type === 'file');
                                  const idx = carouselIndexes[post._id] || 0;
                                  return <>
                                    {mediaItems.length > 0 && (
                                      <div className="relative w-full flex flex-col items-center">
                                        {mediaItems[idx].type === 'image' ? (
                                          <img
                                            src={mediaItems[idx].url}
                                            alt={mediaItems[idx].name}
                                            className="w-full max-h-[500px] object-cover bg-black/30 rounded-lg"
                                          />
                                        ) : (
                                          <video
                                            src={mediaItems[idx].url}
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
                            {/* Botón de Reacciones */}
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
                            
                            {/* Botón para agregar reacción */}
                            <button
                              type="button"
                              className="w-full sm:w-auto px-1.5 sm:px-2 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition border border-transparent hover:border-black/20 text-base sm:text-lg font-semibold"
                              onClick={() => setShowPicker(showPicker === post._id ? null : post._id)}
                              title="Agregar reacción"
                            >
                              +
                            </button>
                            
                            {/* Emoji picker */}
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
                          
                            {/* Botón comentar */}
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
                          
                          {/* Acciones del autor - Solo visible en desktop */}
                          {isAuthor && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPostId(post._id);
                                  setEditPostForm({ 
                                    title: post.title, 
                                    content: post.content, 
                                    image: null 
                                  });
                                }}
                                className="hidden md:flex w-full sm:w-auto px-3 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-sm border border-transparent hover:border-black/20 items-center justify-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeletePost(post._id)}
                                className="hidden md:flex w-full sm:w-auto px-3 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-sm border border-transparent hover:border-black/20 items-center justify-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Eliminar
                              </button>
                            </>
                          )}
                          </div>
                        )}
                        
                        {/* Sección de comentarios */}
                        {openComments[post._id] && (
                          <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 mt-3 border border-white/20 shadow-lg transition-all duration-300 ease-in-out">
                            <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                              </svg>
                              Comentarios
                            </h3>
                            
                            {/* Lista de comentarios */}
                            <div className="mb-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                              {post.comments && post.comments.length > 0 ? (
                                <ul className="space-y-2">
                                  {post.comments.map((comment) => {
                                    const isCommentAuthor = profile && (comment.user?._id === profile.user || comment.user === profile.user);
                                    const isEditing = editingCommentId === comment._id;
                                    
                                    return (
                                      <li key={comment._id} className="bg-white/5 hover:bg-white/10 transition-all duration-200 rounded-lg p-2 shadow-sm">
                                        <div className="flex items-start gap-2">
                                          {/* Avatar del comentario */}
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
                                            </div>
                                            
                                            {/* Edición de comentario */}
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
                                                    onClick={async () => {
                                                      const token = localStorage.getItem('token');
                                                      await axios.put(
                                                        `${POSTS_API_URL}/${post._id}/comment/${comment._id}`,
                                                        { content: editCommentContent },
                                                        { headers: { Authorization: `Bearer ${token}` }}
                                                      );
                                                      setEditingCommentId(null);
                                                      setEditCommentContent('');
                                                      fetchUserPosts(profile.user);
                                                    }}
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
                                                {isCommentAuthor && (
                                                  <div className="flex justify-end gap-2 mt-1">
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
                                                    <button
                                                      onClick={async () => {
                                                        if (!window.confirm('¿Seguro que quieres eliminar este comentario?')) return;
                                                        const token = localStorage.getItem('token');
                                                        await axios.delete(
                                                          `${POSTS_API_URL}/${post._id}/comment/${comment._id}`,
                                                          { headers: { Authorization: `Bearer ${token}` }}
                                                        );
                                                        fetchUserPosts(profile.user);
                                                      }}
                                                      className="bg-white text-black px-2 py-1 rounded hover:bg-gray-200 transition text-xs flex items-center gap-1 font-medium border border-transparent hover:border-black/20"
                                                    >
                                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                      </svg>
                                                      Eliminar
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
                                <p className="text-white/60 text-center py-2">No hay comentarios aún</p>
                              )}
                            </div>
                            
                            {/* Formulario para agregar comentario */}
                            <div className="mt-3">
                              <form
                                onSubmit={e => {
                                  e.preventDefault();
                                  const content = e.target.comment.value.trim();
                                  const image = commentImages[post._id] || null;
                                  if (!content && !image) return;
                                  handleAddComment(post._id, content);
                                  e.target.comment.value = '';
                                  setCommentImages((prev) => ({ ...prev, [post._id]: null }));
                                }}
                                className="flex w-full items-center gap-2 mt-2"
                              >
                                <input
                                  type="text"
                                  name="comment"
                                  placeholder="Escribe un comentario..."
                                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white border border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20"
                                  required={!commentImages[post._id]}
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
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal o formulario de edición de perfil */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-black rounded-2xl p-8 shadow-2xl w-full max-w-2xl relative border border-white/30 backdrop-blur-lg overflow-y-auto max-h-[90vh]"
          >
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
              <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar perfil
              </h2>
            <button
              onClick={() => setShowEdit(false)}
                className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              aria-label="Cerrar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-8">
              {/* Sección de información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre de usuario (no editable) */}
                <div className="flex flex-col gap-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    disabled
                    className="px-4 py-3 bg-black/30 text-white/60 rounded-lg border border-white/10 cursor-not-allowed"
                  />
                </div>

                {/* Correo electrónico (no editable) */}
                <div className="flex flex-col gap-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="px-4 py-3 bg-black/30 text-white/60 rounded-lg border border-white/10 cursor-not-allowed"
                  />
                </div>

                {/* Pronombre */}
                <div className="flex flex-col gap-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Pronombre
                  </label>
                  <input
                    type="text"
                    name="pronombre"
                    value={editForm.pronombre}
                    onChange={handleEditChange}
                    className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                      hover:border-white/40 focus:border-white
                      hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                      focus:outline-none placeholder:text-white/40"
                    placeholder="¿Cómo te gustaría que te llamen?"
                  />
                </div>

                {/* Carrera */}
                <div className="flex flex-col gap-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Carrera
                  </label>
                  <input
                    type="text"
                    name="carrera"
                    value={editForm.carrera}
                    onChange={handleEditChange}
                    className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                      hover:border-white/40 focus:border-white
                      hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                      focus:outline-none placeholder:text-white/40"
                    placeholder="Escribe tu carrera"
                  />
                </div>

                {/* Semestre */}
                <div className="flex flex-col gap-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Semestre
                  </label>
                  <select
                    name="semestre"
                    value={editForm.semestre}
                    onChange={handleEditChange}
                    className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                      hover:border-white/40 focus:border-white
                      hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                      focus:outline-none"
                  >
                    <option value="">Selecciona tu semestre</option>
                    {[1, 2, 3, 4, 5, 6].map(sem => (
                      <option key={sem} value={sem}>{sem}° Semestre</option>
                    ))}
                  </select>
                </div>

                {/* Redes Sociales */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Redes Sociales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="block text-white font-semibold flex items-center gap-2">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        Instagram
                      </label>
                      <input
                        type="text"
                        name="redesSociales.instagram"
                        value={editForm.redesSociales.instagram}
                        onChange={(e) => handleEditChange({
                          target: {
                            name: 'redesSociales.instagram',
                            value: e.target.value
                          }
                        })}
                        className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                          hover:border-white/40 focus:border-white
                          hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                          focus:outline-none placeholder:text-white/40"
                        placeholder="@usuario"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="block text-white font-semibold flex items-center gap-2">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                        Twitter
                      </label>
                      <input
                        type="text"
                        name="redesSociales.twitter"
                        value={editForm.redesSociales.twitter}
                        onChange={(e) => handleEditChange({
                          target: {
                            name: 'redesSociales.twitter',
                            value: e.target.value
                          }
                        })}
                        className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                          hover:border-white/40 focus:border-white
                          hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                          focus:outline-none placeholder:text-white/40"
                        placeholder="@usuario"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="block text-white font-semibold flex items-center gap-2">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </label>
                      <input
                        type="text"
                        name="redesSociales.linkedin"
                        value={editForm.redesSociales.linkedin}
                        onChange={(e) => handleEditChange({
                          target: {
                            name: 'redesSociales.linkedin',
                            value: e.target.value
                          }
                        })}
                        className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                          hover:border-white/40 focus:border-white
                          hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                          focus:outline-none placeholder:text-white/40"
                        placeholder="URL de tu perfil"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="block text-white font-semibold flex items-center gap-2">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </label>
                      <input
                        type="text"
                        name="redesSociales.github"
                        value={editForm.redesSociales.github}
                        onChange={(e) => handleEditChange({
                          target: {
                            name: 'redesSociales.github',
                            value: e.target.value
                          }
                        })}
                        className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                          hover:border-white/40 focus:border-white
                          hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                          focus:outline-none placeholder:text-white/40"
                        placeholder="URL de tu perfil"
                      />
                    </div>
                  </div>
                </div>

                {/* Biografía */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Biografía
                  </label>
                  <textarea
                    name="biography"
                    value={editForm.biography}
                    onChange={handleEditChange}
                    className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                      hover:border-white/40 focus:border-white
                      hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                      focus:outline-none placeholder:text-white/40 min-h-[120px] resize-y"
                    placeholder="Cuéntanos sobre ti..."
                    maxLength={500}
                  />
                  <div className="text-white/60 text-sm text-right flex items-center justify-end gap-2">
                    <span className={`${editForm.biography.length >= 450 ? 'text-white' : ''}`}>
                      {editForm.biography.length}
                    </span>
                    <span className="text-white/40">/</span>
                    <span>500 caracteres</span>
                  </div>
                </div>
              </div>

              {/* Sección de imágenes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Foto de perfil */}
                <div className="flex flex-col items-center gap-4 p-6 bg-black/30 rounded-xl border border-white/20">
                  <div className="relative w-32 h-32">
                    <img
                      src={getImageUrl(profile.avatar)}
                      alt="Avatar"
                      className="w-full h-full object-cover rounded-full border-2 border-white/20"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-white font-semibold mb-1">Foto de perfil</h3>
                    <p className="text-white/60 text-sm mb-2">PNG, JPG o GIF. Máx. 2MB</p>
                    {avatarFile && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAvatarUpload}
                          className="px-3 py-1 bg-white text-black rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvatarFile(null)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    {profile.avatar && profile.avatar !== '/uploads/default-avatar.png' && (
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        className="mt-2 px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                      >
                        Eliminar avatar
                      </button>
                    )}
                  </div>
                </div>

                {/* Portada */}
                <div className="flex flex-col items-center gap-4 p-6 bg-black/30 rounded-xl border border-white/20">
                  <div className="relative w-full aspect-video">
                    <img
                      src={getImageUrl(profile.cover)}
                      alt="Portada"
                      className="w-full h-full object-cover rounded-lg border border-white/20"
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-white font-semibold mb-1">Imagen de portada</h3>
                    <p className="text-white/60 text-sm mb-2">PNG, JPG o GIF. Máx. 5MB</p>
                    {coverFile && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCoverUpload}
                          className="px-3 py-1 bg-white text-black rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoverFile(null)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    {profile.cover && profile.cover !== '/uploads/default-cover.jpg' && (
                      <button
                        type="button"
                        onClick={handleDeleteCover}
                        className="mt-2 px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                      >
                        Eliminar portada
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-white/20 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar cambios
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Footer animado */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
        className="hidden lg:block fixed bottom-0 left-0 w-full z-20 bg-black/80 backdrop-blur-md border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center text-white text-sm">
          © {new Date().getFullYear()} CobraxNet. Todos los derechos reservados.
        </div>
      </motion.footer>

      {/* Bottom Nav para móviles */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30">
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
                onClick={() => setShowForm((prev) => !prev)}
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
            <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={() => setShowEdit(true)} className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-[10px] mt-0.5">Editar</span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Modal de reacciones */}
      {showReactionsModal && (
        <ReactionsModal
          isOpen={!!showReactionsModal}
          postId={showReactionsModal}
          onClose={() => setShowReactionsModal(null)}
          reactions={posts.find(p => p._id === showReactionsModal)?.reactions || []}
          getImageUrl={getImageUrl}
          onRemoveReaction={handleRemoveReaction}
        />
      )}
    </>
  );
};

export default Profile;