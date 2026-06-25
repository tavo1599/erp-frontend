// src/services/clientes.service.ts
import http from './http';

export interface Cliente {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  estado: boolean;
}

export interface CrearCliente {
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

export const clientesService = {
  async listar(buscar?: string): Promise<Cliente[]> {
    const { data } = await http.get('/clientes', { params: { buscar } });
    return data;
  },
  async crear(cliente: CrearCliente): Promise<Cliente> {
    const { data } = await http.post('/clientes', cliente);
    return data;
  },
  async actualizar(id: string, cliente: Partial<CrearCliente>): Promise<Cliente> {
    const { data } = await http.patch(`/clientes/${id}`, cliente);
    return data;
  },
  async desactivar(id: string) {
    const { data } = await http.delete(`/clientes/${id}`); // o /proveedores
    return data;
  },
};