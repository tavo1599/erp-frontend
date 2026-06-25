import http from './http';

export interface PermisoItem {
  codigo: string;
  nombre: string;
  descripcion: string;
  roles: Record<string, boolean>; // { ADMIN_EMPRESA: true, VENDEDOR: false, ... }
}

export interface ModuloPermisos {
  modulo: string;
  permisos: PermisoItem[];
}

export interface MatrizPermisos {
  roles: string[];
  modulos: ModuloPermisos[];
}

export const permisosService = {
  // Obtener la matriz completa
  async obtenerMatriz(): Promise<MatrizPermisos> {
    const { data } = await http.get('/permisos/matriz');
    return data;
  },

  // Obtener los permisos del usuario actual (rol)
  async misPermisos(): Promise<{ rol: string; permisos: string[] }> {
    const { data } = await http.get('/permisos/mios');
    return data;
  },

  // Actualizar un permiso específico
  async actualizar(rol: string, permiso: string, activo: boolean) {
    const { data } = await http.patch('/permisos', { rol, permiso, activo });
    return data;
  },
};