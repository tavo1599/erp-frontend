// src/services/admin.service.ts
import http from './http';

export interface EmpresaLista {
  id: string;
  ruc: string;
  razon_social: string;
  ambiente: string;
  plan: string;
  estado_suscripcion: string;
  fecha_fin_suscripcion: string | null;
  total_comprobantes: number;
  total_usuarios: number;
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
};