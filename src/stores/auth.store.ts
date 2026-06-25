// src/stores/auth.store.ts
import { defineStore } from 'pinia';

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