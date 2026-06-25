// src/services/guias-remision.service.ts
import http from './http';

export interface DetalleGuia {
  producto_id?: string;
  codigo_producto?: string;
  descripcion: string;
  unidad_medida?: string;
  cantidad: number;
  peso_unitario: number;
}

export interface CrearGuia {
  tipo_guia: string; // '09' Remitente, '31' Transportista
  serie: string;
  fecha_inicio_traslado: string;
  venta_id?: string;
  doc_relacionado_tipo?: string;
  doc_relacionado_numero?: string;
  motivo_traslado: string;
  descripcion_motivo: string;
  modalidad_transporte: string; // '01' Pública, '02' Privada
  peso_bruto_total: number;
  unidad_peso?: string;
  destinatario_tipo_documento: string;
  destinatario_numero_documento: string;
  destinatario_razon_social: string;
  partida_ubigeo: string;
  partida_direccion: string;
  llegada_ubigeo: string;
  llegada_direccion: string;
  transportista_id?: string;
  vehiculo_id?: string;
  numero_placa?: string;
  conductor_id?: string;
  detalles: DetalleGuia[];
  observaciones?: string;
}

export interface GuiaLista {
  id: string;
  guia: string;
  tipo_guia: string;
  tipo_nombre: string;
  destinatario: string;
  modalidad: string;
  peso_total: number;
  estado_sunat: string;
  fecha_emision: string;
  fecha_inicio_traslado: string;
}

export interface FiltrosGuias {
  estado?: string;
  desde?: string;
  hasta?: string;
}

export const guiasRemisionService = {
  async emitir(guia: CrearGuia) {
    const { data } = await http.post('/guias-remision', guia);
    return data;
  },

  async listar(filtros?: FiltrosGuias): Promise<GuiaLista[]> {
    const params: any = {};
    if (filtros?.estado) params.estado = filtros.estado;
    if (filtros?.desde) params.desde = filtros.desde;
    if (filtros?.hasta) params.hasta = filtros.hasta;
    const { data } = await http.get('/guias-remision', { params });
    return data;
  },

  async obtener(id: string) {
    const { data } = await http.get(`/guias-remision/${id}`);
    return data;
  },

  async obtenerPdf(id: string): Promise<string> {
  const response = await http.get(`/guias-remision/${id}/pdf`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
},

async descargarXml(id: string, nombreArchivo: string) {
  const response = await http.get(`/guias-remision/${id}/xml`, {
    responseType: 'blob',
  });
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
  const response = await http.get(`/guias-remision/${id}/cdr`, {
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

async anular(id: string) {
  const { data } = await http.post(`/guias-remision/${id}/anular`, {});
  return data;
},
};