import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const UsersSidebar = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('http://localhost:3000/api/v1/profile/all', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setProfiles(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error al cargar los perfiles');
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  };

  // Filtrar perfiles según el término de búsqueda
  const filteredProfiles = profiles.filter(profile => 
    profile.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.carrera?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-black/80 backdrop-blur-md border-r border-white/10 pt-24 pb-16 overflow-y-auto">
      <div className="px-4">
        <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Perfiles de Usuarios
        </h2>
        
        {/* Barra de búsqueda */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar perfiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-white/20 text-white placeholder-white border border-white/20 focus:border-white/40 focus:outline-none pl-10"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : error ? (
          <div className="text-red-400 text-center">{error}</div>
        ) : (
          <ul className="space-y-3">
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => (
                <li key={profile._id} className="transition-all hover:bg-white/10 rounded-lg p-2">
                  <Link
                    to={(() => {
                      const token = localStorage.getItem('token');
                      let userId = null;
                      try {
                        if (token) {
                          const payload = JSON.parse(atob(token.split('.')[1]));
                          userId = payload.userId;
                        }
                      } catch {}
                      return userId && profile.user === userId ? '/profile' : `/profile/${profile.user}`;
                    })()}
                    className="flex items-center gap-3"
                  >
                    {profile.avatar ? (
                      <img
                        src={getImageUrl(profile.avatar)}
                        alt={profile.username}
                        className="w-10 h-10 rounded-full object-cover border border-white/30"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'http://localhost:3000/uploads/default-avatar.svg';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-xl border border-white/30">
                        {profile.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{profile.username}</p>
                      {profile.carrera && (
                        <p className="text-white/60 text-xs">{profile.carrera}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))
            ) : (
              <div className="text-white/70 text-center py-4">No se encontraron perfiles</div>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UsersSidebar;