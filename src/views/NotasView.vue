<!-- src/views/NotasView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { notasService, type NotaLista } from '../services/notas.service';
import { useFormato } from '../composables/useFormato';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseTabs from '../components/ui/BaseTabs.vue';
import { FileText } from 'lucide-vue-next';
import { useToast } from '../composables/useToast';
import { useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import BaseButton from '../components/ui/BaseButton.vue';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();

const { moneda, fecha } = useFormato();
const toast = useToast();
const auth = useAuthStore();

const notas = ref<NotaLista[]>([]);
const cargando = ref(true);
const filtro = ref('todas');

const filtros = [
  { valor: 'todas', texto: 'Todas' },
  { valor: '07', texto: 'Notas de crédito' },
  { valor: '08', texto: 'Notas de débito' },
];

const columnas = [
  { clave: 'comprobante', titulo: 'Comprobante' },
  { clave: 'tipo_nombre', titulo: 'Tipo' },
  { clave: 'documento_afectado', titulo: 'Afecta a' },
  { clave: 'motivo', titulo: 'Motivo' },
  { clave: 'importe_total', titulo: 'Total', alineacion: 'right' as const },
  { clave: 'estado_sunat', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },   // ← AGREGAR
];

async function cargar() {
  cargando.value = true;
  try {
    const tipoNota = filtro.value === 'todas' ? undefined : filtro.value;
    notas.value = await notasService.listar(tipoNota ? { tipo_nota: tipoNota } : undefined);
  } finally {
    cargando.value = false;
  }
}

function cambiarFiltro(valor: string) {
  filtro.value = valor;
  cargar();
}

async function verPdf(id: string) {
  try {
    const url = await notasService.obtenerPdf(id);
    window.open(url, '_blank');
  } catch {
    toast.error('No se pudo cargar el PDF');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1>Notas de crédito y débito</h1>
        <p class="pagina-subtitulo">Comprobantes de ajuste emitidos</p>
      </div>
      <BaseButton 
  v-if="auth.tienePermiso('crear_notas')"
  @click="router.push('/notas/nueva-credito')"
>
  <Plus :size="18" /> Nueva nota de crédito
</BaseButton>
    </div>

    <BaseTabs :model-value="filtro" :pestanas="filtros" @update:model-value="cambiarFiltro" />

    <BaseTable :columnas="columnas" :filas="notas" :cargando="cargando" texto-vacio="No has emitido notas aún.">
      <template #importe_total="{ valor }"><strong>{{ moneda(valor) }}</strong></template>
      <template #estado_sunat="{ valor }">
        <span class="badge" :class="{
          'badge--ok': valor === 'ACEPTADO',
          'badge--error': valor === 'RECHAZADO',
        }">{{ valor }}</span>
      </template>
      <template #acciones="{ fila }">
  <button 
    v-if="fila.estado_sunat === 'ACEPTADO' && auth.tienePermiso('descargar_pdf_xml')" 
    class="btn-icono" 
    @click="verPdf(fila.id)" 
    title="Ver PDF"
  >
    <FileText :size="18" />
  </button>
</template>
    </BaseTable>
  </div>
</template>

<style scoped>
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; margin-bottom: var(--space-lg); }
.badge { font-size: var(--text-xs); font-weight: 600; padding: 4px 10px; border-radius: var(--radius-sm); }
.badge--ok { background: var(--success-soft); color: var(--success); }
.badge--error { background: var(--danger-soft); color: var(--danger); }
.btn-icono {
  background: none; border: none; color: var(--accent);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
}
.btn-icono:hover { background: var(--accent-soft); }
.pagina-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-lg);
}
</style>