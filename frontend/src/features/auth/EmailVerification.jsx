import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Caché para tokens verificados
const verifiedTokens = new Set();

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verificando tu correo electrónico...');

  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const verifyEmail = async () => {
      // Si no hay token o ya fue verificado, no intentamos de nuevo
      if (!token || verifiedTokens.has(token)) {
        setStatus('success');
        setMessage('Tu cuenta ya ha sido verificada. Redirigiendo al login...');
        timeoutId = setTimeout(() => {
          if (isMounted) {
            navigate('/login');
          }
        }, 3000);
        return;
      }

      // Marcar como verificado para evitar intentos múltiples
      verifiedTokens.add(token);

      try {
        const response = await axios.get(`http://localhost:3000/api/v1/users/verify/${token}`);
        
        if (isMounted) {
          setStatus('success');
          setMessage('¡Tu correo electrónico ha sido verificado con éxito!');
          
          // Redireccionar al login después de 3 segundos
          timeoutId = setTimeout(() => {
            if (isMounted) {
              navigate('/login');
            }
          }, 3000);
        }
      } catch (error) {
        if (isMounted) {
          // Si el error es 400 (Bad Request), probablemente el token ya fue usado
          if (error.response?.status === 400) {
            setStatus('success');
            setMessage('Tu cuenta ya ha sido verificada. Redirigiendo al login...');
            timeoutId = setTimeout(() => {
              if (isMounted) {
                navigate('/login');
              }
            }, 3000);
          } else {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Error al verificar el correo electrónico');
          }
        }
      }
    };

    verifyEmail();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [token, hasAttemptedVerification, navigate]); // Incluimos hasAttemptedVerification como dependencia

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-black/50 backdrop-blur-lg rounded-xl border border-white/10">
        <div className="text-center">
          {status === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-white mb-2">Verificando</h2>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="bg-green-500/20 border border-green-500/50 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                <svg className="w-full h-full text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">¡Verificación Exitosa!</h2>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="bg-red-500/20 border border-red-500/50 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                <svg className="w-full h-full text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Error de Verificación</h2>
            </>
          )}
          
          <p className="text-gray-300">{message}</p>
          
          {status === 'error' && (
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
            >
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
