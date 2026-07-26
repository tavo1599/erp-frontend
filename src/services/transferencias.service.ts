// src/services/transferencias.service.ts
import http from './http';

export interface TransferenciaLista {
  id: string;
  numero: number;
  codigo: string;
  almacen_origen: string;
  almacen_destino: string;
  fecha: string;
  usuario_email: string | null;
  estado: string;
}

export interface DetalleTransferencia {
  producto_id: string;
  cantidad: number;
}

export interface CrearTransferencia {
  almacen_origen_id: string;
  almacen_destino_id: string;
  observaciones?: string;
  detalles: DetalleTransferencia[];
}

export interface TransferenciaDetalleCompleta {
  id: string;
  codigo: string;
  almacen_origen_nombre: string;
  almacen_destino_nombre: string;
  fecha: string;
  usuario_email: string | null;
  observaciones: string | null;
  estado: string;
  detalles: { producto_id: string; producto_nombre: string; cantidad: number }[];
}

export const transferenciasService = {
  async listar(): Promise<TransferenciaLista[]> {
    const { data } = await http.get('/transferencias');
    return data;
  },
  async obtener(id: string): Promise<TransferenciaDetalleCompleta> {
    const { data } = await http.get(`/transferencias/${id}`);
    return data;
  },
  async crear(transferencia: CrearTransferencia): Promise<TransferenciaDetalleCompleta> {
    const { data } = await http.post('/transferencias', transferencia);
    return data;
  },
};
