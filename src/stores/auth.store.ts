// src/stores/auth.store.ts
import { defineStore } from 'pinia';
import axios from 'axios';

// Devuelve la expiración (ms) del JWT, o null si no se puede leer.
function expiracionToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

interface Usuario {
  nombre: string;
  email: string;
  rol: string;
}

interface EmpresaActual {
  id: string;
  ruc: string;
  razon_social: string;
  ambiente: string;
  rol?: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null') as Usuario | null,
    empresaActual: JSON.parse(localStorage.getItem('empresa_actual') || 'null') as EmpresaActual | null,
    permisos: JSON.parse(localStorage.getItem('permisos') || '[]') as string[],
  }),

  getters: {
    estaAutenticado: (state) => !!state.token,
    nombreEmpresa: (state) => state.empresaActual?.razon_social || '',
    rucEmpresa: (state) => state.empresaActual?.ruc || '',
    esProduccion: (state) => state.empresaActual?.ambiente === 'produccion',
  },

  actions: {
    // Renueva el access token de forma proactiva si está vencido o por vencer,
    // ANTES de disparar las peticiones (evita el brote de 401 al abrir la app).
    async asegurarTokenFresco() {
      if (!this.token) return;
      const exp = expiracionToken(this.token);
      // Si todavía le quedan más de 30s de vida, no hace falta renovar.
      if (exp && exp - Date.now() > 30000) return;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return;

      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        this.token = data.access_token;
        localStorage.setItem('token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
      } catch {
        // Si el refresh falla, el interceptor de http lo manejará (logout) en la 1ª 401.
      }
    },

    // Guardar sesión tras el login
    establecerSesion(token: string, usuario: Usuario, empresa?: EmpresaActual) {
      this.token = token;
      this.usuario = usuario;
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      if (empresa) {
        this.empresaActual = empresa;
        localStorage.setItem('empresa_actual', JSON.stringify(empresa));
      }
    },

    // Cambiar a otra empresa (sin perder sesión)
    establecerEmpresa(empresa: EmpresaActual) {
      this.empresaActual = empresa;
      localStorage.setItem('empresa_actual', JSON.stringify(empresa));
    },

    // Cargar permisos del usuario actual (desde el backend)
    async cargarMisPermisos() {
      try {
        const { permisosService } = await import('../services/permisos.service');
        const data = await permisosService.misPermisos();
        this.permisos = data.permisos;
        localStorage.setItem('permisos', JSON.stringify(data.permisos));
      } catch {
        this.permisos = [];
        localStorage.removeItem('permisos');
      }
    },

    // Helper para verificar si el usuario tiene un permiso
    tienePermiso(codigo: string): boolean {
      if (this.usuario?.rol === 'SUPER_ADMIN') return true;
      return this.permisos.includes(codigo);
    },

    // Cerrar sesión
    cerrarSesion() {
      this.token = '';
      this.usuario = null;
      this.empresaActual = null;
      this.permisos = [];
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('empresa_actual');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('empresas_disponibles');
      localStorage.removeItem('permisos');
    },
  },
});