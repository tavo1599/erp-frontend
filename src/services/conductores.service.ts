// src/services/conductores.service.ts
import http from './http';

export interface Conductor {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string | null;
  licencia_conducir: string;
  transportista_id: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearConductor {
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos?: string;
  licencia_conducir: string;
  transportista_id: string;
}

export interface FiltrosConductores {
  transportista_id?: string;
}

export const conductoresService = {
  async listar(filtros?: FiltrosConductores): Promise<Conductor[]> {
    const params: any = {};
    if (filtros?.transportista_id) params.transportista_id = filtros.transportista_id;
    const { data } = await http.get('/conductores', { params });
    return data;
  },

  async crear(conductor: CrearConductor): Promise<Conductor> {
    const { data } = await http.post('/conductores', conductor);
    return data;
  },

  async obtener(id: string): Promise<Conductor> {
    const { data } = await http.get(`/conductores/${id}`);
    return data;
  },

  async actualizar(
    id: string,
    datos: Partial<CrearConductor>,
  ): Promise<Conductor> {
    const { data } = await http.patch(`/conductores/${id}`, datos);
    return data;
  },

  async desactivar(id: string): Promise<void> {
    await http.delete(`/conductores/${id}`);
  },
};