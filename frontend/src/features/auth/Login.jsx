import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validar que el correo tenga el dominio @cbtis258.edu.mx
    if (!formData.email.endsWith('@cbtis258.edu.mx')) {
      setError('El correo debe ser del dominio @cbtis258.edu.mx');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/v1/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error de login:', data);
        throw new Error(data.message || 'Error al iniciar sesión');
      }
      localStorage.setItem('token', data.token);
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      {/* Navbar animado */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 w-full z-20 bg-black/70 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/">
            <img src="/logo.png" alt="Logo" className="h-16" />
          </Link>
        </div>
      </motion.nav>

      <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden pt-20 pb-20">
        {/* Fondo animado */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black animate-bgStars z-0"></div>

        {/* Formulario animado */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="relative z-10 bg-white/5 backdrop-blur-md p-10 shadow-2xl w-full max-w-md text-white neon-border"
        >
          <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico (@cbtis258.edu.mx)"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-white"
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-white"
            />

            <div className="flex items-center text-sm">
              <label className="flex items-center">
                <input type="checkbox" className="form-checkbox mr-2 text-white" />
                Recordarme
              </label>
            </div>

            <button type="submit" className="w-full py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition">
              Iniciar sesión
            </button>
          </form>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
          <p className="text-center mt-4 text-sm">
            ¿No tienes una cuenta? <Link to="/register" className="underline hover:text-gray-300">Regístrate</Link>
          </p>
        </motion.div>
      </div>

      {/* Footer animado */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
        className="fixed bottom-0 left-0 w-full z-20 bg-black/70 backdrop-blur-md border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center text-white text-sm">
          © {new Date().getFullYear()} CobraxNet. Todos los derechos reservados.
        </div>
      </motion.footer>
    </>
  );
};

export default Login;
