// src/services/kardex.service.ts
import http from './http';

export interface MovimientoKardex {
  id: string;
  tipo_movimiento: string;
  cantidad: number;
  stock_anterior: number;
  stock_posterior: number;
  referencia_documento: string;
  fecha_movimiento: string;
}

export const kardexService = {
  async historialProducto(productoId: string): Promise<MovimientoKardex[]> {
    const { data } = await http.get(`/kardex/producto/${productoId}`);
    return data;
  },
};