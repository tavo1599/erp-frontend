// src/services/direcciones-traslado.service.ts
import http from './http';

export interface DireccionTraslado {
  id: string;
  nombre: string;
  ubigeo: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  tipo: string; // 'PARTIDA' | 'LLEGADA' | 'AMBOS'
  es_predeterminada: boolean;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearDireccionTraslado {
  nombre: string;
  ubigeo: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  tipo: string;
  es_predeterminada?: boolean;
}

export interface FiltrosDirecciones {
  tipo?: string; // 'PARTIDA' | 'LLEGADA'
}

export const direccionesTrasladoService = {
  async listar(filtros?: FiltrosDirecciones): Promise<DireccionTraslado[]> {
    const params: any = {};
    if (filtros?.tipo) params.tipo = filtros.tipo;
    const { data } = await http.get('/direcciones-traslado', { params });
    return data;
  },

  async crear(direccion: CrearDireccionTraslado): Promise<DireccionTraslado> {
    const { data } = await http.post('/direcciones-traslado', direccion);
    return data;
  },

  async obtener(id: string): Promise<DireccionTraslado> {
    const { data } = await http.get(`/direcciones-traslado/${id}`);
    return data;
  },

  async actualizar(
    id: string,
    datos: Partial<CrearDireccionTraslado>,
  ): Promise<DireccionTraslado> {
    const { data } = await http.patch(`/direcciones-traslado/${id}`, datos);
    return data;
  },

  async desactivar(id: string): Promise<void> {
    await http.delete(`/direcciones-traslado/${id}`);
  },
};