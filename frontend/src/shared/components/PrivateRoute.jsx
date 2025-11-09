import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('storage')); // Notifica a useAuth
    navigate('/login');
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <button onClick={handleLogout}>Cerrar sesión</button>
      {children}
    </>
  );
};

export default PrivateRoute;