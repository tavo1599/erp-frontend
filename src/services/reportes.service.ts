// src/services/reportes.service.ts
import http from './http';

export interface ReporteResumen {
  cantidad: number;
  gravado: number;
  igv: number;
  total: number;
}

export interface FilaVenta {
  fecha: string;
  tipo: string;
  comprobante: string;
  cliente: string;
  cliente_documento: string;
  gravado: number;
  igv: number;
  total: number;
  estado: string;
}

export interface FilaCompra {
  fecha: string;
  documento: string;
  proveedor: string;
  gravado: number;
  igv: number;
  total: number;
  estado: string;
}

export interface ResumenIgv {
  ventas: { gravado: number; igv: number; cantidad: number };
  compras: { gravado: number; igv: number; cantidad: number };
  igv_debito: number;
  igv_credito: number;
  igv_a_pagar: number;
  saldo_a_favor: number;
}

export interface FilaRentabilidad {
  producto: string;
  cantidad: number;
  vendido: number;
  costo: number;
  utilidad: number;
  margen: number;
}

export interface ResumenTributario {
  detracciones: { total: number; cantidad: number };
  retenciones: { total: number; cantidad: number };
  percepciones: { total: number; cantidad: number };
}

export interface FilaFormaPago {
  metodo: string;
  total: number;
  cantidad: number;
}

export interface MetricasPeriodo {
  periodo: string;
  ventas_total: number;
  ventas_cantidad: number;
  compras_total: number;
  igv_neto: number;
  utilidad: number;
}

export interface Comparativo {
  actual: MetricasPeriodo;
  anterior: MetricasPeriodo;
  variacion: { ventas_total: number; compras_total: number; utilidad: number };
}

export const reportesService = {
  async ventas(desde?: string, hasta?: string): Promise<{ resumen: ReporteResumen; filas: FilaVenta[] }> {
    const { data } = await http.get('/reportes/ventas', { params: { desde, hasta } });
    return data;
  },
  async igv(desde: string, hasta: string): Promise<ResumenIgv> {
    const { data } = await http.get('/reportes/igv', { params: { desde, hasta } });
    return data;
  },
  async rentabilidad(desde: string, hasta: string): Promise<{ resumen: FilaRentabilidad; detalle: FilaRentabilidad[] }> {
    const { data } = await http.get('/reportes/rentabilidad', { params: { desde, hasta } });
    return data;
  },
  async tributario(desde: string, hasta: string): Promise<ResumenTributario> {
    const { data } = await http.get('/reportes/tributario', { params: { desde, hasta } });
    return data;
  },
  async formasPago(desde: string, hasta: string): Promise<FilaFormaPago[]> {
    const { data } = await http.get('/reportes/formas-pago', { params: { desde, hasta } });
    return data;
  },
  async comparativo(periodo: string): Promise<Comparativo> {
    const { data } = await http.get('/reportes/comparativo', { params: { periodo } });
    return data;
  },
  async compras(desde?: string, hasta?: string): Promise<{ resumen: ReporteResumen; filas: FilaCompra[] }> {
    const { data } = await http.get('/reportes/compras', { params: { desde, hasta } });
    return data;
  },
  async descargarPle(tipo: 'ventas' | 'compras', periodo: string) {
    const res = await http.get(`/reportes/ple/${tipo}`, {
      params: { periodo },
      responseType: 'blob',
    });
    // Nombre del archivo desde la cabecera, o uno por defecto
    const cd = res.headers['content-disposition'] || '';
    const match = cd.match(/filename="?([^"]+)"?/);
    const nombre = match ? match[1] : `LE_${tipo}_${periodo}.txt`;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
