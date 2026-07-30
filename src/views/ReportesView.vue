<!-- src/views/ReportesView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { FileSpreadsheet, Printer } from 'lucide-vue-next';
import {
  reportesService,
  type ReporteResumen,
  type FilaVenta,
  type FilaCompra,
  type ResumenIgv,
  type FilaRentabilidad,
  type ResumenTributario,
  type FilaFormaPago,
  type Comparativo,
} from '../services/reportes.service';
import { cajaService } from '../services/caja.service';
import { excelService } from '../services/excel.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/ui/BaseButton.vue';

const { moneda } = useFormato();
const toast = useToast();

type Tab = 'ventas' | 'compras' | 'igv' | 'rentabilidad' | 'tributos' | 'caja' | 'comparativo';
const tab = ref<Tab>('ventas');

const tabs: { id: Tab; texto: string }[] = [
  { id: 'ventas', texto: 'Ventas' },
  { id: 'compras', texto: 'Compras' },
  { id: 'igv', texto: 'IGV' },
  { id: 'rentabilidad', texto: 'Rentabilidad' },
  { id: 'tributos', texto: 'Tributos' },
  { id: 'comparativo', texto: 'Comparativo' },
  { id: 'caja', texto: 'Caja' },
];

const desde = ref('');
const hasta = ref('');
const cargando = ref(false);

// Datos
const resumen = ref<ReporteResumen>({ cantidad: 0, gravado: 0, igv: 0, total: 0 });
const filasVentas = ref<FilaVenta[]>([]);
const filasCompras = ref<FilaCompra[]>([]);
const igv = ref<ResumenIgv | null>(null);
const rent = ref<{ resumen: FilaRentabilidad; detalle: FilaRentabilidad[] } | null>(null);
const tributos = ref<ResumenTributario | null>(null);
const formasPago = ref<FilaFormaPago[]>([]);
const caja = ref<any[]>([]);
const comp = ref<Comparativo | null>(null);
const periodoComp = ref('');

// Filtro tipo comprobante (ventas)
const filtroTipo = ref('');
const ventasFiltradas = computed(() =>
  filtroTipo.value ? filasVentas.value.filter((f) => f.tipo === filtroTipo.value) : filasVentas.value,
);

function rangoMesActual() {
  const hoy = new Date();
  desde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  hasta.value = hoy.toISOString().split('T')[0];
}

