<!-- src/views/ReportesView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { FileSpreadsheet, TrendingUp, TrendingDown } from 'lucide-vue-next';
import {
  reportesService,
  type ReporteResumen,
  type FilaVenta,
  type FilaCompra,
} from '../services/reportes.service';
import { excelService } from '../services/excel.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/ui/BaseButton.vue';

const { moneda } = useFormato();
const toast = useToast();

type Tab = 'ventas' | 'compras';
const tab = ref<Tab>('ventas');

const desde = ref('');
const hasta = ref('');
const cargando = ref(false);

const resumen = ref<ReporteResumen>({ cantidad: 0, gravado: 0, igv: 0, total: 0 });
const filasVentas = ref<FilaVenta[]>([]);
const filasCompras = ref<FilaCompra[]>([]);

function rangoMesActual() {
  const hoy = new Date();
  const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  desde.value = primero.toISOString().split('T')[0];
  hasta.value = hoy.toISOString().split('T')[0];
}

async function generar() {
  cargando.value = true;
  try {
    if (tab.value === 'ventas') {
      const r = await reportesService.ventas(desde.value, hasta.value);
      resumen.value = r.resumen;
      filasVentas.value = r.filas;
    } else {
      const r = await reportesService.compras(desde.value, hasta.value);
      resumen.value = r.resumen;
      filasCompras.value = r.filas;
    }
  } catch {
    toast.error('Error al generar el reporte');
  } finally {
    cargando.value = false;
  }
}

function cambiarTab(t: Tab) {
  tab.value = t;
  generar();
}

