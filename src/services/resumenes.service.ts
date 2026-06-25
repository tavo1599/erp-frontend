// src/services/resumenes.service.ts
import http from './http';

export interface Resumen {
  id: string;
  identificador: string;
  fecha_referencia: string;
  cantidad_boletas: number;
  estado: string;
  fecha_creacion: string;
}

export const resumenesService = {
  async listar(): Promise<Resumen[]> {
    const { data } = await http.get('/resumenes');
    return data;
  },
  async enviar(fecha: string) {
    const { data } = await http.post('/resumenes', { fecha });
    return data;
  },
  async consultarEstado(id: string) {
    const { data } = await http.get(`/resumenes/${id}/estado`);
    return data;
  },
};