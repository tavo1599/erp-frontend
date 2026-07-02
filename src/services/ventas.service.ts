// src/services/ventas.service.ts
import http from './http';

export interface DetalleVenta {
  producto_id: string;
  cantidad: number;
  descuento_porcentaje?: number;
}

export interface CrearVenta {
  cliente_id?: string;
  cliente_numero_documento?: string;
  cliente_razon_social?: string;
  tipo_comprobante: string;
  serie: string;
  detalles: DetalleVenta[];
  condicion_pago?: string;
  dias_credito?: number;
}

export interface VentaLista {
  id: string;
  comprobante: string;
  tipo_comprobante: string;
  tipo_nombre: string;
  cliente: string;
  importe_total: number;
  estado_sunat: string;
  fecha_emision: string;
}

export interface VentaDetalleCompleto {
  id: string;
  comprobante: string;
  tipo_nombre: string;
  cliente: { razon_social: string; numero_documento: string };
  totales: { gravado: number; igv: number; total: number };
  estado_sunat: string;
  sunat_descripcion: string;
  fecha_emision: string;
  nombre_archivo: string;
  tiene_xml?: boolean;
  tiene_cdr?: boolean;
  detalles: {
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
  
}

export interface VentaRecuperada {
  venta_id: string;
  tipo_comprobante: string;
  serie: string;
  correlativo: number;
  comprobante: string;
  fecha_emision: string;
  cliente: { numero_documento: string; razon_social: string };
  detalles: {
    producto_id: string;
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
  total_gravado: number;
  total_igv: number;
  importe_total: number;
}

// Filtros de la lista de ventas
export interface FiltrosVentas {
  estado?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
}

export const ventasService = {
  async listar(filtros?: FiltrosVentas): Promise<VentaLista[]> {
    const params: any = {};
    if (filtros?.estado) params.estado = filtros.estado;
    if (filtros?.tipo) params.tipo = filtros.tipo;
    if (filtros?.desde) params.desde = filtros.desde;
    if (filtros?.hasta) params.hasta = filtros.hasta;
    const { data } = await http.get('/ventas', { params });
    return data;
  },

  async emitir(venta: CrearVenta) {
    const { data } = await http.post('/ventas', venta);
    return data;
  },

  async obtenerPdf(id: string, formato: 'a4' | 'ticket' = 'a4'): Promise<string> {
    const response = await http.get(`/ventas/${id}/pdf`, {
      params: { formato },
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  async obtener(id: string): Promise<VentaDetalleCompleto> {
    const { data } = await http.get(`/ventas/${id}`);
    return data;
  },

  async buscarPorNumero(tipo: string, serie: string, numero: number): Promise<VentaRecuperada> {
    const { data } = await http.get('/ventas/buscar/por-numero', {
      params: { tipo, serie, numero },
    });
    return data;
  },

  async enviarBajaSunat(id: string, motivo: string) {
    const { data } = await http.post(`/ventas/${id}/baja-sunat`, { motivo });
    return data;
  },

  async anular(id: string) {
    const { data } = await http.post(`/ventas/${id}/anular`, {});
    return data;
  },

  async descargarXml(id: string, nombreArchivo: string) {
  const response = await http.get(`/ventas/${id}/xml`, {
    responseType: 'blob',
  });
  // Forzar descarga
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
},

async descargarCdr(id: string, nombreArchivo: string) {
  const response = await http.get(`/ventas/${id}/cdr`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `R-${nombreArchivo}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
},

async proximoCorrelativo(params: {
  tipo_comprobante: string;
  serie: string;
}): Promise<{
  tipo_comprobante: string;
  serie: string;
  ambiente: string;
  ultimo_correlativo: number;
  proximo_correlativo: number;
  comprobante_proximo: string;
}> {
  const { data } = await http.get('/ventas/proximo-correlativo', {
    params,
  });
  return data;
},

async marcarParaAnulacion(id: string) {
  const { data } = await http.post(`/ventas/${id}/marcar-anulacion`, {});
  return data;
}
};