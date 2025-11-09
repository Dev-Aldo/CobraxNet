import React, { useState, useEffect, useRef } from 'react';
import { useState as useLocalState } from 'react';
import MultiMediaUpload from './MultiMediaUpload';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ReactionsModal from './ReactionsModal';
import Notifications from '../notifications/Notifications';
import TermsAndConditions from '../../shared/components/TermsAndConditions';
import PrivacyPolicy from '../../shared/components/PrivacyPolicy';
import UsersSidebar from '../../shared/components/UsersSidebar';
import RightSidebar from '../../shared/components/RightSidebar';
import { useToxicityCheck } from '../../shared/hooks/useToxicityCheck';
import { useNSFWCheck } from '../../shared/hooks/useNSFWCheck';
  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

const API_URL = 'http://localhost:3000/api/v1/posts';

const Home = () => {
  // Carrusel: índice de imagen por post
  const [carouselIndexes, setCarouselIndexes] = useLocalState({});
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', file: null });
  const [mediaFiles, setMediaFiles] = useState([]); // Para archivos multimedia (imágenes, videos, docs)
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
  const [showPicker, setShowPicker] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [editMediaFiles, setEditMediaFiles] = useState([]); // nuevos archivos
  const [editExistingMedia, setEditExistingMedia] = useState([]); // archivos actuales (media)
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  // Estado para la imagen de comentario por post
  const [commentImages, setCommentImages] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [search, setSearch] = useState(""); // Nuevo estado para búsqueda
  const [profile, setProfile] = useState(null);
  const token = localStorage.getItem('token');
  let userId = null;
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId;
    }
  } catch {}
  const [showReactionsModal, setShowReactionsModal] = useState(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersModalData, setUsersModalData] = useState({ profiles: [], loading: false, error: '' });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const mobileMenuRef = useRef(null);
  const [openPostMenu, setOpenPostMenu] = useState(null);
  const postMenuRefs = useRef({});

  const fetchPosts = async () => {
    setLoading(true);
    const res = await fetch(API_URL);
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get('http://localhost:3000/api/v1/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
      } catch (err) {
        // No mostrar error aquí para no interrumpir la Home
      }
    };
    fetchProfile();
  }, []);

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setForm({ ...form, file: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const { checkText, loading: toxicityLoading } = useToxicityCheck();
  const { checkImage, loading: nsfwLoading } = useNSFWCheck();

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
                'toxicity': 'toxicidad'
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
                .filter(p => p.probability > 0.7) // Aumentamos el umbral de detección
                .map(p => {
                  const percent = Math.round(p.probability * 100);
                  return `${p.className} (${percent}%)`;
                })
                .join(', ');
              mostrarNotificacion(`⚠️ Contenido no permitido detectado en la imagen "${file.name}": ${categories}`);
              setMediaFiles([]); // Limpiar los archivos
              return; // Detener el envío
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
      if (form.file) formData.append('file', form.file);
      // Adjuntar archivos multimedia
      mediaFiles.forEach((file) => {
        formData.append('media', file);
      });

      const res = await fetch(API_URL, {
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
      fetchPosts();
    } catch (err) {
      mostrarNotificacion(err.message);
    }
  };

  const handleReact = async (postId, emoji) => {
    const post = posts.find(p => p._id === postId);
    const yaReacciono = post?.reactions?.some(
      r => (r.user?._id || r.user) === userId && r.emoji === emoji
    );
    try {
      if (yaReacciono) {
        await fetch(`${API_URL}/${postId}/reaction`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ emoji }),
        });
      } else {
        await fetch(`${API_URL}/${postId}/reaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ emoji }),
        });
      }
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  // Filtrar posts por búsqueda
  const filteredPosts = posts.filter(
    post =>
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.content.toLowerCase().includes(search.toLowerCase()) ||
      (
        profile &&
        post.author &&
        post.author.username &&
        profile.username &&
        profile.username.toLowerCase().includes(search.toLowerCase()) &&
        ((post.author._id && post.author._id === userId) || (post.author === userId))
      )
  );

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  };

  // Cargar perfiles para el modal de usuarios en móvil
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setUsersModalData(prev => ({ ...prev, loading: true, error: '' }));
        const token = localStorage.getItem('token');
        if (!token) {
          setUsersModalData(prev => ({ ...prev, loading: false }));
          return;
        }
        const res = await axios.get('http://localhost:3000/api/v1/profile/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsersModalData({ profiles: res.data, loading: false, error: '' });
      } catch (e) {
        setUsersModalData({ profiles: [], loading: false, error: 'Error al cargar los perfiles' });
      }
    };
    if (showUsersModal) fetchProfiles();
  }, [showUsersModal]);

  // Cerrar menú móvil al hacer click fuera o presionar Escape
  useEffect(() => {
    if (!showMobileMenu) return;
    const handleClick = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setShowMobileMenu(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowMobileMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showMobileMenu]);

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

  return (
    <>
      {/* Componente de notificación */}
      <Notificacion />

      {/* Panel lateral de usuarios */}
      <UsersSidebar />

      {/* Sidebar derecho */}
      <RightSidebar onLogout={handleLogout} />

      {/* Modal de imagen en pantalla completa */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              className="fixed top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 backdrop-blur-sm"
              onClick={() => setFullscreenImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={fullscreenImage}
              alt="Imagen en pantalla completa"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      
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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          <Link to="/" onClick={e => { e.preventDefault(); window.location.reload(); }}>
            <img src="/logo.png" alt="Logo" className="h-10 sm:h-12 md:h-14 lg:h-16" />
          </Link>
          {/* Barra de búsqueda */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 sm:w-64 md:w-80">
            <input
              type="text"
              placeholder="Buscar publicaciones..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/20 focus:border-white/40 focus:outline-none text-sm sm:text-base"
            />
          </div>
          <div className="flex items-center gap-4">
            {/* Perfil de usuario */}
            {token && profile && (
              <Link to={userId ? `/profile` : "/profile"} className="flex items-center gap-2 group">
                {/* Forzar recarga del avatar con key y comprobación de url */}
                {profile.avatar && profile.avatar !== '/uploads/default-avatar.png' ? (
                  <img
                    key={profile.avatar}
                    src={getImageUrl(profile.avatar)}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover border-2 border-white group-hover:ring-2 group-hover:ring-indigo-400 transition"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xl border-2 border-white">
                    {profile.username?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="hidden md:inline text-white font-semibold">{profile.username}</span>
              </Link>
            )}
            {token && (
              <>
                {/* Botón crear publicación solo en md+ (oculto en móviles) */}
                <button
                  onClick={() => setShowForm((prev) => !prev)}
                  className="hidden md:flex px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {showForm ? 'Cerrar formulario' : 'Crear publicación'}
                </button>
                {/* Menú de 3 puntos solo en móviles */}
                <div className="relative md:hidden">
                  <button
                    onClick={() => setShowMobileMenu((prev) => !prev)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                    aria-label="Abrir menú"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 21a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
                  </button>
                  {showMobileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      ref={mobileMenuRef}
                      className="absolute right-0 mt-2 w-56 bg-black/90 border border-white/10 rounded-xl shadow-xl overflow-hidden z-30"
                    >
                      <button
                        className="w-full text-left px-4 py-3 text-white/90 hover:bg-white/10 flex items-center gap-2"
                        onClick={() => { setShowTerms(true); setShowMobileMenu(false); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Términos y Condiciones
                      </button>
                      <button
                        className="w-full text-left px-4 py-3 text-white/90 hover:bg-white/10 flex items-center gap-2"
                        onClick={() => { setShowPrivacy(true); setShowMobileMenu(false); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                        Política de Privacidad
                      </button>
                      <button
                        className="w-full text-left px-4 py-3 text-white/90 hover:bg-white/10 flex items-center gap-2"
                        onClick={() => { setShowMobileMenu(false); onLogout ? onLogout() : handleLogout(); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
                        Cerrar sesión
                      </button>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.nav>

  {/* Fondo animado negro con estrellas */}
      <div className="fixed inset-0 -z-10 bg-black overflow-hidden will-change-transform">
        <div className="stars transform-gpu"></div>
        <div className="stars2 transform-gpu"></div>
        <div className="stars3 transform-gpu"></div>
      </div>

      {/* Contenido principal */}
  <div className="relative min-h-screen flex flex-col items-center justify-start pt-24 pb-24 z-10 mx-4 sm:mx-6 lg:ml-72 lg:mr-72">
        <div className="w-full max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 text-white">Publicaciones</h1>

          {/* Formulario para crear post */}
          {token && showForm && (
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
              </form>
            </motion.div>
          )}

          {/* Lista de posts */}
          {filteredPosts.length === 0 && !loading ? (
            <p className="text-white/80">No hay publicaciones aún.</p>
          ) : (
            <div className="flex flex-col gap-10">
              {filteredPosts.map((post) => {
                // Agrupar reacciones
                const grouped = {};
                (post.reactions || []).forEach(r => {
                  if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [] };
                  grouped[r.emoji].count++;
                  grouped[r.emoji].users.push(r.user || { username: 'Usuario' });
                });

                const isAuthor = userId && post.author && (post.author._id === userId || post.author === userId);

                // NUEVO: función para mostrar avatar del autor del post
                const authorAvatar = post.author?.avatar && post.author.avatar !== '/uploads/default-avatar.png'
                  ? (
                    <img
                      src={getImageUrl(post.author.avatar)}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover border-2 border-white"
                    />
                  )
                  : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xl border-2 border-white group-hover:ring-2 group-hover:ring-indigo-400 transition">
                      {post.author?.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  );

                return (
                  <div
                    key={post._id}
                    className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden hover:scale-[1.01] transition-transform duration-200 max-w-4xl w-full mx-auto"
                  >
                    {/* Header: usuario, avatar y fecha */}
                    <div className="flex items-center justify-between gap-3 px-8 pt-6 pb-3">
                      <Link
                        to={userId && (post.author?._id === userId || post.author === userId)
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
                          <div className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()} - {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </Link>
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
                                  setEditForm({ title: post.title, content: post.content });
                                  setEditMediaFiles([]);
                                  setEditExistingMedia(Array.isArray(post.media) ? post.media : []);
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
                                  await fetch(`${API_URL}/${post._id}`, {
                                    method: 'DELETE',
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  fetchPosts();
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
                
                    {/* Contenido */}
                    <div className="flex-1 flex flex-col px-8 py-5">
                      {editingPostId === post._id ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData();
                            formData.append('title', editForm.title);
                            formData.append('content', editForm.content);
                            // Adjuntar nuevos archivos
                            editMediaFiles.forEach(file => formData.append('media', file));
                            // Adjuntar los archivos existentes que no se eliminaron
                            formData.append('existingMedia', JSON.stringify(editExistingMedia));

                            const res = await fetch(`${API_URL}/${post._id}`, {
                              method: 'PUT',
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                              body: formData,
                            });
                            if (!res.ok) {
                              const errData = await res.json();
                              setError(errData.message || 'Error al editar el post');
                              return;
                            }
                            setEditingPostId(null);
                            setEditForm({ title: '', content: '' });
                            setEditMediaFiles([]);
                            setEditExistingMedia([]);
                            fetchPosts();
                          }}
                          className="flex flex-col gap-6"
                        >
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
                              value={editForm.title}
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
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
                              value={editForm.content}
                              onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                              required
                              rows="4"
                              className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                                hover:border-white/40 focus:border-white
                                hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                                focus:outline-none placeholder:text-white/40"
                            />
                          </div>
                          {/* Archivos multimedia (edición) */}
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
                          {/* Botones de acción */}
                          <div className="flex gap-3 mt-2">
                            <button
                              type="submit"
                              className="py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-transparent hover:border-black/20 flex-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPostId(null)}
                              className="py-3 bg-black/50 text-white rounded-lg font-semibold hover:bg-black/70 transition-all duration-300 flex items-center justify-center gap-2 border border-white/30 hover:border-white/50 flex-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {/* Contenido normal del post */}
                          <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                          <p className="text-white/90 mb-4 text-lg post-content">{post.content}</p>
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
                                          className="w-full max-h-[500px] object-cover bg-black/30 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => setFullscreenImage(mediaItems[idx].url)}
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
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                              <line x1="9" y1="9" x2="9.01" y2="9"/>
                              <line x1="15" y1="9" x2="15.01" y2="9"/>
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
                        {/* Botón comentar */}
                          <button
                            type="button"
                            className="w-full sm:w-auto px-3 sm:px-4 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-xs sm:text-sm border border-transparent hover:border-black/20 flex items-center justify-center gap-1"
                            onClick={() =>
                              setOpenComments((prev) => ({
                                ...prev,
                                [post._id]: !prev[post._id],
                              }))
                            }
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Comentar
                          </button>
                        {/* Acciones del autor - Solo visible en desktop */}
                        {isAuthor && (
                          <>
                            <button
                              onClick={() => {
                                setEditingPostId(post._id);
                                setEditForm({ title: post.title, content: post.content });
                                setEditMediaFiles([]);
                                setEditExistingMedia(Array.isArray(post.media) ? post.media : []);
                              }}
                              className="hidden md:flex w-full sm:w-auto px-3 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-sm border border-transparent hover:border-black/20 items-center justify-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              Editar
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm('¿Seguro que quieres eliminar este post?')) return;
                                await fetch(`${API_URL}/${post._id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                fetchPosts();
                              }}
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
                                  const isCommentAuthor = userId && (comment.user?._id === userId || comment.user === userId);
                                  const isEditing = editingCommentId === comment._id;

                                  return (
                                    <li key={comment._id} className="bg-white/5 hover:bg-white/10 transition-all duration-200 rounded-lg p-2 shadow-sm">
                                      <div className="flex items-start gap-2">
                                        {/* Avatar del usuario del comentario */}
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
                                                    await fetch(`${API_URL}/${post._id}/comment/${comment._id}`, {
                                                      method: 'PUT',
                                                      headers: {
                                                        'Content-Type': 'application/json',
                                                        Authorization: `Bearer ${token}`,
                                                      },
                                                      body: JSON.stringify({ content: editCommentContent }),
                                                    });
                                                    setEditingCommentId(null);
                                                    setEditCommentContent('');
                                                    fetchPosts();
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
                                            <div>
                                              <p className="text-sm text-white/90 comment-content mb-2" style={{ maxWidth: '100%', width: '100%', wordBreak: 'break-word' }}>{comment.content}</p>
                                              {/* Mostrar imagen del comentario si existe */}
                                              {comment.fileUrl && (
                                                <div className="relative group overflow-hidden rounded-lg hover:shadow-lg transition-all duration-300 bg-black/20 backdrop-blur-sm max-w-[200px]">
                                                  <img
                                                    src={getImageUrl(comment.fileUrl)}
                                                    alt="Imagen del comentario"
                                                    className="max-h-32 w-full object-cover hover:scale-105 transition-transform duration-300 rounded-lg border border-white/10"
                                                    onClick={() => setFullscreenImage(getImageUrl(comment.fileUrl))}
                                                    onError={(e) => {
                                                      console.error('Error al cargar imagen del comentario:', comment.fileUrl);
                                                      e.target.style.display = 'none';
                                                    }}
                                                    style={{ cursor: 'zoom-in' }}
                                                  />
                                                </div>
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
                                                      await fetch(`${API_URL}/${post._id}/comment/${comment._id}`, {
                                                        method: 'DELETE',
                                                        headers: { Authorization: `Bearer ${token}` },
                                                      });
                                                      fetchPosts();
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
                                            </div>
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
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const content = e.target.elements[`comment-${post._id}`].value;
                                const image = commentImages[post._id] || null;
                                if (!content && !image) return;

                                // Verificar contenido del comentario
                                try {
                                  const result = await checkText(content);
                                  if (result.isToxic) {
                                    mostrarNotificacion('⚠️ El contenido del comentario parece ser inapropiado');
                                    return;
                                  }
                                } catch (err) {
                                  console.error('Error al verificar texto:', err);
                                  mostrarNotificacion('Error al verificar el contenido del comentario.');
                                  return;
                                }

                                // Verificar imagen si existe
                                if (image && image.type.startsWith('image/')) {
                                  try {
                                    const nsfwResult = await checkImage(image);
                                    if (nsfwResult.isNSFW) {
                                      const categories = nsfwResult.predictions
                                        .filter(p => p.probability > 0.7)
                                        .map(p => {
                                          const percent = Math.round(p.probability * 100);
                                          return `${p.className} (${percent}%)`;
                                        })
                                        .join(', ');
                                      mostrarNotificacion(`⚠️ Contenido no permitido detectado en la imagen: ${categories}`);
                                      setCommentImages(prev => ({ ...prev, [post._id]: null }));
                                      return;
                                    }
                                  } catch (err) {
                                    console.error('Error al verificar imagen:', err);
                                    mostrarNotificacion('Error al verificar el contenido de la imagen.');
                                    return;
                                  }
                                }

                                const formData = new FormData();
                                formData.append('content', content);
                                if (image) formData.append('image', image);
                                
                                try {
                                  const response = await fetch(`${API_URL}/${post._id}/comment`, {
                                    method: 'POST',
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: formData,
                                  });
                                  
                                  if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.message || 'Error al enviar el comentario');
                                  }
                                  
                                  await fetchPosts();
                                  e.target.reset();
                                  setCommentImages((prev) => ({ ...prev, [post._id]: null }));
                                } catch (error) {
                                  console.error('Error al comentar:', error);
                                  mostrarNotificacion('Error al enviar el comentario: ' + error.message);
                                }
                              }}
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
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de reacciones - Movido fuera del mapeo de posts */}
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

      {/* Modal de Notificaciones para móvil */}
      <Notifications
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />

      {/* Modales de Términos y Privacidad (para menú móvil) */}
      <TermsAndConditions isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {/* Modal de Usuarios para móvil */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowUsersModal(false)}>
          <div className="bg-black/90 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Perfiles de Usuarios
              </div>
              <button className="text-white/70" onClick={() => setShowUsersModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={usersSearch}
                  onChange={e => setUsersSearch(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/20 focus:border-white/40 focus:outline-none text-sm"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="p-4 max-h-[65vh] overflow-y-auto">
              {usersModalData.loading ? (
                <div className="flex justify-center items-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div></div>
              ) : usersModalData.error ? (
                <div className="text-red-400 text-center py-6">{usersModalData.error}</div>
              ) : usersModalData.profiles.length === 0 ? (
                <div className="text-white/70 text-center py-6">No se encontraron perfiles</div>
              ) : (
                <ul className="space-y-3">
                  {usersModalData.profiles
                    .filter(profile => 
                      profile.username?.toLowerCase().includes(usersSearch.toLowerCase()) ||
                      profile.carrera?.toLowerCase().includes(usersSearch.toLowerCase())
                    )
                    .map((profile) => (
                    <li key={profile._id} className="transition-all hover:bg-white/10 rounded-lg p-2">
                      <a href={(function() { try { const token = localStorage.getItem('token'); if (token) { const payload = JSON.parse(atob(token.split('.')[1])); const userId = payload.userId; return userId && profile.user === userId ? '/profile' : `/profile/${profile.user}`; } } catch {} return `/profile/${profile.user}`; })()} className="flex items-center gap-3">
                        {profile.avatar ? (
                          <img src={getImageUrl(profile.avatar)} alt={profile.username} className="w-10 h-10 rounded-full object-cover border border-white/30" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xl border border-white/30">
                            {profile.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{profile.username}</p>
                          {profile.carrera && <p className="text-white/60 text-xs">{profile.carrera}</p>}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
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
            <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={() => setShowUsersModal(true)} className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-2a4 4 0 00-3-3.87M7 20v-2a4 4 0 013-3.87m5-4a4 4 0 11-8 0 4 4 0 018 0zm6 8v-2a4 4 0 00-3-3.87M3 20v-2a4 4 0 013-3.87" /></svg>
              <span className="text-[10px] mt-0.5">Usuarios</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={() => setShowNotificationsModal(true)} className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="text-[10px] mt-0.5">Notifs</span>
            </motion.button>
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
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/groups" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-2a4 4 0 00-3-3.87M7 20v-2a4 4 0 013-3.87m5-4a4 4 0 11-8 0 4 4 0 018 0zm6 8v-2a4 4 0 00-3-3.87M3 20v-2a4 4 0 013-3.87" /></svg>
              <span className="text-[10px] mt-0.5">Grupos</span>
            </motion.a>
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/marketplace" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 8h14l1 12a2 2 0 01-2 2H6a2 2 0 01-2-2l1-12z" /></svg>
              <span className="text-[10px] mt-0.5">Market</span>
            </motion.a>
          </div>
        </div>
      </nav>

      {/* Modal de imagen en pantalla completa */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              className="fixed top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 backdrop-blur-sm"
              onClick={() => setFullscreenImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={fullscreenImage}
              alt="Imagen en pantalla completa"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Home;