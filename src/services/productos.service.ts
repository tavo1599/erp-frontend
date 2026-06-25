// src/services/productos.service.ts
import http from './http';

export interface Producto {
  id: string;
  codigo_sunat: string;
  nombre: string;
  unidad_medida: string;
  precio_venta: number;
  tipo_igv: string;
  stock_actual: number;
  estado: boolean;
  precio_compra: number;
  tipo_bien_servicio?: string;
}

export interface CrearProducto {
  codigo_sunat?: string;
  nombre: string;
  unidad_medida?: string;
  precio_venta: number;
  tipo_igv: string;
  stock_actual?: number;
  precio_compra?: number;
  tipo_bien_servicio: string;
}

export const productosService = {
  async listar(buscar?: string): Promise<Producto[]> {
    const { data } = await http.get('/productos', { params: { buscar } });
    return data;
  },
  async crear(producto: CrearProducto): Promise<Producto> {
    const { data } = await http.post('/productos', producto);
    return data;
  },
  async actualizar(id: string, producto: Partial<CrearProducto>): Promise<Producto> {
    const { data } = await http.patch(`/productos/${id}`, producto);
    return data;
  },
  async entradaStock(id: string, cantidad: number, motivo: string) {
    const { data } = await http.post(`/productos/${id}/entrada-stock`, { cantidad, motivo });
    return data;
  },
  async desactivar(id: string) {
    const { data } = await http.delete(`/productos/${id}`);
    return data;
  },
};