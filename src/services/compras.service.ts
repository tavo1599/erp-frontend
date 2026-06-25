// src/services/compras.service.ts
import http from './http';

export interface DetalleCompra {
  producto_id: string;
  cantidad: number;
  costo_unitario: number;
}

export interface CrearCompra {
  proveedor_id: string;
  tipo_documento: string;
  serie_documento: string;
  numero_documento: string;
  fecha_compra: string;
  detalles: DetalleCompra[];
  condicion_pago?: string;
  dias_credito?: number;
}

export interface CompraLista {
  id: string;
  documento: string;
  proveedor: string;
  importe_total: number;
  estado: string;
  fecha_compra: string;
}

export const comprasService = {
  async listar(): Promise<CompraLista[]> {
    const { data } = await http.get('/compras');
    return data;
  },
  async registrar(compra: CrearCompra) {
    const { data } = await http.post('/compras', compra);
    return data;
  },

    async anular(id: string) {
    const { data } = await http.post(`/compras/${id}/anular`, {});
    return data;
  },
};