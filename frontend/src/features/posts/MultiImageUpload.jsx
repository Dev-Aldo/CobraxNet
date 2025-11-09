import React, { useRef } from 'react';

const MultiImageUpload = ({ images, setImages }) => {
  const fileInputRef = useRef();

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    // Solo aceptar imágenes
    const validImages = files.filter(file => file.type.startsWith('image/'));
    setImages(prev => [...prev, ...validImages]);
  };

  const handleRemove = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-white font-semibold flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Imágenes
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesChange}
      />
      <button
        type="button"
        className="px-4 py-2 bg-black/50 text-white rounded-lg border border-white/20 hover:border-white/40 transition"
        onClick={() => fileInputRef.current.click()}
      >
        Seleccionar imágenes
      </button>
      <div className="flex flex-wrap gap-3 mt-2">
        {images.map((img, idx) => (
          <div key={idx} className="relative group">
            <img
              src={URL.createObjectURL(img)}
              alt={`preview-${idx}`}
              className="w-24 h-24 object-cover rounded-lg border border-white/20 shadow"
            />
            <button
              type="button"
              className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 text-xs opacity-80 group-hover:opacity-100"
              onClick={() => handleRemove(idx)}
              title="Quitar imagen"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiImageUpload;
