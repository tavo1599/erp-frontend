// src/services/transportistas.service.ts
import http from './http';

export interface Transportista {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  numero_mtc: string | null;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearTransportista {
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  numero_mtc?: string;
  direccion?: string;
  telefono?: string;
}

export const transportistasService = {
  async listar(): Promise<Transportista[]> {
    const { data } = await http.get('/transportistas');
    return data;
  },

  async crear(transportista: CrearTransportista): Promise<Transportista> {
    const { data } = await http.post('/transportistas', transportista);
    return data;
  },

  async obtener(id: string): Promise<Transportista> {
    const { data } = await http.get(`/transportistas/${id}`);
    return data;
  },

  async actualizar(
    id: string,
    datos: Partial<CrearTransportista>,
  ): Promise<Transportista> {
    const { data } = await http.patch(`/transportistas/${id}`, datos);
    return data;
  },

  async desactivar(id: string): Promise<void> {
    await http.delete(`/transportistas/${id}`);
  },
};