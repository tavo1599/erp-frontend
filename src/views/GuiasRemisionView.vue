<!-- src/views/GuiasRemisionView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Plus, FileText, Eye, Filter, X, CheckCircle2, XCircle,
  Clock, MapPin, Truck, Weight,
} from 'lucide-vue-next';
import {
  guiasRemisionService,
  type GuiaLista,
} from '../services/guias-remision.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import { useFrases } from '../composables/useFrases';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';

const router = useRouter();
const { fecha } = useFormato();
const toast = useToast();
const { frase } = useFrases();

const guias = ref<GuiaLista[]>([]);
const cargando = ref(true);
const textoCarga = ref(frase('ventas'));

// Filtros
const mostrarFiltros = ref(false);
const filtroDesde = ref('');
const filtroHasta = ref('');
const filtroEstado = ref('');

const estadosOpciones = [
  { valor: '', texto: 'Todos' },
  { valor: 'ACEPTADO', texto: 'Aceptado' },
  { valor: 'RECHAZADO', texto: 'Rechazado' },
  { valor: 'ANULADA', texto: 'Anulado' },
];

const hayFiltrosActivos = computed(() =>
  !!filtroDesde.value || !!filtroHasta.value || !!filtroEstado.value
);

const columnas = [
  { clave: 'fecha_emision', titulo: 'Fecha emisión' },
  { clave: 'guia', titulo: 'Guía' },
  { clave: 'tipo_nombre', titulo: 'Tipo', alineacion: 'center' as const },
  { clave: 'destinatario', titulo: 'Destinatario' },
  { clave: 'modalidad', titulo: 'Modalidad', alineacion: 'center' as const },
  { clave: 'peso_total', titulo: 'Peso (KG)', alineacion: 'right' as const },
  { clave: 'estado_sunat', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    guias.value = await guiasRemisionService.listar({
      desde: filtroDesde.value || undefined,
      hasta: filtroHasta.value || undefined,
      estado: filtroEstado.value || undefined,
    });
  } catch {
    toast.error('No se pudieron cargar las guías');
  } finally {
    cargando.value = false;
  }
}

function limpiarFiltros() {
  filtroDesde.value = '';
  filtroHasta.value = '';
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

function verDetalle(id: string) {
  router.push(`/guias-remision/${id}`);
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1><Truck :size="22" /> Guías de remisión</h1>
        <p class="pagina-subtitulo">Documentos de traslado de mercadería</p>
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
        <BaseButton @click="router.push('/guias-remision/nueva')">
          <Plus :size="18" /> Nueva guía
        </BaseButton>
      </div>
    </div>

    <!-- Panel de filtros -->
    <Transition name="filtros">
      <div v-if="mostrarFiltros" class="filtros-panel">
        <div class="filtros-panel__grid">
          <BaseInput v-model="filtroDesde" label="Desde" tipo="date" />
          <BaseInput v-model="filtroHasta" label="Hasta" tipo="date" />
          <BaseSelect v-model="filtroEstado" label="Estado" :opciones="estadosOpciones" />
        </div>

        <div class="filtros-panel__atajos">
          <button class="btn-atajo" @click="rangoHoy">Hoy</button>
          <button class="btn-atajo" @click="rangoEsteMes">Este mes</button>
          <span class="atajos-separador"></span>
          <button class="btn-atajo btn-atajo--principal" @click="cargar">Buscar</button>
          <button v-if="hayFiltrosActivos" class="btn-atajo btn-atajo--clear" @click="limpiarFiltros">
            <X :size="14" /> Limpiar
          </button>
        </div>
      </div>
    </Transition>

    <BaseTable
      :columnas="columnas"
      :filas="guias"
      :cargando="cargando"
      :texto-cargando="textoCarga"
      texto-vacio="No tienes guías de remisión emitidas aún. Crea la primera para empezar."
    >
      <template #fecha_emision="{ valor }">{{ fecha(valor) }}</template>
      <template #guia="{ valor }">
        <strong class="guia-numero">{{ valor }}</strong>
      </template>
      <template #tipo_nombre="{ valor }">
        <span class="badge-tipo">{{ valor }}</span>
      </template>
      <template #modalidad="{ valor }">
        <span class="badge-modalidad" :class="`badge-modalidad--${valor.toLowerCase()}`">
          {{ valor }}
        </span>
      </template>
      <template #peso_total="{ valor }">
        <span class="peso">
          <Weight :size="12" /> {{ Number(valor).toFixed(2) }}
        </span>
      </template>
      <template #estado_sunat="{ valor }">
        <span class="estado" :class="{
          'estado--ok': valor === 'ACEPTADO',
          'estado--error': valor === 'RECHAZADO',
          'estado--pend': valor === 'PENDIENTE',
        }">
          <CheckCircle2 v-if="valor === 'ACEPTADO'" :size="14" />
          <XCircle v-if="valor === 'RECHAZADO'" :size="14" />
          <Clock v-if="valor === 'PENDIENTE'" :size="14" />
          {{ valor }}
        </span>
      </template>
      <template #acciones="{ fila }">
        <div class="acciones-fila">
          <button class="btn-icono" @click="verDetalle(fila.id)" title="Ver detalle">
            <Eye :size="18" />
          </button>
        </div>
      </template>
    </BaseTable>
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
.pagina-header h1 { display: flex; align-items: center; gap: var(--space-sm); }
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

.filtros-panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
  border: 1px solid var(--border);
}
.filtros-panel__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}
.filtros-panel__atajos {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-atajo:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.btn-atajo--principal {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.btn-atajo--clear { color: var(--danger); }

.filtros-enter-active, .filtros-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.filtros-enter-from, .filtros-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.guia-numero {
  color: var(--accent);
  font-family: monospace;
}

.badge-tipo {
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
}

.badge-modalidad {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
}
.badge-modalidad--pública { background: var(--info-soft); color: var(--info); }
.badge-modalidad--privada { background: var(--success-soft); color: var(--success); }

.peso {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-family: monospace;
}

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
.estado--pend { background: var(--warning-soft); color: var(--warning); }

.acciones-fila { display: flex; gap: 6px; justify-content: center; }
.btn-icono {
  background: none; border: none; color: var(--accent);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
  cursor: pointer;
}
.btn-icono:hover { background: var(--accent-soft); }
</style>