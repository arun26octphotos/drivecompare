import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 20000,
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dc_token');
      localStorage.removeItem('dc_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
