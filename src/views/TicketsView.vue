<!-- src/views/TicketsView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Ticket, RefreshCw, Send, CheckCircle2, XCircle, Clock } from 'lucide-vue-next';
import { resumenesService, type Resumen } from '../services/resumenes.service';
import { bajasService, type Baja } from '../services/bajas.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseTabs from '../components/ui/BaseTabs.vue';
import BaseModal from '../components/ui/BaseModal.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseButton from '../components/ui/BaseButton.vue';

const { fecha } = useFormato();
const toast = useToast();

const pestana = ref('resumenes');
const pestanas = [
  { valor: 'resumenes', texto: 'Resúmenes de boletas' },
  { valor: 'bajas', texto: 'Comunicaciones de baja' },
];

const resumenes = ref<Resumen[]>([]);
const bajas = ref<Baja[]>([]);
const cargando = ref(true);
const consultando = ref<string | null>(null); // id que se está consultando

// Modal nuevo resumen
const modalNuevoResumen = ref(false);
const fechaNuevoResumen = ref('');
const enviandoResumen = ref(false);

const columnasResumenes = [
  { clave: 'identificador', titulo: 'Identificador' },
  { clave: 'fecha_referencia', titulo: 'Fecha de las boletas' },
  { clave: 'cantidad_boletas', titulo: 'Boletas', alineacion: 'center' as const },
  { clave: 'fecha_creacion', titulo: 'Enviado' },
  { clave: 'estado', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

const columnasBajas = [
  { clave: 'identificador', titulo: 'Identificador' },
  { clave: 'comprobantes_afectados', titulo: 'Comprobantes', alineacion: 'center' as const },
  { clave: 'fecha_creacion', titulo: 'Enviado' },
  { clave: 'estado', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

async function cargarTodo() {
  cargando.value = true;
  try {
    const [r, b] = await Promise.all([
      resumenesService.listar().catch(() => [] as Resumen[]),
      bajasService.listar().catch(() => [] as Baja[]),
    ]);
    resumenes.value = r;
    bajas.value = b;
  } finally {
    cargando.value = false;
  }
}

async function consultarResumen(id: string) {
  consultando.value = id;
  try {
    const data = await resumenesService.consultarEstado(id);
    if (data.estado === 'ACEPTADO') {
      toast.exito('Resumen aceptado por SUNAT');
    } else if (data.estado === 'RECHAZADO') {
      toast.error('Resumen rechazado por SUNAT');
    } else {
      toast.info('Aún en proceso. SUNAT puede demorar.');
    }
    await cargarTodo();
  } catch {
    toast.error('No se pudo consultar el estado');
  } finally {
    consultando.value = null;
  }
}

async function consultarBaja(id: string) {
  consultando.value = id;
  try {
    const data = await bajasService.consultarEstado(id);
    if (data.estado === 'ACEPTADO') {
      toast.exito('Baja aceptada por SUNAT');
    } else if (data.estado === 'RECHAZADO') {
      toast.error('Baja rechazada por SUNAT');
    } else {
      toast.info('Aún en proceso. SUNAT puede demorar.');
    }
    await cargarTodo();
  } catch {
    toast.error('No se pudo consultar el estado');
  } finally {
    consultando.value = null;
  }
}

function abrirNuevoResumen() {
  // Por defecto, ayer (lo más común: enviar el resumen del día anterior)
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  fechaNuevoResumen.value = ayer.toISOString().split('T')[0];
  modalNuevoResumen.value = true;
}

async function enviarResumen() {
  if (!fechaNuevoResumen.value) {
    toast.advertencia('Selecciona una fecha');
    return;
  }
  enviandoResumen.value = true;
  try {
    const data = await resumenesService.enviar(fechaNuevoResumen.value);
    if (data.estado === 'PENDIENTE') {
      toast.exito(`Resumen enviado. Ticket: ${data.ticket}`);
    } else {
      toast.error(data.error || 'No se pudo enviar el resumen');
    }
    modalNuevoResumen.value = false;
    await cargarTodo();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al enviar el resumen');
  } finally {
    enviandoResumen.value = false;
  }
}

function iconoEstado(estado: string) {
  if (estado === 'ACEPTADO') return CheckCircle2;
  if (estado === 'RECHAZADO') return XCircle;
  return Clock; // PENDIENTE / EN_PROCESO
}

onMounted(cargarTodo);
</script>

<template>
  <div class="anim-entrada">
    <div class="tk-header">
      <div class="tk-header__icono"><Ticket :size="24" /></div>
      <div>
        <h1>Envíos asíncronos a SUNAT</h1>
        <p class="pagina-subtitulo">Resúmenes diarios de boletas y comunicaciones de baja</p>
      </div>
      <div class="tk-header__acciones">
        <BaseButton variant="secondary" @click="cargarTodo">
          <RefreshCw :size="18" /> Actualizar
        </BaseButton>
        <BaseButton @click="abrirNuevoResumen">
          <Send :size="18" /> Nuevo resumen
        </BaseButton>
      </div>
    </div>

    <BaseTabs v-model="pestana" :pestanas="pestanas" />

    <!-- RESÚMENES -->
    <BaseTable
      v-if="pestana === 'resumenes'"
      :columnas="columnasResumenes"
      :filas="resumenes"
      :cargando="cargando"
      texto-vacio="No has enviado resúmenes diarios aún."
    >
      <template #fecha_referencia="{ valor }">{{ fecha(valor) }}</template>
      <template #fecha_creacion="{ valor }">{{ fecha(valor) }}</template>
      <template #estado="{ valor }">
        <span class="estado" :class="`estado--${valor.toLowerCase()}`">
          <component :is="iconoEstado(valor)" :size="14" />
          {{ valor }}
        </span>
      </template>
      <template #acciones="{ fila }">
        <button
          v-if="fila.estado !== 'ACEPTADO' && fila.estado !== 'RECHAZADO'"
          class="btn-icono"
          :disabled="consultando === fila.id"
          @click="consultarResumen(fila.id)"
          title="Consultar estado"
        >
          <RefreshCw :size="18" :class="{ 'spin': consultando === fila.id }" />
        </button>
      </template>
    </BaseTable>

    <!-- BAJAS -->
    <BaseTable
      v-if="pestana === 'bajas'"
      :columnas="columnasBajas"
      :filas="bajas"
      :cargando="cargando"
      texto-vacio="No has enviado comunicaciones de baja aún."
    >
      <template #fecha_creacion="{ valor }">{{ fecha(valor) }}</template>
      <template #estado="{ valor }">
        <span class="estado" :class="`estado--${valor.toLowerCase()}`">
          <component :is="iconoEstado(valor)" :size="14" />
          {{ valor }}
        </span>
      </template>
      <template #acciones="{ fila }">
        <button
          v-if="fila.estado !== 'ACEPTADO' && fila.estado !== 'RECHAZADO'"
          class="btn-icono"
          :disabled="consultando === fila.id"
          @click="consultarBaja(fila.id)"
          title="Consultar estado"
        >
          <RefreshCw :size="18" :class="{ 'spin': consultando === fila.id }" />
        </button>
      </template>
    </BaseTable>

    <!-- Modal nuevo resumen -->
    <BaseModal v-model="modalNuevoResumen" titulo="Enviar resumen diario de boletas">
      <div class="form">
        <p class="form__info">
          Selecciona la fecha de las boletas que deseas informar a SUNAT.
          Se incluirán todas las boletas aceptadas emitidas ese día.
        </p>
        <BaseInput v-model="fechaNuevoResumen" label="Fecha de las boletas" tipo="date" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="modalNuevoResumen = false">Cancelar</BaseButton>
        <BaseButton :cargando="enviandoResumen" @click="enviarResumen">Enviar a SUNAT</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.tk-header {
  display: flex; align-items: center; gap: var(--space-md);
  margin-bottom: var(--space-lg); flex-wrap: wrap;
}
.tk-header__icono {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent);
  border-radius: var(--radius-md);
}
.tk-header__acciones { margin-left: auto; display: flex; gap: var(--space-sm); }
.pagina-subtitulo { color: var(--text-secondary); margin-top: 2px; }

.estado {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: var(--text-xs); font-weight: 600;
  padding: 4px 10px; border-radius: var(--radius-sm);
}
.estado--aceptado { background: var(--success-soft); color: var(--success); }
.estado--rechazado { background: var(--danger-soft); color: var(--danger); }
.estado--pendiente, .estado--en_proceso {
  background: var(--warning-soft); color: var(--warning);
}

.btn-icono {
  background: none; border: none; color: var(--accent);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
}
.btn-icono:hover:not(:disabled) { background: var(--accent-soft); }
.btn-icono:disabled { opacity: 0.5; cursor: wait; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

.form { display: flex; flex-direction: column; gap: var(--space-md); }
.form__info {
  font-size: var(--text-sm); color: var(--text-secondary);
  background: var(--bg-surface-2); padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
}
</style>