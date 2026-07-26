// src/services/retenciones.service.ts
import http from './http';

export interface RetencionLista {
  id: string;
  comprobante: string;
  fecha_emision: string;
  proveedor: string;
  proveedor_documento: string;
  total_retenido: number;
  total_pagado: number;
  estado_sunat: string;
  tiene_xml: boolean;
  tiene_cdr: boolean;
}

export interface DetalleRetencion {
  num_doc_relacionado: string;
  fecha_doc: string;
  importe_doc: number;
  fecha_pago: string;
  importe_pagado: number;
}

export interface EmitirRetencion {
  serie: string;
  regimen?: string;
  proveedor_numero_documento: string;
  proveedor_razon_social: string;
  proveedor_direccion?: string;
  observaciones?: string;
  detalles: DetalleRetencion[];
}

export const retencionesService = {
  async listar(): Promise<RetencionLista[]> {
    const { data } = await http.get('/retenciones');
    return data;
  },
  async obtener(id: string) {
    const { data } = await http.get(`/retenciones/${id}`);
    return data;
  },
  async emitir(retencion: EmitirRetencion) {
    const { data } = await http.post('/retenciones', retencion);
    return data;
  },
  async descargarXml(id: string, nombre: string) {
    const res = await http.get(`/retenciones/${id}/xml`, { responseType: 'blob' });
    descargar(res.data, `${nombre}.xml`);
  },
  async descargarCdr(id: string, nombre: string) {
    const res = await http.get(`/retenciones/${id}/cdr`, { responseType: 'blob' });
    descargar(res.data, `R-${nombre}.zip`);
  },
};

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