async function generar() {
  cargando.value = true;
  try {
    if (tab.value === 'ventas') {
      const r = await reportesService.ventas(desde.value, hasta.value);
      resumen.value = r.resumen;
      filasVentas.value = r.filas;
      formasPago.value = await reportesService.formasPago(desde.value, hasta.value);
    } else if (tab.value === 'compras') {
      const r = await reportesService.compras(desde.value, hasta.value);
      resumen.value = r.resumen;
      filasCompras.value = r.filas;
    } else if (tab.value === 'igv') {
      igv.value = await reportesService.igv(desde.value, hasta.value);
    } else if (tab.value === 'rentabilidad') {
      rent.value = await reportesService.rentabilidad(desde.value, hasta.value);
    } else if (tab.value === 'tributos') {
      tributos.value = await reportesService.tributario(desde.value, hasta.value);
    } else if (tab.value === 'caja') {
      caja.value = await cajaService.historial();
    } else if (tab.value === 'comparativo') {
      comp.value = await reportesService.comparativo(periodoComp.value.replace('-', ''));
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
const fechaHoraFmt = (f: string) => (f ? new Date(f).toLocaleString('es-PE') : '—');

function imprimir() {
  window.print();
}

// --- PLE ---
const periodoPle = ref('');
const descandoPle = ref(false);
async function descargarPle() {
  if (!periodoPle.value) return toast.advertencia('Selecciona el periodo (mes)');
  const periodo = periodoPle.value.replace('-', '');
  descandoPle.value = true;
  try {
    await reportesService.descargarPle(tab.value === 'compras' ? 'compras' : 'ventas', periodo);
    toast.exito('Archivo PLE generado');
  } catch {
    toast.error('No se pudo generar el PLE');
  } finally {
    descandoPle.value = false;
  }
}

// --- Excel ---
function exportar() {
  if (tab.value === 'ventas') {
    if (ventasFiltradas.value.length === 0) return toast.advertencia('No hay datos para exportar');
    excelService.exportar(
      ventasFiltradas.value,
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
  } else if (tab.value === 'compras') {
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
  } else if (tab.value === 'rentabilidad' && rent.value) {
    excelService.exportar(
      rent.value.detalle,
      [
        { clave: 'producto', titulo: 'Producto', ancho: 32 },
        { clave: 'cantidad', titulo: 'Cantidad', formato: 'numero', ancho: 10 },
        { clave: 'vendido', titulo: 'Vendido', formato: 'moneda', ancho: 12 },
        { clave: 'costo', titulo: 'Costo', formato: 'moneda', ancho: 12 },
        { clave: 'utilidad', titulo: 'Utilidad', formato: 'moneda', ancho: 12 },
        { clave: 'margen', titulo: 'Margen %', formato: 'numero', ancho: 10 },
      ],
      'Reporte_Rentabilidad',
      'Rentabilidad',
    );
  } else {
    toast.advertencia('Este reporte no tiene exportación a Excel');
  }
}

const mostrarExcel = computed(() => ['ventas', 'compras', 'rentabilidad'].includes(tab.value));
const mostrarPle = computed(() => ['ventas', 'compras'].includes(tab.value));
const usaRango = computed(() => !['caja', 'comparativo'].includes(tab.value));

onMounted(() => {
  rangoMesActual();
  const hoy = new Date();
  const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  periodoPle.value = mes;
  periodoComp.value = mes;
  generar();
});
</script>

<template>
  <div class="rep">
    <div class="rep__top no-print">
      <h1>Reportes</h1>
      <div class="rep__top-acc">
        <BaseButton v-if="mostrarExcel" variant="secondary" @click="exportar"><FileSpreadsheet :size="18" /> Excel</BaseButton>
        <BaseButton variant="secondary" @click="imprimir"><Printer :size="18" /> Imprimir / PDF</BaseButton>
      </div>
    </div>

    <!-- Pestañas -->
    <div class="rep__tabs no-print">
      <button v-for="t in tabs" :key="t.id" :class="{ activo: tab === t.id }" @click="cambiarTab(t.id)">
        {{ t.texto }}
      </button>
    </div>

    <!-- Filtros -->
    <div class="rep__filtros no-print" v-if="usaRango">
      <label>Desde <input v-model="desde" type="date" /></label>
      <label>Hasta <input v-model="hasta" type="date" /></label>
      <label v-if="tab === 'ventas'">Tipo
        <select v-model="filtroTipo">
          <option value="">Todos</option>
          <option value="Factura">Facturas</option>
          <option value="Boleta">Boletas</option>
        </select>
      </label>
      <BaseButton :cargando="cargando" @click="generar">Generar</BaseButton>
    </div>

    <!-- Filtro comparativo (mes) -->
    <div class="rep__filtros no-print" v-if="tab === 'comparativo'">
      <label>Mes <input v-model="periodoComp" type="month" /></label>
      <BaseButton :cargando="cargando" @click="generar">Comparar</BaseButton>
    </div>

    <!-- PLE -->
    <div class="rep__ple no-print" v-if="mostrarPle">
      <div class="rep__ple-info">
        <strong>Registro PLE de {{ tab === 'compras' ? 'Compras' : 'Ventas' }}</strong>
        <span>⚠️ Valida el .txt con el Programa Validador SUNAT (SVAP) antes de presentarlo.</span>
      </div>
      <div class="rep__ple-acc">
        <input v-model="periodoPle" type="month" />
        <BaseButton variant="secondary" :cargando="descandoPle" @click="descargarPle">PLE .txt</BaseButton>
      </div>
    </div>

    <!-- ===================== VENTAS / COMPRAS ===================== -->
    <template v-if="tab === 'ventas' || tab === 'compras'">
      <div class="rep__cards">
        <div class="rep__card"><span>Comprobantes</span><strong>{{ resumen.cantidad }}</strong></div>
        <div class="rep__card"><span>Op. Gravada</span><strong>{{ moneda(resumen.gravado) }}</strong></div>
        <div class="rep__card"><span>IGV</span><strong>{{ moneda(resumen.igv) }}</strong></div>
        <div class="rep__card rep__card--total"><span>Total</span><strong>{{ moneda(resumen.total) }}</strong></div>
      </div>

      <div v-if="tab === 'ventas' && formasPago.length" class="rep__pagos">
        <span class="rep__pagos-t">Por forma de pago:</span>
        <span v-for="fp in formasPago" :key="fp.metodo" class="rep__pago-chip">
          {{ fp.metodo }}: <strong>{{ moneda(fp.total) }}</strong>
        </span>
      </div>

      <div class="rep__tabla-wrap">
        <table class="rep__tabla">
          <thead v-if="tab === 'ventas'">
            <tr><th>Fecha</th><th>Tipo</th><th>Comprobante</th><th>Cliente</th><th class="d">Gravado</th><th class="d">IGV</th><th class="d">Total</th><th>Estado</th></tr>
          </thead>
          <thead v-else>
            <tr><th>Fecha</th><th>Documento</th><th>Proveedor</th><th class="d">Gravado</th><th class="d">IGV</th><th class="d">Total</th><th>Estado</th></tr>
          </thead>
          <tbody v-if="cargando"><tr><td :colspan="tab === 'ventas' ? 8 : 7" class="rep__vacio">Cargando…</td></tr></tbody>
          <tbody v-else-if="tab === 'ventas'">
            <tr v-if="ventasFiltradas.length === 0"><td colspan="8" class="rep__vacio">Sin ventas en el rango</td></tr>
            <tr v-for="(f, i) in ventasFiltradas" :key="i">
              <td>{{ fechaFmt(f.fecha) }}</td><td>{{ f.tipo }}</td><td>{{ f.comprobante }}</td><td>{{ f.cliente }}</td>
              <td class="d">{{ moneda(f.gravado) }}</td><td class="d">{{ moneda(f.igv) }}</td>
              <td class="d"><strong>{{ moneda(f.total) }}</strong></td>
              <td><span class="badge" :class="f.estado === 'ACEPTADO' ? 'b-verde' : 'b-gris'">{{ f.estado }}</span></td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr v-if="filasCompras.length === 0"><td colspan="7" class="rep__vacio">Sin compras en el rango</td></tr>
            <tr v-for="(f, i) in filasCompras" :key="i">
              <td>{{ fechaFmt(f.fecha) }}</td><td>{{ f.documento }}</td><td>{{ f.proveedor }}</td>
              <td class="d">{{ moneda(f.gravado) }}</td><td class="d">{{ moneda(f.igv) }}</td>
              <td class="d"><strong>{{ moneda(f.total) }}</strong></td>
              <td><span class="badge b-verde">{{ f.estado }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ===================== IGV ===================== -->
    <template v-else-if="tab === 'igv'">
      <div v-if="igv" class="rep__cards">
        <div class="rep__card"><span>IGV Ventas (débito fiscal)</span><strong>{{ moneda(igv.igv_debito) }}</strong></div>
        <div class="rep__card"><span>IGV Compras (crédito fiscal)</span><strong>{{ moneda(igv.igv_credito) }}</strong></div>
        <div class="rep__card" :class="igv.igv_a_pagar > 0 ? 'rep__card--pagar' : 'rep__card--favor'">
          <span>{{ igv.igv_a_pagar > 0 ? 'IGV a pagar' : 'Saldo a favor' }}</span>
          <strong>{{ moneda(igv.igv_a_pagar > 0 ? igv.igv_a_pagar : igv.saldo_a_favor) }}</strong>
        </div>
      </div>
      <div v-if="igv" class="rep__igv-detalle">
        <div><span>Base gravada ventas</span><strong>{{ moneda(igv.ventas.gravado) }}</strong> <em>({{ igv.ventas.cantidad }} compr.)</em></div>
        <div><span>Base gravada compras</span><strong>{{ moneda(igv.compras.gravado) }}</strong> <em>({{ igv.compras.cantidad }} compr.)</em></div>
      </div>
      <p class="rep__nota">Débito − Crédito del periodo. Referencial para tu declaración; confírmalo con tu contador.</p>
    </template>

    <!-- ===================== RENTABILIDAD ===================== -->
    <template v-else-if="tab === 'rentabilidad'">
      <div v-if="rent" class="rep__cards">
        <div class="rep__card"><span>Vendido</span><strong>{{ moneda(rent.resumen.vendido) }}</strong></div>
        <div class="rep__card"><span>Costo</span><strong>{{ moneda(rent.resumen.costo) }}</strong></div>
        <div class="rep__card rep__card--total"><span>Utilidad</span><strong>{{ moneda(rent.resumen.utilidad) }}</strong></div>
        <div class="rep__card"><span>Margen</span><strong>{{ rent.resumen.margen }}%</strong></div>
      </div>
      <div class="rep__tabla-wrap">
        <table class="rep__tabla">
          <thead><tr><th>Producto</th><th class="d">Cant.</th><th class="d">Vendido</th><th class="d">Costo</th><th class="d">Utilidad</th><th class="d">Margen</th></tr></thead>
          <tbody v-if="cargando"><tr><td colspan="6" class="rep__vacio">Cargando…</td></tr></tbody>
          <tbody v-else>
            <tr v-if="!rent || rent.detalle.length === 0"><td colspan="6" class="rep__vacio">Sin ventas en el rango</td></tr>
            <tr v-for="(f, i) in rent?.detalle" :key="i">
              <td>{{ f.producto }}</td><td class="d">{{ f.cantidad }}</td>
              <td class="d">{{ moneda(f.vendido) }}</td><td class="d">{{ moneda(f.costo) }}</td>
              <td class="d"><strong :class="f.utilidad >= 0 ? 'pos' : 'neg'">{{ moneda(f.utilidad) }}</strong></td>
              <td class="d">{{ f.margen }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="rep__nota">Costo estimado con el precio de compra de cada producto.</p>
    </template>

    <!-- ===================== TRIBUTOS ===================== -->
    <template v-else-if="tab === 'tributos'">
      <div v-if="tributos" class="rep__cards">
        <div class="rep__card"><span>Detracciones</span><strong>{{ moneda(tributos.detracciones.total) }}</strong><em>{{ tributos.detracciones.cantidad }} comprobantes</em></div>
        <div class="rep__card"><span>Retenciones</span><strong>{{ moneda(tributos.retenciones.total) }}</strong><em>{{ tributos.retenciones.cantidad }} comprobantes</em></div>
        <div class="rep__card"><span>Percepciones</span><strong>{{ moneda(tributos.percepciones.total) }}</strong><em>{{ tributos.percepciones.cantidad }} comprobantes</em></div>
      </div>
      <p class="rep__nota">Montos del periodo. Las detracciones se depositan en tu cuenta del Banco de la Nación.</p>
    </template>

    <!-- ===================== COMPARATIVO ===================== -->
    <template v-else-if="tab === 'comparativo'">
      <div v-if="comp" class="rep__tabla-wrap">
        <table class="rep__tabla">
          <thead>
            <tr>
              <th>Métrica</th>
              <th class="d">{{ comp.anterior.periodo }} (anterior)</th>
              <th class="d">{{ comp.actual.periodo }} (actual)</th>
              <th class="d">Variación</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ventas</td>
              <td class="d">{{ moneda(comp.anterior.ventas_total) }}</td>
              <td class="d"><strong>{{ moneda(comp.actual.ventas_total) }}</strong></td>
              <td class="d"><span :class="comp.variacion.ventas_total >= 0 ? 'pos' : 'neg'">{{ comp.variacion.ventas_total >= 0 ? '▲' : '▼' }} {{ Math.abs(comp.variacion.ventas_total) }}%</span></td>
            </tr>
            <tr>
              <td>Compras</td>
              <td class="d">{{ moneda(comp.anterior.compras_total) }}</td>
              <td class="d"><strong>{{ moneda(comp.actual.compras_total) }}</strong></td>
              <td class="d"><span :class="comp.variacion.compras_total >= 0 ? 'azul' : 'pos'">{{ comp.variacion.compras_total >= 0 ? '▲' : '▼' }} {{ Math.abs(comp.variacion.compras_total) }}%</span></td>
            </tr>
            <tr>
              <td>Utilidad</td>
              <td class="d">{{ moneda(comp.anterior.utilidad) }}</td>
              <td class="d"><strong>{{ moneda(comp.actual.utilidad) }}</strong></td>
              <td class="d"><span :class="comp.variacion.utilidad >= 0 ? 'pos' : 'neg'">{{ comp.variacion.utilidad >= 0 ? '▲' : '▼' }} {{ Math.abs(comp.variacion.utilidad) }}%</span></td>
            </tr>
            <tr>
              <td>N° comprobantes</td>
              <td class="d">{{ comp.anterior.ventas_cantidad }}</td>
              <td class="d"><strong>{{ comp.actual.ventas_cantidad }}</strong></td>
              <td class="d">—</td>
            </tr>
            <tr>
              <td>IGV neto (débito − crédito)</td>
              <td class="d">{{ moneda(comp.anterior.igv_neto) }}</td>
              <td class="d"><strong>{{ moneda(comp.actual.igv_neto) }}</strong></td>
              <td class="d">—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="rep__nota">Compara el mes seleccionado contra el mes inmediatamente anterior.</p>
    </template>

    <!-- ===================== CAJA ===================== -->
    <template v-else-if="tab === 'caja'">
      <div class="rep__tabla-wrap">
        <table class="rep__tabla">
          <thead><tr><th>Apertura</th><th>Cierre</th><th>Usuario</th><th class="d">Inicial</th><th class="d">Ventas efec.</th><th class="d">Esperado</th><th class="d">Contado</th><th class="d">Diferencia</th></tr></thead>
          <tbody v-if="cargando"><tr><td colspan="8" class="rep__vacio">Cargando…</td></tr></tbody>
          <tbody v-else>
            <tr v-if="caja.length === 0"><td colspan="8" class="rep__vacio">Sin arqueos de caja</td></tr>
            <tr v-for="c in caja" :key="c.id">
              <td>{{ fechaHoraFmt(c.fecha_apertura) }}</td>
              <td>{{ fechaHoraFmt(c.fecha_cierre) }}</td>
              <td>{{ c.usuario_email || '—' }}</td>
              <td class="d">{{ moneda(c.monto_inicial) }}</td>
              <td class="d">{{ moneda(c.ventas_efectivo) }}</td>
              <td class="d">{{ moneda(c.monto_esperado) }}</td>
              <td class="d">{{ c.monto_contado != null ? moneda(c.monto_contado) : '—' }}</td>
              <td class="d">
                <strong v-if="c.diferencia != null" :class="c.diferencia === 0 ? 'pos' : c.diferencia > 0 ? 'azul' : 'neg'">
                  {{ moneda(c.diferencia) }}
                </strong>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rep__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.rep__top h1 { margin: 0; font-size: 1.4rem; }
.rep__top-acc { display: flex; gap: .5rem; }
.rep__tabs { display: flex; gap: .4rem; margin-bottom: 1rem; flex-wrap: wrap; }
.rep__tabs button { padding: .45rem 1rem; border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; cursor: pointer; font-size: .85rem; }
.rep__tabs button.activo { background: #6366f1; border-color: #6366f1; color: #fff; }
.rep__filtros { display: flex; align-items: flex-end; gap: .8rem; flex-wrap: wrap; margin-bottom: 1rem; }
.rep__filtros label { display: flex; flex-direction: column; font-size: .8rem; color: #475569; gap: .25rem; }
.rep__filtros input, .rep__filtros select { padding: .5rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.rep__ple { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: .7rem 1rem; margin-bottom: 1rem; }
.rep__ple-info { display: flex; flex-direction: column; gap: .1rem; }
.rep__ple-info strong { font-size: .88rem; color: #92400e; }
.rep__ple-info span { font-size: .76rem; color: #a16207; }
.rep__ple-acc { display: flex; align-items: center; gap: .5rem; }
.rep__ple-acc input { padding: .5rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.rep__cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: .8rem; margin-bottom: 1rem; }
.rep__card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: .9rem 1.1rem; display: flex; flex-direction: column; gap: .15rem; }
.rep__card span { font-size: .78rem; color: #64748b; }
.rep__card strong { font-size: 1.3rem; color: #0f172a; }
.rep__card em { font-size: .72rem; color: #94a3b8; font-style: normal; }
.rep__card--total { background: #eef2ff; border-color: #c7d2fe; }
.rep__card--total strong { color: #4338ca; }
.rep__card--pagar { background: #fee2e2; border-color: #fecaca; }
.rep__card--pagar strong { color: #b91c1c; }
.rep__card--favor { background: #dcfce7; border-color: #bbf7d0; }
.rep__card--favor strong { color: #16a34a; }
.rep__pagos { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin-bottom: 1rem; font-size: .82rem; }
.rep__pagos-t { color: #64748b; }
.rep__pago-chip { background: #f1f5f9; padding: .25rem .6rem; border-radius: 999px; color: #475569; }
.rep__igv-detalle { display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1rem; }
.rep__igv-detalle div { font-size: .85rem; color: #64748b; }
.rep__igv-detalle strong { color: #0f172a; }
.rep__igv-detalle em { color: #94a3b8; font-style: normal; font-size: .78rem; }
.rep__nota { font-size: .8rem; color: #94a3b8; margin-top: .5rem; }
.rep__tabla-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
.rep__tabla { width: 100%; border-collapse: collapse; }
.rep__tabla th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; padding: .7rem .9rem; background: #f8fafc; white-space: nowrap; }
.rep__tabla th.d, .rep__tabla td.d { text-align: right; }
.rep__tabla td { padding: .6rem .9rem; border-top: 1px solid #f1f5f9; white-space: nowrap; }
.rep__vacio { text-align: center; color: #94a3b8; padding: 2rem; }
.badge { padding: .15rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 600; }
.b-verde { background: #dcfce7; color: #16a34a; }
.b-gris { background: #f1f5f9; color: #64748b; }
.pos { color: #16a34a; } .neg { color: #b91c1c; } .azul { color: #1d4ed8; }
@media (max-width: 720px) { .rep__cards { grid-template-columns: repeat(2, 1fr); } }
@media print { .no-print { display: none !important; } }
</style>
