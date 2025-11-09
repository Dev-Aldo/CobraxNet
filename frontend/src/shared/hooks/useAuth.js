import { useState, useEffect } from 'react';

const getIsAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    return !isExpired;
  } catch {
    return false;
  }
};

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(getIsAuthenticated());

  useEffect(() => {
    const handleStorage = () => setIsAuthenticated(getIsAuthenticated());
    window.addEventListener('storage', handleStorage);

    // También revisa el token cada vez que el componente se monta/renderiza
    setIsAuthenticated(getIsAuthenticated());

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return isAuthenticated;
};



export default useAuth;