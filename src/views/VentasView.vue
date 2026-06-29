<!-- src/views/VentasView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Plus, FileText, Eye, Trash2, Receipt, Filter, X,
  CheckCircle2, XCircle, Ban, Download, AlertTriangle
} from 'lucide-vue-next';
import { excelService } from '../services/excel.service';
import { ventasService, type VentaLista } from '../services/ventas.service';
import { useFormato } from '../composables/useFormato';
import { useConfirm } from '../composables/useConfirm';
import { useToast } from '../composables/useToast';
import { useFrases } from '../composables/useFrases';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import AnularComprobanteDialog from '../components/ui/AnularComprobanteDialog.vue';

const router = useRouter();
const { moneda, fecha } = useFormato();
const { confirmar } = useConfirm();
const toast = useToast();
const { frase } = useFrases();

// ============== ESTADO ==============
const ventas = ref<VentaLista[]>([]);
const cargando = ref(true);
const textoCarga = ref(frase('ventas'));

// Filtros
const mostrarFiltros = ref(false);
const filtroDesde = ref('');
const filtroHasta = ref('');
const filtroTipo = ref('');
const filtroEstado = ref('');

const tiposComprobante = [
  { valor: '', texto: 'Todos' },
  { valor: '01', texto: 'Factura' },
  { valor: '03', texto: 'Boleta' },
];

const estadosOpciones = [
  { valor: '', texto: 'Todos' },
  { valor: 'ACEPTADO', texto: 'Aceptado' },
  { valor: 'RECHAZADO', texto: 'Rechazado' },
  { valor: 'ANULADA', texto: 'Anulado' },
];

// Modal de anular
const dialogAnularAbierto = ref(false);
const ventaParaAnular = ref<any>(null);

// ============== COLUMNAS ==============
const columnas = [
  { clave: 'fecha_emision', titulo: 'Fecha' },
  { clave: 'comprobante', titulo: 'Comprobante' },
  { clave: 'tipo_nombre', titulo: 'Tipo' },
  { clave: 'cliente', titulo: 'Cliente' },
  { clave: 'importe_total', titulo: 'Total', alineacion: 'right' as const },
  { clave: 'estado_sunat', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

// ============== FILTROS ==============
const hayFiltrosActivos = computed(() =>
  !!filtroDesde.value || !!filtroHasta.value || !!filtroTipo.value || !!filtroEstado.value
);

async function aplicarFiltros() {
  await cargar();
}

function limpiarFiltros() {
  filtroDesde.value = '';
  filtroHasta.value = '';
  filtroTipo.value = '';
  filtroEstado.value = '';
  cargar();
}

function rangoHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  filtroDesde.value = hoy;
  filtroHasta.value = hoy;
  cargar();
}

function rangoEsteMes() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  filtroDesde.value = inicioMes.toISOString().split('T')[0];
  filtroHasta.value = ahora.toISOString().split('T')[0];
  cargar();
}

function rangoMesAnterior() {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
  filtroDesde.value = inicio.toISOString().split('T')[0];
  filtroHasta.value = fin.toISOString().split('T')[0];
  cargar();
}

// ============== CARGAR DATOS ==============
async function cargar() {
  cargando.value = true;
  try {
    ventas.value = await ventasService.listar({
      desde: filtroDesde.value || undefined,
      hasta: filtroHasta.value || undefined,
      tipo: filtroTipo.value || undefined,
      estado: filtroEstado.value || undefined,
    });
  } catch {
    toast.error('No se pudieron cargar las ventas');
  } finally {
    cargando.value = false;
  }
}

// ============== ACCIONES ==============
async function verPdf(id: string, formato: 'a4' | 'ticket' = 'a4') {
  try {
    const url = await ventasService.obtenerPdf(id, formato);
    window.open(url, '_blank');
  } catch {
    toast.error('No se pudo cargar el PDF');
  }
}

function verDetalle(id: string) {
  router.push(`/ventas/${id}`);
}

function abrirDialogAnular(venta: any) {
  if (venta.estado_sunat !== 'ACEPTADO') {
    anularInternoSilencioso(venta);
    return;
  }
  ventaParaAnular.value = venta;
  dialogAnularAbierto.value = true;
}

async function anularInternoSilencioso(venta: any) {
  const ok = await confirmar({
    titulo: '¿Anular comprobante?',
    mensaje: 'Este comprobante no fue aceptado por SUNAT, así que solo se anulará en tu sistema.',
    textoConfirmar: 'Anular',
    peligro: true,
  });
  if (!ok) return;
  try {
    await ventasService.anular(venta.id);
    toast.exito('Comprobante anulado');
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo anular');
  }
}

