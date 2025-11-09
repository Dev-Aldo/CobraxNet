import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Notifications from '../../features/notifications/Notifications';
import useNotifications from '../hooks/useNotifications';
import TermsAndConditions from './TermsAndConditions';
import PrivacyPolicy from './PrivacyPolicy';

const RightSidebar = ({ onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <>
      <TermsAndConditions isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <div className="hidden lg:flex fixed right-0 top-0 h-full w-64 bg-black/80 backdrop-blur-md border-l border-white/10 pt-24 pb-16 flex-col items-center gap-8 z-10">
      <button
          onClick={() => setShowNotifications(true)}
          className="relative flex items-center gap-3 w-48 px-4 py-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white font-semibold transition-all duration-300 ease-out hover:shadow-lg hover:shadow-white/5 hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Notificaciones
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
      </button>
      <Link
        to="/groups"
        className="flex items-center gap-3 w-48 px-4 py-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white font-semibold transition-all duration-300 ease-out hover:shadow-lg hover:shadow-white/5 hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-2a4 4 0 00-3-3.87M7 20v-2a4 4 0 013-3.87m5-4a4 4 0 11-8 0 4 4 0 018 0zm6 8v-2a4 4 0 00-3-3.87M3 20v-2a4 4 0 013-3.87" />
        </svg>
        Grupos
      </Link>
        <Link
          to="/marketplace"
          className="flex items-center gap-3 w-48 px-4 py-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white font-semibold transition-all duration-300 ease-out hover:shadow-lg hover:shadow-white/5 hover:scale-105"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 8h14l1 12a2 2 0 01-2 2H6a2 2 0 01-2-2l1-12z" />
          </svg>
          Marketplace
        </Link>
      <button
        onClick={() => setShowTerms(true)}
        className="flex items-center gap-3 w-48 px-4 py-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white font-semibold transition-all duration-300 ease-out hover:shadow-lg hover:shadow-white/5 hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Términos y Condiciones
      </button>
      <button
        onClick={() => setShowPrivacy(true)}
        className="flex items-center gap-3 w-48 px-4 py-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white font-semibold transition-all duration-300 ease-out hover:shadow-lg hover:shadow-white/5 hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
        Política de Privacidad
      </button>
      <button
        className="flex items-center gap-3 w-48 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold transition-all duration-300 ease-out hover:shadow-lg hover:shadow-red-500/20 hover:scale-105"
        onClick={onLogout}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
        </svg>
        Cerrar sesión
      </button>
    </div>

      {/* Modal de Notificaciones */}
      <Notifications 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </>
  );
};

export default RightSidebar;
