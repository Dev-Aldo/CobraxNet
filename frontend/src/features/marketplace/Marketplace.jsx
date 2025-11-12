
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import UsersSidebar from '../../shared/components/UsersSidebar';
import RightSidebar from '../../shared/components/RightSidebar';
import Notifications from '../notifications/Notifications';

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  // Estados para modales móviles
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersModalData, setUsersModalData] = useState({ profiles: [], loading: false, error: '' });
  const [usersSearch, setUsersSearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://cobraxnet.onrender.com/api/v1/marketplace', {
        params: { category, search }
      });
      setProducts(res.data.products);
    } catch (err) {
      setError('Error al cargar productos');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, [category]);

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
        const res = await axios.get('https://cobraxnet.onrender.com/api/v1/profile/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsersModalData({ profiles: res.data, loading: false, error: '' });
      } catch (e) {
        setUsersModalData({ profiles: [], loading: false, error: 'Error al cargar los perfiles' });
      }
    };
    if (showUsersModal) fetchProfiles();
  }, [showUsersModal]);

  // Fondo animado y sidebars
  return (
    <>
      <UsersSidebar />
      <RightSidebar />

      {/* Fondo animado negro con estrellas */}
      <div className="fixed inset-0 -z-10 bg-black overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Navbar superior */}
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
          <Link to="/">
            <img src="/logo.png" alt="Logo" className="h-10 sm:h-12 md:h-14 lg:h-16" />
          </Link>
          {/* Barra de búsqueda */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 sm:w-64 md:w-80">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/20 focus:border-white/40 focus:outline-none text-sm sm:text-base"
            />
          </div>
          <Link to="/marketplace/new" className="hidden lg:flex bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold items-center gap-2 transition-all text-sm sm:text-base">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Publicar producto
          </Link>
        </div>
      </motion.nav>

      {/* Contenido principal */}
      <div className="relative min-h-screen flex flex-col items-center justify-start pt-20 sm:pt-24 pb-24 z-10 mx-4 sm:mx-6 lg:ml-72 lg:mr-72">
        <div className="w-full max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-white">Marketplace Escolar</h1>
          <div className="flex gap-4 mb-6">
            <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 sm:px-4 py-2 border rounded-lg bg-black/50 text-white border-white/20 text-sm sm:text-base w-full sm:w-auto">
              <option value="">Todas las categorías</option>
              <option value="General">General</option>
              <option value="Comida">Comida</option>
              <option value="Ropa">Ropa</option>
              <option value="Electrónica">Electrónica</option>
              <option value="Libros">Libros</option>
            </select>
          </div>
          {loading ? (
            <div className="text-center py-10 text-white">Cargando productos...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-10">{error}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-white">No hay productos publicados.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {products.filter(product =>
                product.title.toLowerCase().includes(search.toLowerCase()) ||
                product.description.toLowerCase().includes(search.toLowerCase())
              ).map(product => (
                <Link to={`/marketplace/${product._id}`} key={product._id} className="bg-black/70 border border-white/10 rounded-2xl shadow-xl hover:shadow-2xl transition-all p-3 sm:p-4 flex flex-col group overflow-hidden">
                  <img src={product.images?.[0] || '/logo.png'} alt={product.title} className="h-48 sm:h-60 w-full object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform duration-300" />
                  <h2 className="text-base sm:text-lg font-bold text-white mb-1 truncate">{product.title}</h2>
                  <p className="text-gray-300 mb-2 line-clamp-2 text-sm sm:text-base">{product.description}</p>
                  <span className="text-blue-400 font-bold text-lg sm:text-xl mb-2">${product.price}</span>
                  <span className="text-xs text-gray-400">Publicado por: {product.seller?.username || 'Usuario'}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Notificaciones para móvil */}
      <Notifications
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />

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
            <div className="p-4 max-h-[65vh] overflow-y-auto">
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={usersSearch}
                  onChange={e => setUsersSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20 focus:border-white/40 focus:outline-none text-sm"
                />
              </div>
              {usersModalData.loading ? (
                <div className="flex justify-center items-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div></div>
              ) : usersModalData.error ? (
                <div className="text-red-400 text-center py-6">{usersModalData.error}</div>
              ) : usersModalData.profiles.length === 0 ? (
                <div className="text-white/70 text-center py-6">No se encontraron perfiles</div>
              ) : (
                <ul className="space-y-3">
                  {usersModalData.profiles
                    .filter((profileData) => {
                      const q = usersSearch.toLowerCase();
                      return (profileData.username || '').toLowerCase().includes(q) || (profileData.carrera || '').toLowerCase().includes(q);
                    })
                    .map((profileData) => {
                    const getImageUrl = (url) => url?.startsWith('http') ? url : `https://cobraxnet.onrender.com${url}`;
                    const token = localStorage.getItem('token');
                    let profileLink = `/profile/${profileData.user}`;
                    try {
                      if (token) {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const userId = payload.userId;
                        if (userId && profileData.user === userId) {
                          profileLink = '/profile';
                        }
                      }
                    } catch {}
                    return (
                      <li key={profileData._id} className="transition-all hover:bg-white/10 rounded-lg p-2">
                        <a href={profileLink} className="flex items-center gap-3">
                          {profileData.avatar ? (
                            <img src={getImageUrl(profileData.avatar)} alt={profileData.username} className="w-10 h-10 rounded-full object-cover border border-white/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xl border border-white/30">
                              {profileData.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{profileData.username}</p>
                            {profileData.carrera && <p className="text-white/60 text-xs">{profileData.carrera}</p>}
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav para móviles */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30">
        <div className="relative mx-auto max-w-3xl">
          <div className="bg-black/80 backdrop-blur-md border-t border-white/10 h-16 px-4 flex items-center justify-between">
            <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={() => setShowUsersModal(true)} className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-2a4 4 0 00-3-3.87M7 20v-2a4 4 0 013-3.87m5-4a4 4 0 11-8 0 4 4 0 018 0zm6 8v-2a4 4 0 00-3-3.87M3 20v-2a4 4 0 013-3.87" />
              </svg>
              <span className="text-[10px] mt-0.5">Usuarios</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={() => setShowNotificationsModal(true)} className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-[10px] mt-0.5">Notifs</span>
            </motion.button>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <Link to="/marketplace/new">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.6)', '0 0 0 12px rgba(255,255,255,0)'] }}
                  transition={{ repeat: Infinity, duration: 3.6, ease: 'easeOut' }}
                  className="w-14 h-14 rounded-full bg-white text-black font-bold text-2xl shadow-xl border border-black/10 flex items-center justify-center"
                  aria-label="Crear producto"
                >
                  +
                </motion.button>
              </Link>
            </div>
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/groups" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-2a4 4 0 00-3-3.87M7 20v-2a4 4 0 013-3.87m5-4a4 4 0 11-8 0 4 4 0 018 0zm6 8v-2a4 4 0 00-3-3.87M3 20v-2a4 4 0 013-3.87" />
              </svg>
              <span className="text-[10px] mt-0.5">Grupos</span>
            </motion.a>
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] mt-0.5">Inicio</span>
            </motion.a>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Marketplace;