async function ejecutarBaja(motivo: string) {
  const venta = ventaParaAnular.value;
  if (!venta) return;
  
  try {
    const resultado = await ventasService.enviarBajaSunat(venta.id, motivo);
    
    // Si llega aquí, SUNAT dio ticket → siempre PENDIENTE
    toast.exito(`Baja enviada a SUNAT. Ticket: ${resultado.ticket}`);
    await cargar();
    
  } catch (e: any) {
    // Manejo mejorado de errores
    const errorData = e.response?.data?.message;
    
    if (errorData?.sunat_descripcion) {
      // SUNAT rechazó la baja inmediatamente
      toast.error(`SUNAT rechazó la baja: ${errorData.sunat_descripcion}`);
    } else if (errorData?.mensaje) {
      // Mensaje con objeto
      toast.error(errorData.mensaje);
    } else if (typeof errorData === 'string') {
      // Mensaje simple
      toast.error(errorData);
    } else {
      toast.error('Error al enviar la baja');
    }
  }
}

function ejecutarNotaCredito() {
  const venta = ventaParaAnular.value;
  if (!venta) return;
  const partes = venta.comprobante.split('-');
  const serie = partes[0];
  const numero = parseInt(partes[1], 10);
  router.push({
    path: '/notas/nueva-credito',
    query: {
      tipo: venta.tipo_comprobante,
      serie,
      numero: String(numero),
    },
  });
}

async function ejecutarSoloInterna() {
  const venta = ventaParaAnular.value;
  if (!venta) return;
  try {
    await ventasService.anular(venta.id);
    toast.exito('Comprobante anulado solo en el sistema');
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo anular');
  }
}

