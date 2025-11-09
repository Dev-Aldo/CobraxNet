import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import UsersSidebar from '../../shared/components/UsersSidebar';
import RightSidebar from '../../shared/components/RightSidebar';
import Notifications from '../notifications/Notifications';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', isPublic: true, avatar: null });
  const [activeTab, setActiveTab] = useState('all'); // 'all' o 'my'
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  // Estados para modales móviles
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersModalData, setUsersModalData] = useState({ profiles: [], loading: false, error: '' });
  const [usersSearch, setUsersSearch] = useState('');

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  // Obtener todos los grupos
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/v1/groups', {
        headers: { Authorization: `Bearer ${token}` },
        params: { search }
      });
      setGroups(response.data.data.groups);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar los grupos');
      setLoading(false);
    }
  };

  // Obtener mis grupos
  const fetchMyGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/v1/groups/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyGroups(response.data.data);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar tus grupos');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchMyGroups();
  }, [search]);

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

  // Manejar cambios en el formulario de creación
  const handleCreateChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === 'avatar' && files.length > 0) {
      setNewGroup({ ...newGroup, avatar: files[0] });
    } else if (type === 'checkbox') {
      setNewGroup({ ...newGroup, [name]: checked });
    } else {
      setNewGroup({ ...newGroup, [name]: value });
    }
  };

  // Crear un nuevo grupo
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newGroup.name);
      formData.append('description', newGroup.description);
      formData.append('isPublic', newGroup.isPublic);
      if (newGroup.avatar) {
        formData.append('avatar', newGroup.avatar);
      }

      await axios.post('http://localhost:3000/api/v1/groups', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Limpiar formulario y actualizar listas
      setNewGroup({ name: '', description: '', isPublic: true, avatar: null });
      setShowCreateForm(false);
      fetchGroups();
      fetchMyGroups();
    } catch (err) {
      setError('Error al crear el grupo');
    }
  };

  // Unirse a un grupo
  const handleJoinGroup = async (groupId) => {
    try {
      await axios.post(`http://localhost:3000/api/v1/groups/${groupId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroups();
      fetchMyGroups();
    } catch (err) {
      setError('Error al unirse al grupo');
    }
  };

  // Abandonar un grupo
  const handleLeaveGroup = async (groupId) => {
    try {
      await axios.delete(`http://localhost:3000/api/v1/groups/${groupId}/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroups();
      fetchMyGroups();
    } catch (err) {
      setError('Error al abandonar el grupo');
    }
  };

  // Verificar si el usuario es miembro de un grupo
  const isMember = (group) => {
    if (!group || !group.members) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;
      return group.members.some(member => (member.user._id || member.user) === userId);
    } catch {
      return false;
    }
  };

  // Obtener URL de imagen
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  };

  return (
    <>
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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          <Link to="/">
            <img src="/logo.png" alt="Logo" className="h-10 sm:h-12 md:h-14 lg:h-16" />
          </Link>
          {/* Barra de búsqueda */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 sm:w-64 md:w-80">
            <input
              type="text"
              placeholder="Buscar grupos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/20 focus:border-white/40 focus:outline-none text-sm sm:text-base"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowCreateForm(prev => !prev)}
              className="hidden sm:flex px-3 sm:px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition items-center gap-2 text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {showCreateForm ? 'Cancelar' : 'Crear Grupo'}
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

      {/* Contenido principal */}
      <div className="relative min-h-screen flex flex-col items-center justify-start pt-20 sm:pt-24 pb-24 z-10 mx-4 sm:mx-6 lg:ml-72 lg:mr-72">
        <div className="w-full max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-white">Grupos</h1>

          {/* Tabs para alternar entre todos los grupos y mis grupos */}
          <div className="flex mb-6 bg-black/30 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 px-4 rounded-md transition ${activeTab === 'all' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
            >
              Todos los Grupos
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 py-2 px-4 rounded-md transition ${activeTab === 'my' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
            >
              Mis Grupos
            </button>
          </div>

          {/* Formulario para crear grupo */}
          {showCreateForm && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-8 bg-black rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl w-full relative border border-white/30 backdrop-blur-lg overflow-y-auto"
            >
              {/* Encabezado */}
              <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-white/10">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Nuevo Grupo
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                  aria-label="Cerrar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleCreateGroup} className="flex flex-col gap-6">
                {/* Nombre */}
                <div className="flex flex-col gap-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Nombre del Grupo
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Nombre del grupo"
                    value={newGroup.name}
                    onChange={handleCreateChange}
                    required
                    className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                      hover:border-white/40 focus:border-white
                      hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                      focus:outline-none placeholder:text-white/40"
                  />
                </div>
                
                {/* Descripción */}
                <div className="flex flex-col gap-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    placeholder="Describe el propósito del grupo"
                    value={newGroup.description}
                    onChange={handleCreateChange}
                    required
                    rows="4"
                    maxLength={50}
                    className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                      hover:border-white/40 focus:border-white
                      hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                      focus:outline-none placeholder:text-white/40"
                  />
                  <div className="text-right text-xs text-white/60 mt-1">
                    {newGroup.description.length}/50 caracteres
                  </div>
                </div>
                
                {/* Avatar */}
                <div className="flex flex-col gap-2">
                  <label className="block text-white font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Avatar del Grupo
                  </label>
                  <input
                    type="file"
                    name="avatar"
                    onChange={handleCreateChange}
                    accept="image/*"
                    className="px-4 py-3 bg-black/50 text-white rounded-lg border border-white/20 transition-all
                      hover:border-white/40 focus:border-white
                      hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.1)] focus:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]
                      focus:outline-none placeholder:text-white/40 file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0 file:text-sm file:font-semibold
                      file:bg-white file:text-black
                      hover:file:bg-gray-200"
                  />
                </div>
                
                {/* Visibilidad */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="isPublic"
                    id="isPublic"
                    checked={newGroup.isPublic}
                    onChange={handleCreateChange}
                    className="w-5 h-5 rounded border-white/20 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isPublic" className="text-white font-semibold">
                    Grupo Público (cualquiera puede unirse)
                  </label>
                </div>
                
                {/* Botones */}
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
                  >
                    Crear Grupo
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Listado de grupos */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTab === 'all' ? (
                groups.length > 0 ? (
                  groups.map(group => (
                    <motion.div
                      key={group._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    >
                      <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600 overflow-hidden">
                        {group.avatar && (
                          <img 
                            src={getImageUrl(group.avatar)} 
                            alt={group.name} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-2">{group.name}</h3>
                        <p className="text-white/70 mb-4 line-clamp-2">{group.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">
                            {group.members?.length || 0} miembros
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/groups/${group._id}`)}
                              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition"
                            >
                              Ver
                            </button>
                            {isMember(group) ? (
                              <button
                                onClick={() => handleLeaveGroup(group._id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-white rounded transition"
                              >
                                Salir
                              </button>
                            ) : (
                              <button
                                onClick={() => handleJoinGroup(group._id)}
                                className="px-3 py-1 bg-white text-black rounded hover:bg-gray-200 transition"
                              >
                                Unirse
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12 text-white/60">
                    No se encontraron grupos. ¡Crea el primero!
                  </div>
                )
              ) : (
                myGroups.length > 0 ? (
                  myGroups.map(group => (
                    <motion.div
                      key={group._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    >
                      <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600 overflow-hidden">
                        {group.avatar && (
                          <img 
                            src={getImageUrl(group.avatar)} 
                            alt={group.name} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-2">{group.name}</h3>
                        <p className="text-white/70 mb-4 line-clamp-2">{group.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">
                            {group.members?.length || 0} miembros
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/groups/${group._id}`)}
                              className="px-3 py-1 bg-white text-black rounded hover:bg-gray-200 transition"
                            >
                              Ver
                            </button>
                            {group.creator === JSON.parse(atob(token.split('.')[1])).userId ? (
                              <span className="px-3 py-1 bg-purple-500/20 text-white rounded">
                                Creador
                              </span>
                            ) : (
                              <button
                                onClick={() => handleLeaveGroup(group._id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-white rounded transition"
                              >
                                Salir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12 text-white/60">
                    No perteneces a ningún grupo. ¡Únete a uno o crea el tuyo!
                  </div>
                )
              )}
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
                    const getImageUrl = (url) => url?.startsWith('http') ? url : `http://localhost:3000${url}`;
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
                onClick={() => setShowCreateForm(true)}
                className="w-14 h-14 rounded-full bg-white text-black font-bold text-2xl shadow-xl border border-black/10 flex items-center justify-center"
                aria-label="Crear grupo"
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
    </>
  );
};

export default Groups;