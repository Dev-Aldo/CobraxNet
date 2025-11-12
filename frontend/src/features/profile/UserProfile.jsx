import React, { useEffect, useState } from 'react';
// import axios from 'axios';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import UsersSidebar from '../../shared/components/UsersSidebar';

import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import ReactionsModal from '../posts/ReactionsModal';
import axios from 'axios';

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  // Estados para posts
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostForm, setEditPostForm] = useState({ title: '', content: '', image: null });
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [commentImages, setCommentImages] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [showReactionsModal, setShowReactionsModal] = useState(null);

  // Obtener el ID del usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No hay token disponible');
          return;
        }
        

        
        // Corregir la URL para obtener el perfil del usuario actual
        const res = await axios.get('https://cobraxnet.onrender.com/api/v1/profile/me', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        

        
        // Obtener el ID del usuario desde la respuesta del perfil
        // El perfil contiene el campo 'user' que es el ID del usuario
        const userIdFromResponse = res.data?.user || res.data?._id;
        if (userIdFromResponse) {

          setCurrentUserId(userIdFromResponse);
        } else {
          console.error('No se pudo obtener el ID del usuario de la respuesta');
        }
      } catch (err) {
        console.error('Error obteniendo usuario actual:', err);
      }
    };
    
    getCurrentUser();
  }, []);

  // Obtener los posts del usuario visitado
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!userId) return;
      try {
        setPostsLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`https://cobraxnet.onrender.com/api/v1/posts/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(response.data.posts);
      } catch (err) {
        setPostsError('Error al cargar las publicaciones');
      } finally {
        setPostsLoading(false);
      }
    };
    fetchUserPosts();
  }, [userId]);

  // Cargar perfil y verificar estado de amistad
  useEffect(() => {
    console.log('useEffect ejecutándose, userId:', userId, 'currentUserId:', currentUserId);
    
    const fetchProfile = async () => {
      if (!userId) {
        console.log('No hay userId, saliendo...');
        return;
      }
      
      try {
        console.log('Iniciando carga del perfil...');
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('No hay token de autenticación');
          setError('No estás autenticado');
          return;
        }
        
        console.log('Solicitando perfil para el usuario ID:', userId);
        // Cargar perfil del usuario
        const res = await axios.get(`https://cobraxnet.onrender.com/api/v1/profile/${userId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Respuesta del servidor:', res);
        
        if (res.data) {
          console.log('Perfil cargado:', res.data);
          setProfile(res.data);
        } else {
          console.error('No se recibieron datos del perfil');
          setError('No se encontró el perfil solicitado');
        }
      } catch (err) {
        console.error('Error cargando perfil:', err);
        console.error('Detalles del error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(`Error al cargar el perfil: ${err.response?.data?.message || err.message}`);
      } finally {
        console.log('Finalizando carga del perfil');
        setLoading(false);
      }
    };
    
    fetchProfile().catch(err => {
      console.error('Error inesperado en fetchProfile:', err);
      setError('Ocurrió un error inesperado');
      setLoading(false);
    });
    
    // Limpiar el perfil cuando el componente se desmonte o cambie el userId
    return () => {
      console.log('Limpiando perfil...');
      setProfile(null);
      setLoading(true);
      setError('');
    };
  }, [userId, currentUserId]);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://cobraxnet.onrender.com${url}`;
  };

  // Funciones para reacciones y comentarios (idénticas a Profile.jsx, adaptadas)
  const handleReact = async (postId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`https://cobraxnet.onrender.com/api/v1/posts/${postId}/reaction`, 
        { emoji },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      // Actualizar los posts después de reaccionar
      if (userId) {
        const response = await axios.get(`https://cobraxnet.onrender.com/api/v1/posts/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(response.data.posts);
      }
    } catch (err) {
      // Manejo simple
    }
  };

  const handleRemoveReaction = async (postId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://cobraxnet.onrender.com/api/v1/posts/${postId}/reaction`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { emoji }
      });
      if (userId) {
        const response = await axios.get(`https://cobraxnet.onrender.com/api/v1/posts/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(response.data.posts);
      }
    } catch (err) {}
  };

  const handleAddComment = async (postId, content) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', content);
      if (commentImages[postId]) formData.append('image', commentImages[postId]);
      await axios.post(`https://cobraxnet.onrender.com/api/v1/posts/${postId}/comment`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (userId) {
        const response = await axios.get(`https://cobraxnet.onrender.com/api/v1/posts/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(response.data.posts);
      }
      setCommentImages((prev) => ({ ...prev, [postId]: null }));
    } catch (err) {}
  };

  // Agrupar reacciones por emoji
  const groupReactions = (reactions) => {
    const grouped = {};
    (reactions || []).forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user || { username: 'Usuario' });
    });
    return grouped;
  };

  // Saber si el usuario actual es el autor del post
  const isPostAuthor = (post) => {
    if (!currentUserId || !post.author) return false;
    
    // Obtener el ID del autor del post, manejando diferentes formatos
    let postAuthorId = post.author._id || post.author;
    
    // Si el ID del autor es un objeto, intentar extraer el ID
    if (postAuthorId && typeof postAuthorId === 'object') {
      postAuthorId = postAuthorId._id || postAuthorId.id || postAuthorId;
    }
    
    // Convertir a string para comparación segura
    const postAuthorIdStr = postAuthorId?.toString();
    const currentUserIdStr = currentUserId?.toString();
    
    const isAuthor = postAuthorIdStr && currentUserIdStr && (postAuthorIdStr === currentUserIdStr);
    
    return isAuthor;
  };

  if (loading) return <div className="text-center mt-8 text-white">Cargando perfil...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;
  if (!profile) return <div className="text-center mt-8 text-red-500">Perfil no encontrado</div>;

  return (
    <>
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
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            {/* Espacio para el avatar */}
            <div className="h-20" />
            {/* Nombre de usuario */}
            <div className="font-bold text-3xl text-white text-center mt-4">
              {profile.username}
            </div>
            
            {/* Indicador de perfil propio o botón de chat */}
            {userId === currentUserId ? (
              <div className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold">
                Este es tu perfil
              </div>
            ) : (
              <Link
                to={`/chat/${userId}`}
                className="mt-4 px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition flex items-center gap-2 border border-black"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chatear
              </Link>
            )}
          </div>
          {/* Sección de información y biografía */}
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

                <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition group border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-white/60">Miembro desde</div>
                      <div className="text-lg font-semibold text-white group-hover:text-white/80 transition">
                        {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : '---'}
                      </div>
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
                  {profile.biography || 'Este usuario aún no ha agregado una biografía.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      {/* Publicaciones del usuario */}
      <div className="w-full mt-8 flex justify-center">
        <div className="bg-black/40 border border-white/30 rounded-2xl shadow-lg p-6 backdrop-blur-sm max-w-4xl w-full mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Publicaciones
          </h2>
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
                  <div className="flex items-center gap-3 mb-4">
                    {post.author?.avatar && post.author.avatar !== '/uploads/default-avatar.png' ? (
                      <img
                        src={getImageUrl(post.author.avatar)}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xl border-2 border-white group-hover:ring-2 group-hover:ring-indigo-400 transition">
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
                          // Aquí deberías implementar la función para guardar la edición
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
                      {post.imageUrl && (
                        <img
                          src={post.imageUrl}
                          alt="Imagen del post"
                          className="w-full max-h-[500px] object-cover bg-black/30 mt-2 mb-4 rounded-lg"
                        />
                      )}
                    </>
                  )}
                  {/* Botones de acción */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {/* Botón de Reacciones */}
                    <button
                      type="button"
                      className="px-4 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-sm flex items-center gap-2 border border-transparent hover:border-black/20"
                      onClick={() => setShowReactionsModal(post._id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.9 9A5 5 0 0 0 13 5H9.27a7 7 0 0 1 .66 12h3a8 8 0 0 0 7.61-5.96A5 5 0 0 0 14.9 9Z"/>
                        <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>
                      </svg>
                      <span>Reacciones</span>
                      {Object.keys(grouped).length > 0 && (
                        <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs">
                          {Object.values(grouped).reduce((acc, curr) => acc + curr.count, 0)}
                        </span>
                      )}
                    </button>
                    {/* Botón para agregar reacción */}
                    <button
                      type="button"
                      className="ml-2 px-2 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition border border-transparent hover:border-black/20"
                      onClick={() => setShowPicker(showPicker === post._id ? null : post._id)}
                      title="Agregar reacción"
                    >
                      +
                    </button>
                    {/* Emoji picker */}
                    {showPicker === post._id && (
                      <div className="absolute z-50 mt-2">
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
                      className="px-3 py-1 rounded-full bg-white text-black hover:bg-gray-200 transition text-sm border border-transparent hover:border-black/20"
                      onClick={() =>
                        setOpenComments((prev) => ({
                          ...prev,
                          [post._id]: !prev[post._id],
                        }))
                      }
                    >
                      Comentar
                    </button>
                  </div>
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
                              // Obtener el ID del usuario del comentario, manejando diferentes formatos
                              let commentUserId = comment.user?._id || comment.user;
                              
                              // Si el ID del comentario es un objeto, intentar extraer el ID
                              if (commentUserId && typeof commentUserId === 'object') {
                                commentUserId = commentUserId._id || commentUserId.id || commentUserId;
                              }
                              
                              // Convertir a string para comparación segura
                              const commentUserIdStr = commentUserId?.toString();
                              const currentUserIdStr = currentUserId?.toString();
                              
                              // Verificar si el usuario actual es el autor del comentario
                              // Comparamos los IDs como strings para evitar problemas de tipo
                              const isCommentAuthor = currentUserIdStr && commentUserIdStr && (commentUserIdStr === currentUserIdStr);
                              
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
                                                  `https://cobraxnet.onrender.com/api/v1/posts/${post._id}/comment/${comment._id}`,
                                                  { content: editCommentContent },
                                                  { headers: { Authorization: `Bearer ${token}` }}
                                                );
                                                setEditingCommentId(null);
                                                setEditCommentContent('');
                                                // Refrescar posts
                                                const response = await axios.get(`https://cobraxnet.onrender.com/api/v1/posts/user/${userId}`, {
                                                  headers: { Authorization: `Bearer ${token}` }
                                                });
                                                setPosts(response.data.posts);
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
                                          {comment.imageUrl && (
                                            <img
                                              src={getImageUrl(comment.imageUrl)}
                                              alt="Imagen del comentario"
                                              className="max-h-40 rounded-lg mt-2 border border-white/20"
                                            />
                                          )}
                                          {/* Mostrar botones de editar/eliminar si el usuario es autor del comentario */}
                                          {isCommentAuthor ? (
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
                                                    `https://cobraxnet.onrender.com/api/v1/posts/${post._id}/comment/${comment._id}`,
                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                  );
                                                  // Refrescar posts
                                                  const response = await axios.get(`https://cobraxnet.onrender.com/api/v1/posts/user/${userId}`, {
                                                    headers: { Authorization: `Bearer ${token}` }
                                                  });
                                                  setPosts(response.data.posts);
                                                }}
                                                className="bg-white text-black px-2 py-1 rounded hover:bg-gray-200 transition text-xs flex items-center gap-1 font-medium border border-transparent hover:border-black/20"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                Eliminar
                                              </button>
                                            </div>
                                          ) : null}
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

      {/* Bottom Nav para móviles (copiado de Profile.jsx para mantener la misma interfaz) */}
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
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/notifications" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-[10px] mt-0.5">Notificaciones</span>
            </motion.a>
          </div>
        </div>
      </nav>

      {/* Modal simple para crear publicación (solo UI) */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black/80 rounded-xl p-6 w-full max-w-md border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">Crear publicación</h3>
              <button className="text-white/80" onClick={() => setShowForm(false)}>Cerrar</button>
            </div>
            <p className="text-white/70">La creación de publicaciones está disponible en tu propio perfil.</p>
          </motion.div>
        </div>
      )}

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

export default UserProfile;
