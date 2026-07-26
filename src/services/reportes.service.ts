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

export const reportesService = {
  async ventas(desde?: string, hasta?: string): Promise<{ resumen: ReporteResumen; filas: FilaVenta[] }> {
    const { data } = await http.get('/reportes/ventas', { params: { desde, hasta } });
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
