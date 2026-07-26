// src/services/percepciones.service.ts
import http from './http';

export interface PercepcionLista {
  id: string;
  comprobante: string;
  fecha_emision: string;
  cliente: string;
  cliente_documento: string;
  total_percibido: number;
  total_cobrado: number;
  estado_sunat: string;
  tiene_xml: boolean;
  tiene_cdr: boolean;
}

export interface DetallePercepcion {
  num_doc_relacionado: string;
  fecha_doc: string;
  importe_doc: number;
  fecha_cobro: string;
  importe_cobrado: number;
}

export interface EmitirPercepcion {
  serie: string;
  regimen?: string;
  cliente_numero_documento: string;
  cliente_razon_social: string;
  cliente_direccion?: string;
  observaciones?: string;
  detalles: DetallePercepcion[];
}

export const percepcionesService = {
  async listar(): Promise<PercepcionLista[]> {
    const { data } = await http.get('/percepciones');
    return data;
  },
  async obtener(id: string) {
    const { data } = await http.get(`/percepciones/${id}`);
    return data;
  },
  async emitir(percepcion: EmitirPercepcion) {
    const { data } = await http.post('/percepciones', percepcion);
    return data;
  },
  async descargarXml(id: string, nombre: string) {
    const res = await http.get(`/percepciones/${id}/xml`, { responseType: 'blob' });
    descargar(res.data, `${nombre}.xml`);
  },
  async descargarCdr(id: string, nombre: string) {
    const res = await http.get(`/percepciones/${id}/cdr`, { responseType: 'blob' });
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
