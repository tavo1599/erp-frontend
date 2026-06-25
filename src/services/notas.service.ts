// src/services/notas.service.ts
import http from './http';

export interface CrearNota {
  tipo_nota: string; // '07' = crédito, '08' = débito
  serie: string;
  tipo_comprobante_afectado: string; // '01' factura, '03' boleta
  comprobante_afectado: string; // ej "F001-00000123"
  codigo_motivo: string; // catálogo 09 o 10
  descripcion_motivo: string;
  cliente_numero_documento: string;
  cliente_razon_social: string;
  detalles: {
    producto_id: string;
    cantidad: number;
  }[];
}

export interface NotaLista {
  id: string;
  comprobante: string;
  tipo_nota: string;
  tipo_nombre: string;
  documento_afectado: string;
  motivo: string;
  cliente: string;
  importe_total: number;
  estado_sunat: string;
  fecha_emision: string;
}

export const notasService = {

    async emitir(nota: CrearNota) {
    const { data } = await http.post('/notas', nota);
    return data;
  },
  
  async listar(filtros?: { tipo_nota?: string }): Promise<NotaLista[]> {
    const { data } = await http.get('/notas', { params: filtros });
    return data;
  },

    async obtenerPdf(id: string): Promise<string> {
    const response = await http.get(`/notas/${id}/pdf`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },
};