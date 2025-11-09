
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import UsersSidebar from '../../shared/components/UsersSidebar';
import RightSidebar from '../../shared/components/RightSidebar';


const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  let currentUserId = null;
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserId = payload.userId;
    }
  } catch {}

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/api/v1/marketplace/${id}`);
        setProduct(res.data);
      } catch (err) {
        setError('Producto no encontrado');
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('¿Seguro que quieres eliminar este producto?')) return;
    try {
      await axios.delete(`http://localhost:3000/api/v1/marketplace/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/marketplace');
    } catch (err) {
      alert('No se pudo eliminar el producto');
    }
  };


  if (loading) return <div className="text-center py-10 text-white">Cargando...</div>;
  if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
  if (!product) return null;

  // Galería: imágenes del producto
  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : ['/logo.png'];

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
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 w-full z-20 bg-black/80 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white bg-blue-600/80 hover:bg-blue-700/90 px-3 sm:px-4 py-2 rounded-full font-semibold shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
        </div>
      </motion.nav>

      {/* Contenido principal */}
      <div className="relative min-h-screen flex flex-col items-center justify-start pt-20 sm:pt-24 pb-24 z-10 mx-4 sm:mx-6 lg:ml-72 lg:mr-72">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-black/80 via-gray-900/80 to-black/90 border border-white/10 rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6 relative overflow-hidden">
            {/* Imagen destacada y miniaturas */}
            <div className="relative w-full flex flex-col items-center mb-2">
              <div className="w-full flex justify-center items-center bg-black/80 rounded-2xl border-2 sm:border-4 border-white/10 shadow-lg h-64 sm:h-80 md:h-96 mb-2 cursor-pointer hover:scale-105 transition-transform duration-300" style={{ maxHeight: 420 }} onClick={() => { setShowImageModal(true); setModalImageIdx(0); }}>
                <img
                  src={typeof images[modalImageIdx] === 'string' ? (images[modalImageIdx].startsWith('http') ? images[modalImageIdx] : `http://localhost:3000${images[modalImageIdx]}`) : '/logo.png'}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain rounded-2xl"
                  style={{ background: 'transparent' }}
                />
              </div>
              <span className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-blue-600/80 text-white px-2 sm:px-3 py-1 rounded-full font-bold text-base sm:text-lg shadow-lg">${product.price}</span>
              {/* Miniaturas */}
              {images.length > 1 && (
                <div className="flex gap-2 mt-2">
                  {images.map((img, idx) => (
                    <img
                      key={idx}
                      src={typeof img === 'string' ? (img.startsWith('http') ? img : `http://localhost:3000${img}`) : '/logo.png'}
                      alt={`miniatura-${idx}`}
                      className={`w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border-2 ${modalImageIdx === idx ? 'border-blue-500' : 'border-white/20'} cursor-pointer transition-transform hover:scale-105`}
                      onClick={() => setModalImageIdx(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Modal de imagen completa con galería y flechas */}
            {showImageModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowImageModal(false)}>
                {/* Flecha izquierda */}
                {images.length > 1 && (
                  <button
                    className="absolute left-10 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 transition"
                    onClick={e => { e.stopPropagation(); setModalImageIdx((modalImageIdx - 1 + images.length) % images.length); }}
                    aria-label="Anterior"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                <img
                  src={typeof images[modalImageIdx] === 'string' ? (images[modalImageIdx].startsWith('http') ? images[modalImageIdx] : `http://localhost:3000${images[modalImageIdx]}`) : '/logo.png'}
                  alt={product.title}
                  className="max-h-[90vh] max-w-[90vw] rounded-2xl border-4 border-white/20 shadow-2xl"
                  onClick={e => e.stopPropagation()}
                />
                {/* Flecha derecha */}
                {images.length > 1 && (
                  <button
                    className="absolute right-10 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 transition"
                    onClick={e => { e.stopPropagation(); setModalImageIdx((modalImageIdx + 1) % images.length); }}
                    aria-label="Siguiente"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
                {/* Cerrar */}
                <button
                  className="absolute top-8 right-8 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 transition"
                  onClick={() => setShowImageModal(false)}
                  aria-label="Cerrar imagen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            {/* Info principal */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 8h14l1 12a2 2 0 01-2 2H6a2 2 0 01-2-2l1-12z" /></svg>
              {product.title}
            </h1>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-gray-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                  {product.description}
                </span>
                <span className="text-gray-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18m-6 5h6" /></svg>
                  Categoría: {product.category}
                </span>
                <span className="text-gray-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  Contacto: {product.contact}
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-2 items-start">
                <span className="text-gray-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14l1 12a2 2 0 01-2 2H6a2 2 0 01-2-2l1-12z" /></svg>
                  Publicado por:
                  {product.seller ? (
                    <Link
                      to={product.seller._id === currentUserId ? "/profile" : `/profile/${product.seller._id}`}
                      className="flex items-center gap-2 group hover:underline"
                    >
                      {product.seller.avatar && product.seller.avatar !== '/uploads/default-avatar.png' ? (
                        <img
                          src={product.seller.avatar.startsWith('http') ? product.seller.avatar : `http://localhost:3000${product.seller.avatar}`}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full object-cover border-2 border-white group-hover:ring-2 group-hover:ring-indigo-400 transition"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white via-gray-400 to-black flex items-center justify-center text-white font-bold text-base border-2 border-white">
                          {product.seller.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <span className="text-white font-semibold">{product.seller.username}</span>
                    </Link>
                  ) : (
                    <span>Usuario</span>
                  )}
                </span>
              </div>
            </div>
            {/* Acciones */}
            {token && product.seller?._id === JSON.parse(atob(token.split('.')[1])).userId && (
              <div className="flex gap-2 mt-6">
                <Link
                  to={`/marketplace/edit/${product._id}`}
                  className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border border-black/20 shadow transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Editar
                </Link>
                <button
                  onClick={handleDelete}
                  className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border border-black/20 shadow transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Eliminar
                </button>
              </div>
            )}
            {/* Detalle visual decorativo */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-2xl z-0"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetail;
