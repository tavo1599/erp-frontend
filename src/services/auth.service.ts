// src/services/auth.service.ts
import http from './http';

export interface EmpresaUsuario {
  id: string;
  ruc: string;
  razon_social: string;
  ambiente: string;
  rol: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
    requiere_seleccion: boolean;
  usuario: {
    nombre: string;
    email: string;
    rol: string;
  };
    empresas: EmpresaUsuario[];
}

export interface SeleccionEmpresaResponse {
  access_token: string;
  refresh_token: string;
  usuario: {
    nombre: string;
    email: string;
    rol: string;
  };
  empresa: EmpresaUsuario;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}



export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post('/auth/login', { email, password });
  return data;
},

async seleccionarEmpresa(empresaId: string): Promise<SeleccionEmpresaResponse> {
  const { data } = await http.post('/auth/seleccionar-empresa', {
    empresa_id: empresaId,
  });
  return data;
},

  async renovar(refreshToken: string): Promise<RefreshResponse> {
    const { data } = await http.post<RefreshResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout');
  },
};