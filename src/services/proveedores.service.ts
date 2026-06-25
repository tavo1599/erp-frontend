// src/services/proveedores.service.ts
import http from './http';

export interface Proveedor {
  id: string;
  ruc: string;
  razon_social: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  contacto?: string;
  estado: boolean;
}

export interface CrearProveedor {
  ruc: string;
  razon_social: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  contacto?: string;
}

export const proveedoresService = {
  async listar(buscar?: string): Promise<Proveedor[]> {
    const { data } = await http.get('/proveedores', { params: { buscar } });
    return data;
  },
  async crear(proveedor: CrearProveedor): Promise<Proveedor> {
    const { data } = await http.post('/proveedores', proveedor);
    return data;
  },
 async actualizar(id: string, proveedor: Partial<CrearProveedor>): Promise<Proveedor> {
    const { data } = await http.patch(`/proveedores/${id}`, proveedor);
    return data;
  },
  async desactivar(id: string) {
    const { data } = await http.delete(`/proveedores/${id}`);
    return data;
  },
};