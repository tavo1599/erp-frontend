// src/services/vehiculos.service.ts
import http from './http';

export interface Vehiculo {
  id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  certificado_mtc: string | null;
  transportista_id: string | null;
  es_propio: boolean;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearVehiculo {
  placa: string;
  marca?: string;
  modelo?: string;
  certificado_mtc?: string;
  transportista_id: string;
  es_propio?: boolean;
}

export interface FiltrosVehiculos {
  transportista_id?: string;
  es_propio?: boolean;
}

export const vehiculosService = {
  async listar(filtros?: FiltrosVehiculos): Promise<Vehiculo[]> {
    const params: any = {};
    if (filtros?.transportista_id) params.transportista_id = filtros.transportista_id;
    if (filtros?.es_propio !== undefined) params.es_propio = filtros.es_propio;
    const { data } = await http.get('/vehiculos', { params });
    return data;
  },

  async crear(vehiculo: CrearVehiculo): Promise<Vehiculo> {
    const { data } = await http.post('/vehiculos', vehiculo);
    return data;
  },

  async obtener(id: string): Promise<Vehiculo> {
    const { data } = await http.get(`/vehiculos/${id}`);
    return data;
  },

  async actualizar(id: string, datos: Partial<CrearVehiculo>): Promise<Vehiculo> {
    const { data } = await http.patch(`/vehiculos/${id}`, datos);
    return data;
  },

  async desactivar(id: string): Promise<void> {
    await http.delete(`/vehiculos/${id}`);
  },
};