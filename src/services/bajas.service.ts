// src/services/bajas.service.ts
import http from './http';

export interface Baja {
  id: string;
  identificador: string;
  comprobantes_afectados: number;
  estado: string;
  fecha_creacion: string;
}

export const bajasService = {
  async listar(): Promise<Baja[]> {
    const { data } = await http.get('/bajas');
    return data;
  },
  async consultarEstado(id: string) {
    const { data } = await http.get(`/bajas/${id}/estado`);
    return data;
  },
};