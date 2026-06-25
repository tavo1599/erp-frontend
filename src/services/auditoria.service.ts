import http from './http';

export interface RegistroAuditoria {
  id: string;
  empresa_id: string | null;
  usuario_id: string | null;
  usuario_email: string;
  usuario_rol: string;
  accion: string;
  recurso: string | null;
  recurso_id: string | null;
  datos_antes: any;
  datos_despues: any;
  ip: string | null;
  user_agent: string | null;
  fecha: string;
}

export interface ResultadoAuditoria {
  registros: RegistroAuditoria[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export const auditoriaService = {
  async listar(filtros: {
    usuario_id?: string;
    accion?: string;
    desde?: string;
    hasta?: string;
    pagina?: number;
  } = {}): Promise<ResultadoAuditoria> {
    const { data } = await http.get('/auditoria', { params: filtros });
    return data;
  },
};