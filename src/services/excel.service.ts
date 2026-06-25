// src/services/excel.service.ts
import * as XLSX from 'xlsx';

interface ColumnaExcel {
  clave: string;       // nombre del campo en los datos
  titulo: string;      // texto del encabezado
  ancho?: number;      // ancho de columna (caracteres)
  formato?: 'moneda' | 'fecha' | 'numero' | 'texto';
}

export const excelService = {
  /**
   * Exporta datos a un archivo Excel y dispara la descarga.
   * @param datos Array de objetos a exportar
   * @param columnas Definición de columnas (clave, título, formato)
   * @param nombreArchivo Nombre del archivo sin extensión
   * @param nombreHoja Nombre de la hoja en el libro Excel
   */
  exportar(
    datos: any[],
    columnas: ColumnaExcel[],
    nombreArchivo: string,
    nombreHoja: string = 'Datos',
  ) {
    if (datos.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Crear filas con los títulos como encabezados
    const filas = datos.map((d) => {
      const fila: any = {};
      for (const col of columnas) {
        let valor = d[col.clave];
        // Aplicar formato según tipo
        if (col.formato === 'moneda' && typeof valor === 'number') {
          valor = Number(valor.toFixed(2));
        }
        if (col.formato === 'fecha' && valor) {
          valor = new Date(valor).toLocaleDateString('es-PE');
        }
        fila[col.titulo] = valor ?? '';
      }
      return fila;
    });

    // Crear hoja
    const hoja = XLSX.utils.json_to_sheet(filas);

    // Aplicar anchos de columna
    hoja['!cols'] = columnas.map((c) => ({ wch: c.ancho || 15 }));

    // Crear libro y agregar la hoja
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);

    // Generar nombre con fecha
    const fechaHoy = new Date().toISOString().split('T')[0];
    const archivoFinal = `${nombreArchivo}_${fechaHoy}.xlsx`;

    // Descargar
    XLSX.writeFile(libro, archivoFinal);
  },
};