// src/services/finanzas.service.ts
import http from './http';

export interface CuentaCobrar {
  id: string;
  comprobante: string;
  cliente: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_vencimiento: string | null;
  estado: string;
}

export interface CuentaPagar {
  id: string;
  documento: string;
  proveedor: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_vencimiento: string | null;
  estado: string;
}

export interface MovimientoCaja {
  id: string;
  tipo: string;
  concepto: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
}

export const finanzasService = {
  async cuentasPorCobrar(): Promise<{ total_por_cobrar: number; cantidad: number; cuentas: CuentaCobrar[] }> {
    const { data } = await http.get('/finanzas/cuentas-por-cobrar');
    return data;
  },
  async cobrar(id: string, monto: number, metodo_pago: string) {
    const { data } = await http.post(`/finanzas/cuentas-por-cobrar/${id}/cobrar`, { monto, metodo_pago });
    return data;
  },
  async cuentasPorPagar(): Promise<{ total_por_pagar: number; cantidad: number; cuentas: CuentaPagar[] }> {
    const { data } = await http.get('/finanzas/cuentas-por-pagar');
    return data;
  },
  async pagar(id: string, monto: number, metodo_pago: string) {
    const { data } = await http.post(`/finanzas/cuentas-por-pagar/${id}/pagar`, { monto, metodo_pago });
    return data;
  },
  async caja(): Promise<{ ingresos: number; egresos: number; saldo: number; movimientos: MovimientoCaja[] }> {
    const { data } = await http.get('/finanzas/caja');
    return data;
  },
  async movimientoManual(tipo: string, concepto: string, monto: number, metodo_pago: string) {
    const { data } = await http.post('/finanzas/caja/movimiento', { tipo, concepto, monto, metodo_pago });
    return data;
  },
};