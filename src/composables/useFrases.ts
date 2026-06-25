// src/composables/useFrases.ts
// Frases con personalidad para reemplazar el aburrido "Cargando..."
// Cada categoría tiene varias frases que rotan aleatoriamente.

const frases = {
  // Carga general (cuando no encaja en otra categoría)
  general: [
    'Un momento, casi listo...',
    'Preparando todo para ti...',
    'Un instante, por favor...',
    'Organizando la información...',
  ],

  // Pantallas de listado / tablas
  productos: [
    'Reuniendo tu catálogo...',
    'Buscando tus productos...',
    'Trayendo el inventario...',
  ],
  ventas: [
    'Trayendo tus comprobantes...',
    'Reuniendo las ventas...',
    'Preparando el historial...',
  ],
  clientes: [
    'Buscando tus clientes...',
    'Reuniendo tu cartera...',
  ],
  proveedores: [
    'Reuniendo tus proveedores...',
    'Cargando tu red de aliados...',
  ],
  compras: [
    'Trayendo el historial de compras...',
    'Reuniendo tus adquisiciones...',
  ],
  notas: [
    'Reuniendo tus notas...',
    'Trayendo los ajustes emitidos...',
  ],

  // Dashboard y reportes
  dashboard: [
    'Calculando tus números...',
    'Dándole sentido a los datos...',
    'Preparando tu resumen del día...',
    'Reuniendo tu información...',
  ],

  // Finanzas
  finanzas: [
    'Sumando los movimientos...',
    'Cuadrando tu caja...',
    'Calculando los saldos...',
  ],

  // Configuración / seguridad
  configuracion: [
    'Cargando tus datos...',
    'Trayendo tu configuración...',
  ],
  seguridad: [
    'Asegurando tu configuración...',
    'Cargando con cuidado...',
  ],

  // Inicio de sesión
  inicio: [
    'Preparando tu espacio de trabajo...',
    'Bienvenido, organizando todo para ti...',
    'Cargando tu día...',
  ],

  // ============ ACCIONES (botones, no spinners de pantalla) ============

  // Guardado de datos
  guardando: [
    'Guardando con cuidado...',
    'Asegurando tu información...',
    'Un segundo, lo dejamos perfecto...',
  ],

  // Consultas a SUNAT (RUC/DNI vía Decolecta)
  sunat: [
    'Conectando con SUNAT...',
    'Consultando los datos oficiales...',
    'Un momento, hablando con SUNAT...',
  ],

  // Emitir comprobante
  emitiendo: [
    'Enviando a SUNAT...',
    'Procesando tu comprobante...',
    'Casi listo, asegurando todo...',
  ],

  // Consultar estado (resúmenes, bajas)
  consultando: [
    'Consultando el estado...',
    'Verificando con SUNAT...',
    'Trayendo la última información...',
  ],

  // Generación de PDF
  pdf: [
    'Preparando tu PDF...',
    'Generando el documento...',
  ],

  // Procesos sensibles
  certificado: [
    'Asegurando tu certificado...',
    'Procesando con cuidado...',
  ],
};

type CategoriaFrase = keyof typeof frases;

export function useFrases() {
  /**
   * Devuelve una frase aleatoria de la categoría indicada.
   * Si la categoría no existe, usa 'general'.
   */
  function frase(categoria: CategoriaFrase = 'general'): string {
    const lista = frases[categoria] || frases.general;
    return lista[Math.floor(Math.random() * lista.length)];
  }

  return { frase };
}