const fechaFmt = (f: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');

function exportar() {
  try {
    if (tab.value === 'ventas') {
      if (filasVentas.value.length === 0) return toast.advertencia('No hay datos para exportar');
      excelService.exportar(
        filasVentas.value,
        [
          { clave: 'fecha', titulo: 'Fecha', formato: 'fecha', ancho: 12 },
          { clave: 'tipo', titulo: 'Tipo', ancho: 10 },
          { clave: 'comprobante', titulo: 'Comprobante', ancho: 16 },
          { clave: 'cliente_documento', titulo: 'Doc. Cliente', ancho: 14 },
          { clave: 'cliente', titulo: 'Cliente', ancho: 32 },
          { clave: 'gravado', titulo: 'Gravado', formato: 'moneda', ancho: 12 },
          { clave: 'igv', titulo: 'IGV', formato: 'moneda', ancho: 12 },
          { clave: 'total', titulo: 'Total', formato: 'moneda', ancho: 12 },
          { clave: 'estado', titulo: 'Estado', ancho: 12 },
        ],
        'Reporte_Ventas',
        'Ventas',
      );
    } else {
      if (filasCompras.value.length === 0) return toast.advertencia('No hay datos para exportar');
      excelService.exportar(
        filasCompras.value,
        [
          { clave: 'fecha', titulo: 'Fecha', formato: 'fecha', ancho: 12 },
          { clave: 'documento', titulo: 'Documento', ancho: 16 },
          { clave: 'proveedor', titulo: 'Proveedor', ancho: 32 },
          { clave: 'gravado', titulo: 'Gravado', formato: 'moneda', ancho: 12 },
          { clave: 'igv', titulo: 'IGV', formato: 'moneda', ancho: 12 },
          { clave: 'total', titulo: 'Total', formato: 'moneda', ancho: 12 },
          { clave: 'estado', titulo: 'Estado', ancho: 12 },
        ],
        'Reporte_Compras',
        'Compras',
      );
    }
    toast.exito('Excel generado');
  } catch (e: any) {
    toast.error(e.message || 'No se pudo exportar');
  }
}

const esVentas = computed(() => tab.value === 'ventas');

// --- PLE (Programa de Libros Electrónicos SUNAT) ---
const periodoPle = ref('');
const descargandoPle = ref(false);

function periodoMesActual() {
  const hoy = new Date();
  periodoPle.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

async function descargarPle() {
  if (!periodoPle.value) {
    toast.advertencia('Selecciona el periodo (mes)');
    return;
  }
  const periodo = periodoPle.value.replace('-', ''); // YYYY-MM -> YYYYMM
  descargandoPle.value = true;
  try {
    await reportesService.descargarPle(tab.value, periodo);
    toast.exito('Archivo PLE generado');
  } catch {
    toast.error('No se pudo generar el PLE');
  } finally {
    descargandoPle.value = false;
  }
}

onMounted(() => {
  rangoMesActual();
  periodoMesActual();
  generar();
});
</script>

<template>
  <div>
    <div class="rep__top">
      <h1>Reportes</h1>
      <BaseButton variant="secondary" @click="exportar"><FileSpreadsheet :size="18" /> Exportar Excel</BaseButton>
    </div>

    <!-- Pestañas -->
    <div class="rep__tabs">
      <button :class="{ activo: esVentas }" @click="cambiarTab('ventas')">
        <TrendingUp :size="16" /> Ventas
      </button>
      <button :class="{ activo: !esVentas }" @click="cambiarTab('compras')">
        <TrendingDown :size="16" /> Compras
      </button>
    </div>

    <!-- Filtros -->
    <div class="rep__filtros">
      <label>Desde <input v-model="desde" type="date" /></label>
      <label>Hasta <input v-model="hasta" type="date" /></label>
      <BaseButton :cargando="cargando" @click="generar">Generar</BaseButton>
    </div>

    <!-- PLE (SUNAT) -->
    <div class="rep__ple">
      <div class="rep__ple-info">
        <strong>Registro PLE de {{ esVentas ? 'Ventas' : 'Compras' }}</strong>
        <span>Genera el .txt del PLE para el periodo seleccionado. ⚠️ Valídalo con el Programa Validador SUNAT (SVAP) antes de presentarlo.</span>
      </div>
      <div class="rep__ple-acciones">
        <input v-model="periodoPle" type="month" />
        <BaseButton variant="secondary" :cargando="descargandoPle" @click="descargarPle">
          Descargar PLE .txt
        </BaseButton>
      </div>
    </div>

    <!-- Resumen -->
    <div class="rep__cards">
      <div class="rep__card">
        <span>Comprobantes</span>
        <strong>{{ resumen.cantidad }}</strong>
      </div>
      <div class="rep__card">
        <span>Op. Gravada</span>
        <strong>{{ moneda(resumen.gravado) }}</strong>
      </div>
      <div class="rep__card">
        <span>IGV</span>
        <strong>{{ moneda(resumen.igv) }}</strong>
      </div>
      <div class="rep__card rep__card--total">
        <span>Total</span>
        <strong>{{ moneda(resumen.total) }}</strong>
      </div>
    </div>

    <!-- Tabla -->
    <div class="rep__tabla-wrap">
      <table class="rep__tabla">
        <thead v-if="esVentas">
          <tr>
            <th>Fecha</th><th>Tipo</th><th>Comprobante</th><th>Cliente</th>
            <th class="d">Gravado</th><th class="d">IGV</th><th class="d">Total</th><th>Estado</th>
          </tr>
        </thead>
        <thead v-else>
          <tr>
            <th>Fecha</th><th>Documento</th><th>Proveedor</th>
            <th class="d">Gravado</th><th class="d">IGV</th><th class="d">Total</th><th>Estado</th>
          </tr>
        </thead>

        <tbody v-if="cargando">
          <tr><td :colspan="esVentas ? 8 : 7" class="rep__vacio">Cargando…</td></tr>
        </tbody>
        <tbody v-else-if="esVentas">
          <tr v-if="filasVentas.length === 0"><td colspan="8" class="rep__vacio">Sin ventas en el rango</td></tr>
          <tr v-for="(f, i) in filasVentas" :key="i">
            <td>{{ fechaFmt(f.fecha) }}</td>
            <td>{{ f.tipo }}</td>
            <td>{{ f.comprobante }}</td>
            <td>{{ f.cliente }}</td>
            <td class="d">{{ moneda(f.gravado) }}</td>
            <td class="d">{{ moneda(f.igv) }}</td>
            <td class="d"><strong>{{ moneda(f.total) }}</strong></td>
            <td><span class="badge" :class="f.estado === 'ACEPTADO' ? 'b-verde' : 'b-gris'">{{ f.estado }}</span></td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-if="filasCompras.length === 0"><td colspan="7" class="rep__vacio">Sin compras en el rango</td></tr>
          <tr v-for="(f, i) in filasCompras" :key="i">
            <td>{{ fechaFmt(f.fecha) }}</td>
            <td>{{ f.documento }}</td>
            <td>{{ f.proveedor }}</td>
            <td class="d">{{ moneda(f.gravado) }}</td>
            <td class="d">{{ moneda(f.igv) }}</td>
            <td class="d"><strong>{{ moneda(f.total) }}</strong></td>
            <td><span class="badge b-verde">{{ f.estado }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.rep__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.rep__top h1 { margin: 0; font-size: 1.4rem; }
.rep__tabs { display: flex; gap: .5rem; margin-bottom: 1rem; }
.rep__tabs button { display: inline-flex; align-items: center; gap: .4rem; padding: .5rem 1rem; border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; cursor: pointer; font-size: .9rem; }
.rep__tabs button.activo { background: #6366f1; border-color: #6366f1; color: #fff; }
.rep__filtros { display: flex; align-items: flex-end; gap: .8rem; flex-wrap: wrap; margin-bottom: 1rem; }
.rep__filtros label { display: flex; flex-direction: column; font-size: .8rem; color: #475569; gap: .25rem; }
.rep__filtros input { padding: .5rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.rep__ple { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: .8rem 1rem; margin-bottom: 1rem; }
.rep__ple-info { display: flex; flex-direction: column; gap: .15rem; max-width: 640px; }
.rep__ple-info strong { font-size: .9rem; color: #92400e; }
.rep__ple-info span { font-size: .78rem; color: #a16207; }
.rep__ple-acciones { display: flex; align-items: center; gap: .5rem; }
.rep__ple-acciones input { padding: .5rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.rep__cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: .8rem; margin-bottom: 1rem; }
.rep__card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: .9rem 1.1rem; display: flex; flex-direction: column; gap: .2rem; }
.rep__card span { font-size: .78rem; color: #64748b; }
.rep__card strong { font-size: 1.3rem; color: #0f172a; }
.rep__card--total { background: #eef2ff; border-color: #c7d2fe; }
.rep__card--total strong { color: #4338ca; }
.rep__tabla-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
.rep__tabla { width: 100%; border-collapse: collapse; }
.rep__tabla th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; padding: .7rem .9rem; background: #f8fafc; white-space: nowrap; }
.rep__tabla th.d, .rep__tabla td.d { text-align: right; }
.rep__tabla td { padding: .6rem .9rem; border-top: 1px solid #f1f5f9; white-space: nowrap; }
.rep__vacio { text-align: center; color: #94a3b8; padding: 2rem; }
.badge { padding: .15rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 600; }
.b-verde { background: #dcfce7; color: #16a34a; }
.b-gris { background: #f1f5f9; color: #64748b; }
@media (max-width: 720px) { .rep__cards { grid-template-columns: repeat(2, 1fr); } }
</style>
