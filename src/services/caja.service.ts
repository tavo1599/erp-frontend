// src/services/caja.service.ts
import http from './http';

export interface CajaAbierta {
  id: string;
  usuario_email: string | null;
  monto_inicial: number;
  ventas_efectivo: number;
  monto_esperado: number;
  fecha_apertura: string;
}

export interface CajaEstado {
  abierta: boolean;
  caja?: CajaAbierta;
}

export interface CierreResultado {
  mensaje: string;
  monto_inicial: number;
  ventas_efectivo: number;
  monto_esperado: number;
  monto_contado: number;
  diferencia: number;
}

export const cajaService = {
  async estado(): Promise<CajaEstado> {
    const { data } = await http.get('/caja/estado');
    return data;
  },
  async abrir(monto_inicial: number): Promise<void> {
    await http.post('/caja/abrir', { monto_inicial });
  },
  async cerrar(monto_contado: number, observaciones?: string): Promise<CierreResultado> {
    const { data } = await http.post('/caja/cerrar', { monto_contado, observaciones });
    return data;
  },
  async historial() {
    const { data } = await http.get('/caja/historial');
    return data;
  },
};
