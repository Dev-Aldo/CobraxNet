import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const ReactionsModal = ({ isOpen, onClose, reactions, getImageUrl, postId, onRemoveReaction }) => {
  // Estado para almacenar el ID del usuario actual
  const [currentUserId, setCurrentUserId] = useState(null);

  // Obtener el ID del usuario actual del token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
      } catch (error) {
        console.error('Error al decodificar el token:', error);
      }
    }
  }, []);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Agrupar reacciones por emoji
  const groupedReactions = {};
  reactions.forEach(reaction => {
    if (!groupedReactions[reaction.emoji]) {
      groupedReactions[reaction.emoji] = [];
    }
    // Asegurarse de que el usuario tenga toda la información necesaria
    if (reaction.user) {
      groupedReactions[reaction.emoji].push(reaction.user);
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-md mx-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Reacciones</h3>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <div key={emoji} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-white/80">{users.length} reacciones</span>
                    {/* Solo mostrar el botón de eliminar si la reacción es del usuario actual */}
                    {reactions.some(r => r.emoji === emoji && (r.user?._id === currentUserId || r.user === currentUserId)) && (
                      <button 
                        onClick={() => onRemoveReaction && onRemoveReaction(postId, emoji)}
                        className="ml-auto bg-black text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-800 transition-colors"
                        title="Eliminar reacción"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {users.map(user => {
                      const isCurrentUser = user._id === currentUserId;
                      return (
                        <div key={user._id} className="relative">
                          <Link
                            to={isCurrentUser ? "/profile" : `/profile/${user._id}`}
                            className="flex items-center gap-3 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition block"
                          >
                            {user.avatar && user.avatar !== '/uploads/default-avatar.png' ? (
                              <img
                                src={getImageUrl(user.avatar)}
                                alt="Avatar"
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
                                onError={e => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-lg">
                                {user.username?.[0]?.toUpperCase() || "U"}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-white font-medium">{user.username}</span>
                              <span className="text-xs text-white/60">Reaccionó con {emoji}</span>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReactionsModal;