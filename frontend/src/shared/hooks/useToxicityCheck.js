import { useState, useEffect, useCallback } from 'react';
import * as toxicity from '@tensorflow-models/toxicity';
import { detectarPalabrasProhibidas } from '../utils/palabrasProhibidas';

const THRESHOLD = 0.6; // Umbral de confianza para la detección de toxicidad (más sensible)

export const useToxicityCheck = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar el modelo al montar el componente
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Cargar el modelo con las categorías que queremos detectar
        const loadedModel = await toxicity.load(THRESHOLD, [
          'identity_attack',
          'insult',
          'obscene',
          'severe_toxicity',
          'sexual_explicit',
          'threat',
          'toxicity'
        ]);
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar el modelo:', err);
        setError('No se pudo cargar el detector de contenido inapropiado');
        setLoading(false);
      }
    };

    loadModel();
  }, []);

  // Función para verificar texto
  const checkText = useCallback(async (text) => {
    if (!text.trim()) return { isToxic: false, categories: [] };

    try {
      // Primero verificar palabras prohibidas en español
      const resultadoProhibidas = detectarPalabrasProhibidas(text);
      if (resultadoProhibidas.tieneProhibidas) {
        return {
          isToxic: true,
          categories: resultadoProhibidas.palabrasEncontradas.map(palabra => ({
            category: 'palabra_prohibida',
            probability: 1,
            palabra: palabra
          }))
        };
      }

      // Si no hay palabras prohibidas, usar el modelo de toxicidad
      if (model) {
        const predictions = await model.classify(text);
        const toxicCategories = predictions
          .filter(category => category.results[0].match)
          .map(category => ({
            category: category.label,
            probability: category.results[0].probabilities[1]
          }));

        return {
          isToxic: toxicCategories.length > 0,
          categories: toxicCategories
        };
      }

      return { isToxic: false, categories: [] };
    } catch (err) {
      console.error('Error al analizar texto:', err);
      return { isToxic: false, categories: [], error: err.message };
    }
  }, [model]);

  return {
    checkText,
    loading,
    error
  };
};