function exportarExcel() {
  if (ventas.value.length === 0) {
    toast.advertencia('No hay comprobantes para exportar');
    return;
  }

  try {
    excelService.exportar(
      ventas.value,
      [
        { clave: 'fecha_emision', titulo: 'Fecha', formato: 'fecha', ancho: 12 },
        { clave: 'comprobante', titulo: 'Comprobante', ancho: 18 },
        { clave: 'tipo_nombre', titulo: 'Tipo', ancho: 10 },
        { clave: 'cliente', titulo: 'Cliente', ancho: 35 },
        { clave: 'importe_total', titulo: 'Total', formato: 'moneda', ancho: 12 },
        { clave: 'estado_sunat', titulo: 'Estado', ancho: 12 },
      ],
      'ventas',
      'Ventas',
    );
    toast.exito(`${ventas.value.length} comprobantes exportados`);
  } catch (e: any) {
    toast.error(e.message || 'Error al exportar');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1>Ventas</h1>
        <p class="pagina-subtitulo">Comprobantes emitidos</p>
      </div>
      <div class="pagina-header__acciones">
        <BaseButton
          variant="secondary"
          @click="mostrarFiltros = !mostrarFiltros"
        >
          <Filter :size="18" />
          Filtros
          <span v-if="hayFiltrosActivos" class="filtro-badge"></span>
        </BaseButton>
        
        <!-- NUEVO botón -->
        <BaseButton
          variant="secondary"
          @click="exportarExcel"
          :disabled="ventas.length === 0"
        >
          <Download :size="18" /> Excel
        </BaseButton>
        
        <BaseButton @click="router.push('/ventas/nueva')">
          <Plus :size="18" /> Nueva venta
        </BaseButton>
      </div>
    </div>

    <!-- Panel de filtros -->
    <Transition name="filtros">
      <div v-if="mostrarFiltros" class="filtros-panel">
        <div class="filtros-panel__grid">
          <BaseInput v-model="filtroDesde" label="Desde" tipo="date" />
          <BaseInput v-model="filtroHasta" label="Hasta" tipo="date" />
          <BaseSelect v-model="filtroTipo" label="Tipo" :opciones="tiposComprobante" />
          <BaseSelect v-model="filtroEstado" label="Estado" :opciones="estadosOpciones" />
        </div>

        <div class="filtros-panel__atajos">
          <button class="btn-atajo" @click="rangoHoy">Hoy</button>
          <button class="btn-atajo" @click="rangoEsteMes">Este mes</button>
          <button class="btn-atajo" @click="rangoMesAnterior">Mes anterior</button>
          <span class="atajos-separador"></span>
          <button class="btn-atajo btn-atajo--principal" @click="aplicarFiltros">Buscar</button>
          <button v-if="hayFiltrosActivos" class="btn-atajo btn-atajo--clear" @click="limpiarFiltros">
            <X :size="14" /> Limpiar
          </button>
        </div>
      </div>
    </Transition>

    <!-- Tabla -->
    <BaseTable
      :columnas="columnas"
      :filas="ventas"
      :cargando="cargando"
      texto-vacio="No tienes comprobantes que coincidan con los filtros."
    >
      <template #fecha_emision="{ valor }">{{ fecha(valor) }}</template>
      <template #comprobante="{ fila }">
        <button class="link-comprobante" @click="verDetalle(fila.id)">
          {{ fila.comprobante }}
        </button>
      </template>
      <template #importe_total="{ valor }"><strong>{{ moneda(valor) }}</strong></template>
      <template #estado_sunat="{ valor }">
        <span class="estado" :class="{
          'estado--ok': valor === 'ACEPTADO',
          'estado--error': valor === 'RECHAZADO',
          'estado--anulada': valor === 'ANULADA',
        }">
          <CheckCircle2 v-if="valor === 'ACEPTADO'" :size="14" />
          <XCircle v-if="valor === 'RECHAZADO'" :size="14" />
          <Ban v-if="valor === 'ANULADA'" :size="14" />
          {{ valor }}
        </span>
      </template>
      <template #acciones="{ fila }">
        <div class="acciones-fila">
          <button class="btn-icono" @click="verDetalle(fila.id)" title="Ver detalle">
            <Eye :size="18" />
          </button>
          <button v-if="fila.estado_sunat === 'ACEPTADO'"
            class="btn-icono"
            @click="verPdf(fila.id, 'a4')"
            title="Descargar A4">
            <FileText :size="18" />
          </button>
          <button v-if="fila.estado_sunat === 'ACEPTADO'"
            class="btn-icono"
            @click="verPdf(fila.id, 'ticket')"
            title="Descargar ticket 80mm">
            <Receipt :size="18" />
          </button>
          <button
            v-if="fila.estado_sunat !== 'ANULADA'"
            class="btn-icono btn-icono--danger"
            @click="abrirDialogAnular(fila)"
            title="Anular venta"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </template>
    </BaseTable>

    <!-- Modal de decisión para anular -->
    <AnularComprobanteDialog
      v-if="ventaParaAnular"
      v-model="dialogAnularAbierto"
      :tipo-comprobante="ventaParaAnular.tipo_comprobante"
      :comprobante="ventaParaAnular.comprobante"
      @baja="ejecutarBaja"
      @nota-credito="ejecutarNotaCredito"
      @solo-interna="ejecutarSoloInterna"
    />
  </div>
</template>

<style scoped>
.pagina-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
  gap: var(--space-md);
}
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; }
.pagina-header__acciones { display: flex; gap: var(--space-sm); position: relative; }

.filtro-badge {
  position: absolute;
  top: -4px; right: -4px;
  width: 10px; height: 10px;
  background: var(--accent);
  border: 2px solid var(--bg-surface);
  border-radius: 50%;
}

/* Panel de filtros */
.filtros-panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.filtros-panel__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}
.filtros-panel__atajos {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-wrap: wrap;
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
}
.atajos-separador { flex: 1; }

.btn-atajo {
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-atajo:hover {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent);
}
.btn-atajo--principal {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.btn-atajo--principal:hover {
  filter: brightness(0.92);
  background: var(--accent);
  color: white;
}
.btn-atajo--clear { color: var(--danger); }
.btn-atajo--clear:hover {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--danger);
}

.filtros-enter-active, .filtros-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.filtros-enter-from, .filtros-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Estados con icono */
.estado {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}
.estado--ok { background: var(--success-soft); color: var(--success); }
.estado--error { background: var(--danger-soft); color: var(--danger); }
.estado--anulada { background: var(--warning-soft); color: var(--warning); }

/* Link de comprobante */
.link-comprobante {
  background: none;
  border: none;
  color: var(--accent);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
}
.link-comprobante:hover { text-decoration: underline; }

/* Acciones */
.acciones-fila {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.btn-icono {
  background: none; border: none; color: var(--accent);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
  cursor: pointer;
}
.btn-icono:hover { background: var(--accent-soft); }
.btn-icono--danger { color: var(--danger); }
.btn-icono--danger:hover { background: var(--danger-soft); }

@media (max-width: 900px) {
  .filtros-panel__grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 600px) {
  .filtros-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>