// src/services/admin.service.ts
import http from './http';

export interface EmpresaLista {
  id: string;
  ruc: string;
  razon_social: string;
  ambiente: string;
  plan: string;
  estado_suscripcion: string;
  fecha_inicio_suscripcion: string | null;
  fecha_fin_suscripcion: string | null;
  total_comprobantes: number;
  total_usuarios: number;
  total_almacenes: number;
  admin_email: string | null;
  comprobantes_emitidos_mes: number;
  limite_comprobantes_mes: number;
  fecha_creacion: string;
}

export interface CrearEmpresa {
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion?: string;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  admin_nombre: string;
  admin_email: string;
  admin_password: string;
  plan: string;
}

export interface KpisGlobales {
  total_empresas: number;
  empresas_activas: number;
  empresas_suspendidas: number;
  total_comprobantes: number;
  comprobantes_aceptados: number;
  comprobantes_hoy: number;
  empresas_por_plan: { plan: string; cantidad: string }[];
}

export interface DashboardSuperAdmin {
  ingresos_total: number;
  ingresos_mes: number;
  ingresos_por_mes: { mes: string; total: number }[];
  total_empresas: number;
  empresas_activas: number;
  empresas_suspendidas: number;
  empresas_por_plan: { plan: string; cantidad: number }[];
  proximos_vencimientos: {
    id: string;
    razon_social: string;
    plan: string;
    estado_suscripcion: string;
    fecha_fin_suscripcion: string | null;
    dias_restantes: number | null;
  }[];
}

export interface PagoSuscripcion {
  id: string;
  monto: number;
  meses: number;
  metodo: string;
  fecha_pago: string;
  periodo_hasta: string | null;
  notas: string | null;
}

export const adminService = {
  async listarEmpresas(): Promise<EmpresaLista[]> {
    const { data } = await http.get('/admin/empresas');
    return data;
  },
  async crearEmpresa(empresa: CrearEmpresa) {
    const { data } = await http.post('/admin/empresas', empresa);
    return data;
  },
  async actualizarEmpresa(id: string, datos: any) {
    const { data } = await http.patch(`/admin/empresas/${id}`, datos);
    return data;
  },
  async cambiarEstado(id: string, estado: 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA') {
    const { data } = await http.patch(`/admin/empresas/${id}/estado`, { estado });
    return data;
  },
  async kpis(): Promise<KpisGlobales> {
    const { data } = await http.get('/admin/kpis');
    return data;
  },
  async dashboard(): Promise<DashboardSuperAdmin> {
    const { data } = await http.get('/admin/dashboard');
    return data;
  },
  async registrarPago(
    id: string,
    pago: { monto: number; meses?: number; metodo?: string; notas?: string },
  ) {
    const { data } = await http.post(`/admin/empresas/${id}/pagos`, pago);
    return data;
  },
  async listarPagos(id: string): Promise<PagoSuscripcion[]> {
    const { data } = await http.get(`/admin/empresas/${id}/pagos`);
    return data;
  },
  async enviarRecordatorio(id: string) {
    const { data } = await http.post(`/admin/empresas/${id}/recordatorio`, {});
    return data;
  },
};
