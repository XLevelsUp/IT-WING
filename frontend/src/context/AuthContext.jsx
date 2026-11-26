import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { isFrontendOnlyMode } from '../services/sheetCapture';

const FRONTEND_ONLY_TOKEN = 'frontend-only-session';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('tvk_crm_token');
      const savedUser = localStorage.getItem('tvk_crm_user');

      if (token && savedUser) {
        try {
          // Frontend-only mode: no backend to verify the session against, and
          // only the normal user portal is available (older demo sessions may hold other roles)
          if (isFrontendOnlyMode) {
            const localUser = { ...JSON.parse(savedUser), role: 'citizen' };
            localStorage.setItem('tvk_crm_user', JSON.stringify(localUser));
            setUser(localUser);
            setLoading(false);
            return;
          }
          setUser(JSON.parse(savedUser));
          // Verify with backend
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('tvk_crm_user', JSON.stringify(res.data.data));
          }
        } catch (err) {
          console.error('Session expired or invalid:', err.message);
          localStorage.removeItem('tvk_crm_token');
          localStorage.removeItem('tvk_crm_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username, password, selectedRole) => {
    const res = await api.post('/auth/login', { username, password, selectedRole });
    if (res.data.success) {
      const { token, ...userData } = res.data.data;
      localStorage.setItem('tvk_crm_token', token);
      localStorage.setItem('tvk_crm_user', JSON.stringify(userData));
      setUser(userData);
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  // Frontend-only mode: start a local session without backend authentication
  const loginLocally = (userData) => {
    if (!isFrontendOnlyMode) {
      throw new Error('Local login is only available in frontend-only mode');
    }
    localStorage.setItem('tvk_crm_token', FRONTEND_ONLY_TOKEN);
    localStorage.setItem('tvk_crm_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('tvk_crm_token');
    localStorage.removeItem('tvk_crm_user');
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('tvk_crm_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginLocally, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
