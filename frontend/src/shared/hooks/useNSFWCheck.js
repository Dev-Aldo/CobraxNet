import { useState, useEffect, useCallback } from 'react';
import * as nsfwjs from 'nsfwjs';

export const useNSFWCheck = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar el modelo al montar el componente
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Cargar el modelo NSFW
        const loadedModel = await nsfwjs.load();
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar el modelo NSFW:', err);
        setError('No se pudo cargar el detector de imágenes inapropiadas');
        setLoading(false);
      }
    };

    loadModel();
  }, []);

  // Función para verificar una imagen
  const checkImage = useCallback(async (file) => {
    if (!model || !file) return { isNSFW: false, predictions: [] };

    try {
      // Crear una URL temporal para la imagen
      const imageUrl = URL.createObjectURL(file);
      
      // Cargar la imagen
      const image = await loadImage(imageUrl);
      
      // Clasificar la imagen
      const predictions = await model.classify(image);
      
      // Limpiar la URL temporal
      URL.revokeObjectURL(imageUrl);

      // Filtrar predicciones relevantes (NSFW)
      const nsfwPredictions = predictions.filter(p => 
        ['Porn', 'Hentai', 'Sexy'].includes(p.className) && 
        p.probability > 0.5
      );

      return {
        isNSFW: nsfwPredictions.length > 0,
        predictions: nsfwPredictions
      };
    } catch (err) {
      console.error('Error al analizar imagen:', err);
      return { isNSFW: false, predictions: [], error: err.message };
    }
  }, [model]);

  // Función auxiliar para cargar una imagen
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  return {
    checkImage,
    loading,
    error
  };
};
