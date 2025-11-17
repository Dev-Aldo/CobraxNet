
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import UsersSidebar from '../../shared/components/UsersSidebar';
import RightSidebar from '../../shared/components/RightSidebar';
import { useToxicityCheck } from '../../shared/hooks/useToxicityCheck';
import { useNSFWCheck } from '../../shared/hooks/useNSFWCheck';


const ProductForm = () => {
  const { id } = useParams();
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'General',
    contact: '',
    images: []
  });
  const [originalImages, setOriginalImages] = useState([]); // Imágenes originales del producto
  const [imagesToDelete, setImagesToDelete] = useState([]); // Imágenes a eliminar
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { checkText } = useToxicityCheck();
  const { checkImage } = useNSFWCheck();

  // Estado para notificaciones
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: '' });

  // Mostrar notificación
  const mostrarNotificacion = (mensaje, tipo = 'error') => {
    setNotificacion({ show: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: '' }), 5000);
  };

  useEffect(() => {
    if (id) {
      // Modo edición: cargar datos del producto
      const fetchProduct = async () => {
        try {
          const res = await axios.get(`https://cobraxnet.onrender.com/api/v1/marketplace/${id}`);
          setForm({
            title: res.data.title,
            description: res.data.description,
            price: res.data.price,
            category: res.data.category,
            contact: res.data.contact,
            images: res.data.images || []
          });
          setOriginalImages(res.data.images || []);
        } catch (err) {
          setError('No se pudo cargar el producto');
        }
      };
      fetchProduct();
    }
  }, [id]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Permitir agregar varias imágenes y eliminar individualmente
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Verificar cada imagen por contenido NSFW
    for (const file of files) {
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
            return;
          }
        } catch (err) {
          console.error('Error al verificar imagen:', err);
          mostrarNotificacion('Error al verificar el contenido de la imagen.');
          return;
        }
      }
    }

    // Si todas las imágenes pasan la verificación, agregarlas al formulario
    setForm(prev => ({
      ...prev,
      images: [...(Array.isArray(prev.images) ? prev.images.filter(img => typeof img !== 'string') : []), ...files].slice(0, 5) // máx 5
    }));
  };

  // Eliminar imagen de la previsualización
  const handleRemoveImage = idx => {
    setForm(prev => {
      const img = prev.images[idx];
      // Si es string y está en las originales, marcar para eliminar
      if (typeof img === 'string' && originalImages.includes(img)) {
        setImagesToDelete(prevDel => [...prevDel, img]);
      }
      return {
        ...prev,
        images: prev.images.filter((_, i) => i !== idx)
      };
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Verificar título y descripción por contenido inapropiado
    try {
      const titleResult = await checkText(form.title);
      if (titleResult.isToxic) {
        mostrarNotificacion('⚠️ El título contiene contenido inapropiado');
        setLoading(false);
        return;
      }

      const descriptionResult = await checkText(form.description);
      if (descriptionResult.isToxic) {
        mostrarNotificacion('⚠️ La descripción contiene contenido inapropiado');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error al verificar texto:', err);
      mostrarNotificacion('Error al verificar el contenido del texto');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('price', form.price);
    formData.append('category', form.category);
    formData.append('contact', form.contact);
    // Verificar imágenes nuevas por contenido NSFW
    const newImages = form.images.filter(img => typeof img !== 'string');
    if (newImages.length > 0) {
      try {
        for (const image of newImages) {
          const isNSFW = await checkImage(image);
          if (isNSFW) {
            mostrarNotificacion('⚠️ Una o más imágenes contienen contenido inapropiado');
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error al verificar imágenes:', err);
        mostrarNotificacion('Error al verificar las imágenes');
        setLoading(false);
        return;
      }
    }

    for (let i = 0; i < form.images.length; i++) {
      // Solo archivos nuevos (no strings)
      if (typeof form.images[i] !== 'string') {
        formData.append('images', form.images[i]);
      }
    }
    // Si hay imágenes a eliminar, enviarlas como campo aparte
    if (id && imagesToDelete.length > 0) {
      formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
    }
    try {
      if (id) {
        // Editar producto
        await axios.put(`https://cobraxnet.onrender.com/api/v1/marketplace/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
        });
      } else {
        // Crear producto
        await axios.post('https://cobraxnet.onrender.com/api/v1/marketplace', formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
        });
      }
      navigate('/marketplace');
    } catch (err) {
      setError('No se pudo guardar el producto');
    }
    setLoading(false);
  };

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

      {/* Componente de notificación */}
      {notificacion.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="bg-red-500/20 border border-red-500/50 text-white p-4 rounded-lg flex items-start gap-3 backdrop-blur-sm shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{notificacion.mensaje}</span>
          </div>
        </div>
      )}

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
          {/* Título removido del navbar superior */}
        </div>
      </motion.nav>

      {/* Contenido principal */}
      <div className="relative min-h-screen flex flex-col items-center justify-start pt-20 sm:pt-24 pb-24 z-10 mx-4 sm:mx-6 lg:ml-72 lg:mr-72">
        <div className="w-full max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-black/70 border border-white/10 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6">
            {/* Encabezado visual */}
            <div className="flex items-center gap-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 8h14l1 12a2 2 0 01-2 2H6a2 2 0 01-2-2l1-12z" />
              </svg>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{id ? 'Editar producto' : 'Publicar producto'}</h2>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6M9 12h6m-6 7h6" /></svg>
                Nombre del producto
              </label>
              <input
                type="text"
                name="title"
                placeholder="Ej: Sudadera CBTis, Galletas, Calculadora..."
                value={form.title}
                onChange={handleChange}
                required
                className="px-3 sm:px-4 py-2 sm:py-3 border rounded-lg bg-black/50 text-white border-white/20 placeholder:text-white/40 focus:border-blue-400 focus:outline-none text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                Descripción
              </label>
              <textarea
                name="description"
                placeholder="Describe el producto, estado, detalles, etc."
                value={form.description}
                onChange={handleChange}
                required
                rows={3}
                className="px-3 sm:px-4 py-2 sm:py-3 border rounded-lg bg-black/50 text-white border-white/20 placeholder:text-white/40 focus:border-blue-400 focus:outline-none text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-white font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4" /></svg>
                  Precio
                </label>
                <input
                  type="text"
                  name="price"
                  placeholder="Ej: 50"
                  value={form.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      handleChange(e);
                    }
                  }}
                  required
                  className="px-3 sm:px-4 py-2 sm:py-3 border rounded-lg bg-black/50 text-white border-white/20 placeholder:text-white/40 focus:border-blue-400 focus:outline-none text-sm sm:text-base"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-white font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18m-6 5h6" /></svg>
                  Categoría
                </label>
                <select name="category" value={form.category} onChange={handleChange} className="px-4 py-3 border rounded-lg bg-black/50 text-white border-white/20 focus:border-blue-400 focus:outline-none">
                  <option value="General">General</option>
                  <option value="Comida">Comida</option>
                  <option value="Ropa">Ropa</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Libros">Libros</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Contacto
              </label>
              <input
                type="text"
                name="contact"
                placeholder="WhatsApp, correo, etc."
                value={form.contact}
                onChange={handleChange}
                required
                className="px-3 sm:px-4 py-2 sm:py-3 border rounded-lg bg-black/50 text-white border-white/20 placeholder:text-white/40 focus:border-blue-400 focus:outline-none text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Imágenes
                <span className="text-xs text-gray-400">(máx. 5)</span>
              </label>
              <input
                type="file"
                name="images"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="px-4 py-3 border rounded-lg bg-black/50 text-white border-white/20 focus:border-blue-400 focus:outline-none"
              />
              {/* Previsualización de imágenes */}
              <div className="flex gap-2 flex-wrap mt-2">
                {form.images && form.images.length > 0 && Array.from(form.images).map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={typeof img === 'string' ? (img.startsWith('http') ? img : `https://cobraxnet.onrender.com${img}`) : URL.createObjectURL(img)}
                      alt="preview"
                      className="w-20 h-20 object-cover rounded-lg border border-white/20 shadow group-hover:opacity-80"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center shadow hover:bg-red-800 transition"
                      title="Eliminar imagen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all text-lg mt-2">
              {loading ? 'Guardando...' : id ? 'Guardar cambios' : 'Publicar'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ProductForm;
