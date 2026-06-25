<!-- src/views/VehiculosView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Plus, Pencil, Trash2, Car, Building, User,
} from 'lucide-vue-next';
import {
  vehiculosService,
  type Vehiculo,
  type CrearVehiculo,
} from '../services/vehiculos.service';
import {
  transportistasService,
  type Transportista,
} from '../services/transportistas.service';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import { useFormato } from '../composables/useFormato';
import { useFrases } from '../composables/useFrases';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseModal from '../components/ui/BaseModal.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';

const toast = useToast();
const { confirmar } = useConfirm();
const { fecha } = useFormato();
const { frase } = useFrases();

const vehiculos = ref<Vehiculo[]>([]);
const transportistas = ref<Transportista[]>([]);
const cargando = ref(true);
const textoCarga = ref(frase('configuracion'));

// Filtro de la tabla
const filtroOrigen = ref<'todos' | 'propios' | 'terceros'>('todos');

const vehiculosFiltrados = computed(() => {
  if (filtroOrigen.value === 'propios') {
    return vehiculos.value.filter((v) => v.es_propio);
  }
  if (filtroOrigen.value === 'terceros') {
    return vehiculos.value.filter((v) => !v.es_propio);
  }
  return vehiculos.value;
});

// Modal
const modalAbierto = ref(false);
const guardando = ref(false);
const editandoId = ref<string | null>(null);

const form = ref<CrearVehiculo>({
  placa: '',
  marca: '',
  modelo: '',
  certificado_mtc: '',
  transportista_id: '',
  es_propio: true,
});

// Opciones para el select de transportista
const transportistasOpciones = computed(() => [
  { valor: '', texto: '— Seleccionar —' },
  ...transportistas.value.map((t) => ({
    valor: t.id,
    texto: t.razon_social,
  })),
]);

const columnas = [
  { clave: 'placa', titulo: 'Placa' },
  { clave: 'marca_modelo', titulo: 'Marca / Modelo' },
  { clave: 'es_propio', titulo: 'Origen', alineacion: 'center' as const },
  { clave: 'transportista', titulo: 'Transportista' },
  { clave: 'certificado_mtc', titulo: 'Cert. MTC', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    const [vehs, trans] = await Promise.all([
      vehiculosService.listar(),
      transportistasService.listar(),
    ]);
    vehiculos.value = vehs;
    transportistas.value = trans;
  } catch {
    toast.error('No se pudieron cargar los vehículos');
  } finally {
    cargando.value = false;
  }
}

function nombreTransportista(id: string | null): string {
  if (!id) return '—';
  const t = transportistas.value.find((tr) => tr.id === id);
  return t?.razon_social || '—';
}

function abrirModalCrear() {
  editandoId.value = null;
  form.value = {
    placa: '',
    marca: '',
    modelo: '',
    certificado_mtc: '',
    transportista_id: '',
    es_propio: true,
  };
  modalAbierto.value = true;
}

function abrirModalEditar(v: Vehiculo) {
  editandoId.value = v.id;
  form.value = {
    placa: v.placa,
    marca: v.marca || '',
    modelo: v.modelo || '',
    certificado_mtc: v.certificado_mtc || '',
    transportista_id: v.transportista_id || '',
    es_propio: v.es_propio,
  };
  modalAbierto.value = true;
}

// Cuando cambia "es_propio", limpia o requiere transportista
function onCambioEsPropio() {
  if (form.value.es_propio) {
    form.value.transportista_id = '';
  }
}

