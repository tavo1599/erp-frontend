// src/services/cotizaciones.service.ts
import http from './http';

export interface CotizacionLista {
  id: string;
  numero: number;
  codigo: string;
  cliente: string;
  cliente_documento: string;
  fecha_emision: string;
  fecha_validez: string | null;
  estado: string;
  importe_total: number;
  venta_id: string | null;
}

export interface DetalleCotizacion {
  producto_id: string;
  cantidad: number;
  descuento_porcentaje?: number;
}

export interface CrearCotizacion {
  cliente_id?: string;
  cliente_numero_documento?: string;
  cliente_razon_social?: string;
  fecha_validez?: string;
  observaciones?: string;
  detalles: DetalleCotizacion[];
}

export interface CotizacionDetalleCompleta {
  id: string;
  numero: number;
  codigo: string;
  cliente_razon_social: string;
  cliente_numero_documento: string;
  fecha_emision: string;
  fecha_validez: string | null;
  estado: string;
  total_gravado: number;
  total_igv: number;
  importe_total: number;
  observaciones: string | null;
  venta_id: string | null;
  detalles: {
    producto_id: string;
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje: number;
    subtotal: number;
  }[];
}

export const cotizacionesService = {
  async listar(estado?: string): Promise<CotizacionLista[]> {
    const { data } = await http.get('/cotizaciones', { params: estado ? { estado } : {} });
    return data;
  },
  async obtener(id: string): Promise<CotizacionDetalleCompleta> {
    const { data } = await http.get(`/cotizaciones/${id}`);
    return data;
  },
  async crear(cotizacion: CrearCotizacion): Promise<CotizacionDetalleCompleta> {
    const { data } = await http.post('/cotizaciones', cotizacion);
    return data;
  },
  async actualizar(id: string, cotizacion: CrearCotizacion): Promise<CotizacionDetalleCompleta> {
    const { data } = await http.patch(`/cotizaciones/${id}`, cotizacion);
    return data;
  },
  async cambiarEstado(id: string, estado: string) {
    const { data } = await http.patch(`/cotizaciones/${id}/estado`, { estado });
    return data;
  },
  async convertir(id: string) {
    const { data } = await http.post(`/cotizaciones/${id}/convertir`, {});
    return data;
  },
  async obtenerPdf(id: string): Promise<string> {
    const response = await http.get(`/cotizaciones/${id}/pdf`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },
};
