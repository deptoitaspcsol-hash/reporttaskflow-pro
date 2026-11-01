import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '@/api/client';

const AuthContext = createContext();

/**
 * Estado de la sesión. Se consulta una vez al abrir la aplicación (la cookie de sesión la envía el navegador):
 *  - sesión válida          → isAuthenticated
 *  - 401 / 403              → authError "auth_required" (la aplicación lleva al login)
 *  - cualquier otro fallo   → authError "unknown" (p. ej. sin conexión: se muestra "No se pudo conectar")
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkAppState = useCallback(async () => {
    try {
      setAuthError(null);
      setUser(await api.auth.me());
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      setAuthError(error.status === 401 || error.status === 403
        ? { type: 'auth_required', message: 'Authentication required' }
        : { type: 'unknown', message: error.message });
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => { checkAppState(); }, [checkAppState]);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    api.auth.logout();
  };

  const navigateToLogin = () => api.auth.redirectToLogin(window.location.href);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, authError, logout, navigateToLogin, checkAppState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
