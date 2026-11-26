import axios from 'axios';
import { isFrontendOnlyMode } from './sheetCapture';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tvk_crm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Frontend-only mode has no backend sessions, so a 401 must not end the local session
    if (!isFrontendOnlyMode && error.response && error.response.status === 401) {
      // If unauthorized and not already on login page, clear session
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('tvk_crm_token');
        localStorage.removeItem('tvk_crm_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