async function guardar() {
  if (!form.value.placa) {
    toast.advertencia('Ingresa la placa del vehículo');
    return;
  }
  if (!form.value.es_propio && !form.value.transportista_id) {
    toast.advertencia('Si el vehículo no es propio, debes elegir el transportista');
    return;
  }

  guardando.value = true;
  try {
    const payload: Partial<CrearVehiculo> = {
      placa: form.value.placa.toUpperCase(),
      marca: form.value.marca || undefined,
      modelo: form.value.modelo || undefined,
      certificado_mtc: form.value.certificado_mtc || undefined,
      es_propio: form.value.es_propio,
    };

    if (!form.value.es_propio) {
      payload.transportista_id = form.value.transportista_id;
    }

    if (editandoId.value) {
      await vehiculosService.actualizar(editandoId.value, payload);
      toast.exito('Vehículo actualizado');
    } else {
      await vehiculosService.crear(payload as CrearVehiculo);
      toast.exito('Vehículo creado');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo guardar');
  } finally {
    guardando.value = false;
  }
}

async function desactivar(v: Vehiculo) {
  const ok = await confirmar({
    titulo: '¿Desactivar vehículo?',
    mensaje: `La placa ${v.placa} ya no aparecerá al crear nuevas guías.`,
    textoConfirmar: 'Desactivar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await vehiculosService.desactivar(v.id);
    toast.exito('Vehículo desactivado');
    await cargar();
  } catch {
    toast.error('No se pudo desactivar');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1><Car :size="22" /> Vehículos</h1>
        <p class="pagina-subtitulo">Tus vehículos y los de transportistas externos</p>
      </div>
      <BaseButton @click="abrirModalCrear">
        <Plus :size="18" /> Nuevo vehículo
      </BaseButton>
    </div>

    <!-- Filtros tipo tabs -->
    <div class="filtros-tabs">
      <button
        class="tab"
        :class="{ 'tab--activo': filtroOrigen === 'todos' }"
        @click="filtroOrigen = 'todos'"
      >
        Todos ({{ vehiculos.length }})
      </button>
      <button
        class="tab"
        :class="{ 'tab--activo': filtroOrigen === 'propios' }"
        @click="filtroOrigen = 'propios'"
      >
        <User :size="14" /> Propios ({{ vehiculos.filter(v => v.es_propio).length }})
      </button>
      <button
        class="tab"
        :class="{ 'tab--activo': filtroOrigen === 'terceros' }"
        @click="filtroOrigen = 'terceros'"
      >
        <Building :size="14" /> De terceros ({{ vehiculos.filter(v => !v.es_propio).length }})
      </button>
    </div>

    <BaseTable
      :columnas="columnas"
      :filas="vehiculosFiltrados"
      :cargando="cargando"
      :texto-cargando="textoCarga"
      texto-vacio="No tienes vehículos registrados. Crea el primero para empezar."
    >
      <template #placa="{ valor }">
        <span class="placa">{{ valor }}</span>
      </template>
      <template #marca_modelo="{ fila }">
        <div class="marca-modelo">
          <div>{{ fila.marca || '—' }}</div>
          <div class="modelo">{{ fila.modelo || '' }}</div>
        </div>
      </template>
      <template #es_propio="{ valor }">
        <span class="badge" :class="valor ? 'badge--propio' : 'badge--tercero'">
          {{ valor ? 'Propio' : 'Tercero' }}
        </span>
      </template>
      <template #transportista="{ fila }">
        {{ fila.es_propio ? '—' : nombreTransportista(fila.transportista_id) }}
      </template>
      <template #certificado_mtc="{ valor }">
        {{ valor || '—' }}
      </template>
      <template #acciones="{ fila }">
        <div class="acciones-fila">
          <button class="btn-icono" @click="abrirModalEditar(fila)" title="Editar">
            <Pencil :size="18" />
          </button>
          <button class="btn-icono btn-icono--danger" @click="desactivar(fila)" title="Desactivar">
            <Trash2 :size="18" />
          </button>
        </div>
      </template>
    </BaseTable>

    <!-- Modal crear/editar -->
    <BaseModal
      v-model="modalAbierto"
      :titulo="editandoId ? 'Editar vehículo' : 'Nuevo vehículo'"
    >
      <div class="form">
        <BaseInput
          v-model="form.placa"
          label="Placa"
          placeholder="ABC-123"
          @input="(e: any) => form.placa = e.target.value.toUpperCase()"
        />

        <div class="form__grid-2">
          <BaseInput v-model="form.marca" label="Marca (opcional)" placeholder="Toyota" />
          <BaseInput v-model="form.modelo" label="Modelo (opcional)" placeholder="Hilux 2024" />
        </div>

        <BaseInput
          v-model="form.certificado_mtc"
          label="Certificado MTC (opcional)"
          placeholder="Para vehículos habilitados"
        />

        <div class="form__radio-group">
          <label class="form__label">Origen del vehículo</label>
          <div class="radio-grid">
            <label class="radio-card" :class="{ 'radio-card--activo': form.es_propio }">
              <input
                type="radio"
                :value="true"
                v-model="form.es_propio"
                @change="onCambioEsPropio"
              />
              <User :size="20" />
              <div>
                <strong>Propio</strong>
                <p>Vehículo de mi empresa</p>
              </div>
            </label>
            <label class="radio-card" :class="{ 'radio-card--activo': !form.es_propio }">
              <input
                type="radio"
                :value="false"
                v-model="form.es_propio"
                @change="onCambioEsPropio"
              />
              <Building :size="20" />
              <div>
                <strong>De un transportista</strong>
                <p>Vehículo de una empresa de transporte</p>
              </div>
            </label>
          </div>
        </div>

        <BaseSelect
          v-if="!form.es_propio"
          v-model="form.transportista_id"
          label="Transportista"
          :opciones="transportistasOpciones"
        />
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="modalAbierto = false">Cancelar</BaseButton>
        <BaseButton :cargando="guardando" @click="guardar">
          {{ editandoId ? 'Actualizar' : 'Crear' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.pagina-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}
.pagina-header h1 {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.pagina-subtitulo {
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Tabs de filtros */
.filtros-tabs {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  border-bottom: 1px solid var(--border);
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 10px 18px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: var(--transition);
}
.tab:hover {
  color: var(--accent);
}
.tab--activo {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

/* Placa con estilo */
.placa {
  display: inline-block;
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-weight: 700;
  letter-spacing: 1px;
}

/* Marca / modelo */
.marca-modelo {
  display: flex;
  flex-direction: column;
}
.modelo {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* Badges */
.badge {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
}
.badge--propio { background: var(--success-soft); color: var(--success); }
.badge--tercero { background: var(--info-soft); color: var(--info); }

/* Acciones */
.acciones-fila {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.btn-icono {
  background: none;
  border: none;
  color: var(--accent);
  padding: 6px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  cursor: pointer;
}
.btn-icono:hover { background: var(--accent-soft); }
.btn-icono--danger { color: var(--danger); }
.btn-icono--danger:hover { background: var(--danger-soft); }

/* Formulario */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}
.form__grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}
.form__label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

/* Radio cards */
.radio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}
.radio-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface-2);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}
.radio-card:hover {
  border-color: var(--accent);
}
.radio-card--activo {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.radio-card input[type="radio"] {
  display: none;
}
.radio-card strong {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-primary);
}
.radio-card p {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 700px) {
  .form__grid-2,
  .radio-grid {
    grid-template-columns: 1fr;
  }
}
</style>