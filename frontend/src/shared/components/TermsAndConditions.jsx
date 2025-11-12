import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const TermsAndConditions = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex flex-col z-50">
      {/* Nav superior */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full bg-black/80 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative">
          <Link to="/" onClick={e => { e.preventDefault(); window.location.reload(); }}>
            <img src="/logo.png" alt="Logo" className="h-16" />
          </Link>
          <div className="flex-1"></div> {/* Espaciador flexible */}
          <div className="text-white text-xl font-semibold pr-4">Términos y Condiciones</div>
        </div>
      </motion.nav>

      {/* Contenido principal */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-lg max-w-2xl w-full mx-4 max-h-[calc(100vh-100px)] overflow-y-auto border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-6">Términos y Condiciones</h2>
        
        <div className="space-y-4 text-gray-300">
          <section>
            <h3 className="text-xl font-semibold text-white mb-2">1. Aceptación de los Términos</h3>
            <p>Al acceder y utilizar esta red social, aceptas estar sujeto a estos términos y condiciones de uso. Si no estás de acuerdo con alguno de estos términos, te pedimos que no utilices nuestros servicios.</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-2">2. Uso del Servicio</h3>
            <p>Te comprometes a utilizar el servicio de manera responsable y de acuerdo con todas las leyes y regulaciones aplicables. No está permitido:</p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>Publicar contenido ilegal, ofensivo o inapropiado</li>
              <li>Acosar o intimidar a otros usuarios</li>
              <li>Crear cuentas falsas o suplantar identidades</li>
              <li>Distribuir spam o malware</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-2">3. Privacidad</h3>
            <p>Respetamos tu privacidad y protegemos tus datos personales. Para más información, consulta nuestra Política de Privacidad.</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-2">4. Contenido del Usuario</h3>
            <p>Al publicar contenido en nuestra plataforma, mantienes tus derechos de propiedad intelectual, pero nos otorgas una licencia para usar, modificar y distribuir dicho contenido en relación con nuestros servicios.</p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-2">5. Modificaciones</h3>
            <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en la plataforma.</p>
          </section>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
      </div>

      {/* Bottom Nav para móviles */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-60">
        <div className="relative mx-auto max-w-3xl">
          <div className="bg-black/80 backdrop-blur-md border-t border-white/10 h-16 px-4 flex items-center justify-between">
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              <span className="text-[10px] mt-0.5">Home</span>
            </motion.a>
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/groups" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-2a4 4 0 00-3-3.87M7 20v-2a4 4 0 013-3.87m5-4a4 4 0 11-8 0 4 4 0 018 0zm6 8v-2a4 4 0 00-3-3.87M3 20v-2a4 4 0 013-3.87" /></svg>
              <span className="text-[10px] mt-0.5">Grupos</span>
            </motion.a>
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/marketplace" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 8h14l1 12a2 2 0 01-2 2H6a2 2 0 01-2-2l1-12z" /></svg>
              <span className="text-[10px] mt-0.5">Market</span>
            </motion.a>
            <motion.a whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} href="/profile" className="flex flex-col items-center text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="text-[10px] mt-0.5">Perfil</span>
            </motion.a>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default TermsAndConditions;
