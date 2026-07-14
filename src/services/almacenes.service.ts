// src/services/almacenes.service.ts
import http from './http';

export interface Almacen {
  id: string;
  empresa_id: string;
  nombre: string;
  direccion?: string | null;
  encargado_nombre?: string | null;
  encargado_telefono?: string | null;
  es_principal: boolean;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearAlmacen {
  nombre: string;
  direccion?: string;
  encargado_nombre?: string;
  encargado_telefono?: string;
  es_principal?: boolean;
}

export const almacenesService = {
  async listar(): Promise<Almacen[]> {
    const { data } = await http.get('/almacenes');
    return data;
  },

  async obtener(id: string): Promise<Almacen> {
    const { data } = await http.get(`/almacenes/${id}`);
    return data;
  },

  async obtenerPrincipal(): Promise<Almacen> {
    const { data } = await http.get('/almacenes/principal');
    return data;
  },

  async crear(almacen: CrearAlmacen): Promise<Almacen> {
    const { data } = await http.post('/almacenes', almacen);
    return data;
  },

  async actualizar(id: string, almacen: Partial<CrearAlmacen>): Promise<Almacen> {
    const { data } = await http.patch(`/almacenes/${id}`, almacen);
    return data;
  },

  async desactivar(id: string) {
    const { data } = await http.delete(`/almacenes/${id}`);
    return data;
  },
};