import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Interceptor de request: agregar token
http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

// Interceptor de response: renovar token automáticamente
let renovando = false;
let colaPendiente: Array<(token: string) => void> = [];

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const auth = useAuthStore();
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/seleccionar-empresa')
    ) {
      if (renovando) {
        return new Promise((resolve) => {
          colaPendiente.push((nuevoToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${nuevoToken}`;
            resolve(http(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      renovando = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        // ✅ FIX: usar la URL del backend desde env (no localhost)
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await axios.post(`${baseURL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        auth.token = access_token;
        localStorage.setItem('token', access_token);
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        colaPendiente.forEach((cb) => cb(access_token));
        colaPendiente = [];

        return http(originalRequest);
      } catch (refreshError) {
        colaPendiente = [];
        auth.cerrarSesion();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        renovando = false;
      }
    }

    return Promise.reject(error);
  },
);

export default http;