// src/services/empresa.service.ts
import http from './http';

export interface Empresa {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion?: string;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  sol_usuario?: string;
  estado: boolean;
  ambiente?: string;
}

export const empresaService = {
  async obtener(): Promise<Empresa> {
    const { data } = await http.get('/empresas/mi-empresa');
    return data;
  },
  async actualizar(datos: Partial<Empresa>) {
    const { data } = await http.patch('/empresas/mi-empresa', datos);
    return data;
  },

  async actualizarCredencialesSol(sol_usuario: string, sol_clave: string) {
    const { data } = await http.patch('/empresas/mi-empresa/credenciales-sol', {
      sol_usuario,
      sol_clave,
    });
    return data;
  },

  async actualizarCertificado(archivo: File, password_certificado: string) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('password_certificado', password_certificado);
    const { data } = await http.post('/empresas/mi-empresa/certificado', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Subir logo (FormData con multipart)
async subirLogo(archivo: File) {
  const formData = new FormData();
  formData.append('logo', archivo);

  const { data } = await http.post('/empresas/mi-empresa/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
},

// Eliminar logo
async eliminarLogo() {
  const { data } = await http.delete('/empresas/mi-empresa/logo');
  return data;
},

// Actualizar color, frase y cuentas
async actualizarPersonalizacion(datos: {
  color_pdf?: string;
  frase_pie_pdf?: string;
  cuentas_bancarias?: string;
}) {
  const { data } = await http.patch('/empresas/mi-empresa/personalizacion-pdf', datos);
  return data;
},

// Obtener mi empresa (incluye los campos del PDF)
async miEmpresa() {
  const { data } = await http.get('/empresas/mi-empresa');
  return data;
},

async previewPdf(personalizacion: {
  color_pdf?: string;
  frase_pie_pdf?: string;
  cuentas_bancarias?: string;
}): Promise<string> {
  const response = await http.post('/empresas/mi-empresa/preview-pdf', personalizacion, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
},

async verificarConfiguracion() {
  const { data } = await http.get('/empresas/mi-empresa/verificar-configuracion');
  return data as {
    empresa_id: string;
    ruc: string;
    razon_social: string;
    ambiente: string;
    tiene_credenciales_sol: boolean;
    todo_listo: boolean;
    faltantes: string[];
  };
},
};