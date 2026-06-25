<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { History, ChevronLeft, ChevronRight, X } from 'lucide-vue-next';
import { auditoriaService, type ResultadoAuditoria } from '../services/auditoria.service';
import { useFormato } from '../composables/useFormato';
import { useFrases } from '../composables/useFrases';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';
import BaseButton from '../components/ui/BaseButton.vue';

const { fecha } = useFormato();
const { frase } = useFrases();
const textoCarga = ref(frase('general'));

const resultado = ref<ResultadoAuditoria | null>(null);
const cargando = ref(true);

const filtroAccion = ref('');
const filtroDesde = ref('');
const filtroHasta = ref('');
const pagina = ref(1);

const acciones = [
  { valor: '', texto: 'Todas' },
  { valor: 'EMITIR_VENTA', texto: 'Emisión de venta' },
  { valor: 'ANULAR_VENTA', texto: 'Anulación de venta' },
  { valor: 'CREAR_PRODUCTO', texto: 'Creación de producto' },
  { valor: 'EDITAR_PRODUCTO', texto: 'Edición de producto' },
];

const columnas = [
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'usuario_email', titulo: 'Usuario' },
  { clave: 'accion', titulo: 'Acción' },
  { clave: 'recurso', titulo: 'Recurso', alineacion: 'center' as const },
  { clave: 'detalles', titulo: 'Detalles' },
  { clave: 'ip', titulo: 'IP', alineacion: 'center' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    resultado.value = await auditoriaService.listar({
      accion: filtroAccion.value || undefined,
      desde: filtroDesde.value || undefined,
      hasta: filtroHasta.value || undefined,
      pagina: pagina.value,
    });
  } finally {
    cargando.value = false;
  }
}

function limpiar() {
  filtroAccion.value = '';
  filtroDesde.value = '';
  filtroHasta.value = '';
  pagina.value = 1;
  cargar();
}

function paginaAnterior() {
  if (pagina.value > 1) {
    pagina.value--;
    cargar();
  }
}
function paginaSiguiente() {
  if (resultado.value && pagina.value < resultado.value.totalPaginas) {
    pagina.value++;
    cargar();
  }
}

function descripcionAccion(a: string) {
  const map: Record<string, string> = {
    EMITIR_VENTA: 'Emitió venta',
    ANULAR_VENTA: 'Anuló venta',
    CREAR_PRODUCTO: 'Creó producto',
    EDITAR_PRODUCTO: 'Editó producto',
  };
  return map[a] || a;
}

function detallesLegibles(reg: any): string {
  if (!reg.datos_despues) return '—';
  const d = reg.datos_despues;
  if (d.comprobante) return `${d.comprobante}${d.cliente ? ' - ' + d.cliente : ''}`;
  if (d.nombre) return d.nombre;
  return JSON.stringify(d).substring(0, 60);
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1>
          <History :size="22" /> Auditoría
        </h1>
        <p class="pagina-subtitulo">Historial de acciones del sistema</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filtros">
      <BaseSelect v-model="filtroAccion" label="Acción" :opciones="acciones" />
      <BaseInput v-model="filtroDesde" label="Desde" tipo="date" />
      <BaseInput v-model="filtroHasta" label="Hasta" tipo="date" />
      <div class="filtros__botones">
        <BaseButton @click="cargar">Buscar</BaseButton>
        <button class="btn-limpiar" @click="limpiar"><X :size="16" /></button>
      </div>
    </div>

    <BaseTable
      :columnas="columnas"
      :filas="resultado?.registros || []"
      :cargando="cargando"
      :texto-cargando="textoCarga"
      texto-vacio="No hay acciones registradas."
    >
      <template #fecha="{ valor }">{{ fecha(valor) }} {{ new Date(valor).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }}</template>
      <template #accion="{ valor }">
        <span class="badge-accion">{{ descripcionAccion(valor) }}</span>
      </template>
      <template #detalles="{ fila }">{{ detallesLegibles(fila) }}</template>
      <template #ip="{ valor }">{{ valor || '—' }}</template>
    </BaseTable>

    <!-- Paginación -->
    <div v-if="resultado && resultado.totalPaginas > 1" class="paginacion">
      <button class="btn-page" :disabled="pagina === 1" @click="paginaAnterior">
        <ChevronLeft :size="16" /> Anterior
      </button>
      <span class="paginacion__info">
        Página {{ pagina }} de {{ resultado.totalPaginas }} ({{ resultado.total }} registros)
      </span>
      <button class="btn-page" :disabled="pagina === resultado.totalPaginas" @click="paginaSiguiente">
        Siguiente <ChevronRight :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagina-header { margin-bottom: var(--space-lg); }
.pagina-header h1 { display: flex; align-items: center; gap: var(--space-sm); }
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; }

.filtros {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: var(--space-md);
  align-items: end;
  margin-bottom: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}
.filtros__botones { display: flex; gap: var(--space-sm); }
.btn-limpiar {
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  height: 40px; width: 40px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
}
.btn-limpiar:hover { background: var(--danger-soft); color: var(--danger); }

.badge-accion {
  font-size: var(--text-xs);
  padding: 3px 10px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.paginacion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
}
.paginacion__info { font-size: var(--text-sm); color: var(--text-secondary); }
.btn-page {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 8px 14px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  font-weight: 600; font-size: var(--text-sm);
}
.btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-page:hover:not(:disabled) { background: var(--accent); color: white; }
</style>