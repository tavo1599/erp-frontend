// src/services/dashboard.service.ts
import http from './http';

export interface KpisData {
  hoy: { total: number; cantidad: number; comparacion_ayer: { porcentaje: number; tendencia: string } };
  mes: { total: number; cantidad: number; comparacion_mes_anterior: { porcentaje: number; tendencia: string }; total_mes_anterior: number };
  anio: { total: number; cantidad: number; comparacion_anio_anterior: { porcentaje: number; tendencia: string } };
  ticket_promedio: number;
}

export interface Alerta {
  tipo: string;
  nivel: 'critico' | 'advertencia' | 'info';
  mensaje: string;
}

export interface VentaPorDia {
  fecha: string;
  cantidad: number;
  total: number;
}

export interface ProductoVendido {
  producto: string;
  cantidad_vendida: number;
  total_vendido: number;
}

export const dashboardService = {
  async kpis(): Promise<KpisData> {
    const { data } = await http.get('/dashboard/kpis');
    return data;
  },
  async alertas(): Promise<{ total: number; alertas: Alerta[] }> {
    const { data } = await http.get('/dashboard/alertas');
    return data;
  },
  async ventasPorDia(dias = 30) {
    const { data } = await http.get(`/dashboard/ventas-por-dia?dias=${dias}`);
    return data;
  },
  async productosMasVendidos(limite = 5) {
    const { data } = await http.get(`/dashboard/productos-mas-vendidos?limite=${limite}`);
    return data;
  },
};