// src/services/sunat.service.ts
import http from './http';

export interface EmpresaRuc {
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  estado: string;
  condicion: string;
}

export interface PersonaDni {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

export const sunatService = {
  async consultarRuc(ruc: string): Promise<EmpresaRuc> {
    const { data } = await http.get(`/sunat-consultas/ruc/${ruc}`);
    return data;
  },
  async consultarDni(dni: string): Promise<PersonaDni> {
    const { data } = await http.get(`/sunat-consultas/dni/${dni}`);
    return data;
  },
};