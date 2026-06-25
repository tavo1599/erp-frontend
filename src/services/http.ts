import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const http = axios.create({
  baseURL: 'http://localhost:3000',
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

    // Si fue 401 y no se reintentó, y NO es el endpoint /refresh
    if (
  error.response?.status === 401 &&
  !originalRequest._retry &&
  !originalRequest.url.includes('/auth/refresh') &&
  !originalRequest.url.includes('/auth/login') &&
  !originalRequest.url.includes('/auth/seleccionar-empresa')
) {
      if (renovando) {
        // Ya hay una renovación en curso, esperarla
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
        const response = await axios.post('http://localhost:3000/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        auth.token = access_token;
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', refresh_token);

        // Reintentar la petición original
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        // Procesar la cola
        colaPendiente.forEach((cb) => cb(access_token));
        colaPendiente = [];

        return http(originalRequest);
      } catch (refreshError) {
        // El refresh falló, cerrar sesión
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