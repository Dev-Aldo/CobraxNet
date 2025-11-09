import React, { useRef, useState } from 'react';
import { useNSFWCheck } from '../../shared/hooks/useNSFWCheck';

const MultiMediaUpload = ({ files, setFiles }) => {
  const fileInputRef = useRef();
  const [error, setError] = useState('');
  const { checkImage } = useNSFWCheck();

  const handleFilesChange = async (e) => {
    setError('');
    const newFiles = Array.from(e.target.files);
    
    // Verificar cada imagen antes de agregarla
    for (const file of newFiles) {
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
            setError(`⚠️ No se permite subir la imagen "${file.name}": ${categories}`);
            return;
          }
        } catch (err) {
          console.error('Error al verificar imagen:', err);
          setError('Error al verificar el contenido de la imagen');
          return;
        }
      }
    }
    
    // Solo agregar los archivos si pasaron la verificación
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemove = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const getPreview = (file) => {
    if (file.type.startsWith('image/')) {
      return <img src={URL.createObjectURL(file)} alt={file.name} className="w-24 h-24 object-cover rounded-lg border border-white/20 shadow" />;
    }
    if (file.type.startsWith('video/')) {
      return <video src={URL.createObjectURL(file)} controls className="w-24 h-24 object-cover rounded-lg border border-white/20 shadow" />;
    }
    return (
      <div className="flex flex-col items-center justify-center w-24 h-24 bg-white/10 rounded-lg border border-white/20 shadow text-xs text-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6c-1.1 0-2 .9-2 2zm7 1.5V9h5.5L13 5.5z" /></svg>
        {file.name}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-white font-semibold flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Archivos adjuntos
      </label>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesChange}
      />
      <button
        type="button"
        className="px-4 py-2 bg-black/50 text-white rounded-lg border border-white/20 hover:border-white/40 transition"
        onClick={() => fileInputRef.current.click()}
      >
        Seleccionar archivos
      </button>
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-white p-4 rounded-lg flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-2">
        {files.map((file, idx) => (
          <div key={idx} className="relative group">
            {getPreview(file)}
            <button
              type="button"
              className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 text-xs opacity-80 group-hover:opacity-100"
              onClick={() => handleRemove(idx)}
              title="Quitar archivo"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiMediaUpload;
