<!-- src/views/DireccionesTrasladoView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Plus, Pencil, Trash2, MapPin, Star, ArrowUpFromLine, ArrowDownToLine, Repeat,
} from 'lucide-vue-next';
import {
  direccionesTrasladoService,
  type DireccionTraslado,
  type CrearDireccionTraslado,
} from '../services/direcciones-traslado.service';
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

const direcciones = ref<DireccionTraslado[]>([]);
const cargando = ref(true);
const textoCarga = ref(frase('configuracion'));

// Filtro por tipo
const filtroTipo = ref<'todos' | 'PARTIDA' | 'LLEGADA' | 'AMBOS'>('todos');

const direccionesFiltradas = computed(() => {
  if (filtroTipo.value === 'todos') return direcciones.value;
  return direcciones.value.filter((d) => d.tipo === filtroTipo.value);
});

// Modal
const modalAbierto = ref(false);
const guardando = ref(false);
const editandoId = ref<string | null>(null);

const form = ref<CrearDireccionTraslado>({
  nombre: '',
  ubigeo: '',
  direccion: '',
  departamento: '',
  provincia: '',
  distrito: '',
  tipo: 'AMBOS',
  es_predeterminada: false,
});

const tiposDireccion = [
  { valor: 'AMBOS', texto: 'Ambos (origen y destino)' },
  { valor: 'PARTIDA', texto: 'Solo origen' },
  { valor: 'LLEGADA', texto: 'Solo destino' },
];

const columnas = [
  { clave: 'nombre', titulo: 'Nombre' },
  { clave: 'direccion_completa', titulo: 'Dirección' },
  { clave: 'tipo', titulo: 'Uso', alineacion: 'center' as const },
  { clave: 'es_predeterminada', titulo: 'Predet.', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    direcciones.value = await direccionesTrasladoService.listar();
  } catch {
    toast.error('No se pudieron cargar las direcciones');
  } finally {
    cargando.value = false;
  }
}

function abrirModalCrear() {
  editandoId.value = null;
  form.value = {
    nombre: '',
    ubigeo: '',
    direccion: '',
    departamento: '',
    provincia: '',
    distrito: '',
    tipo: 'AMBOS',
    es_predeterminada: false,
  };
  modalAbierto.value = true;
}

function abrirModalEditar(d: DireccionTraslado) {
  editandoId.value = d.id;
  form.value = {
    nombre: d.nombre,
    ubigeo: d.ubigeo,
    direccion: d.direccion,
    departamento: d.departamento,
    provincia: d.provincia,
    distrito: d.distrito,
    tipo: d.tipo,
    es_predeterminada: d.es_predeterminada,
  };
  modalAbierto.value = true;
}

async function guardar() {
  if (!form.value.nombre || !form.value.direccion || !form.value.ubigeo) {
    toast.advertencia('Completa nombre, dirección y ubigeo');
    return;
  }
  if (form.value.ubigeo.length !== 6) {
    toast.advertencia('El ubigeo debe tener 6 dígitos');
    return;
  }

  guardando.value = true;
  try {
    if (editandoId.value) {
      await direccionesTrasladoService.actualizar(editandoId.value, form.value);
      toast.exito('Dirección actualizada');
    } else {
      await direccionesTrasladoService.crear(form.value);
      toast.exito('Dirección creada');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo guardar');
  } finally {
    guardando.value = false;
  }
}

async function desactivar(d: DireccionTraslado) {
  const ok = await confirmar({
    titulo: '¿Desactivar dirección?',
    mensaje: `"${d.nombre}" ya no aparecerá al crear nuevas guías.`,
    textoConfirmar: 'Desactivar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await direccionesTrasladoService.desactivar(d.id);
    toast.exito('Dirección desactivada');
    await cargar();
  } catch {
    toast.error('No se pudo desactivar');
  }
}

// Hacer una predeterminada
async function marcarPredeterminada(d: DireccionTraslado) {
  if (d.es_predeterminada) return;
  try {
    await direccionesTrasladoService.actualizar(d.id, { es_predeterminada: true });
    toast.exito(`"${d.nombre}" es ahora la dirección predeterminada`);
    await cargar();
  } catch {
    toast.error('No se pudo actualizar');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1><MapPin :size="22" /> Direcciones de traslado</h1>
        <p class="pagina-subtitulo">
          Almacenes, sucursales y destinos frecuentes para tus guías
        </p>
      </div>
      <BaseButton @click="abrirModalCrear">
        <Plus :size="18" /> Nueva dirección
      </BaseButton>
    </div>

    <!-- Filtros tipo tabs -->
    <div class="filtros-tabs">
      <button
        class="tab"
        :class="{ 'tab--activo': filtroTipo === 'todos' }"
        @click="filtroTipo = 'todos'"
      >
        Todas ({{ direcciones.length }})
      </button>
      <button
        class="tab"
        :class="{ 'tab--activo': filtroTipo === 'AMBOS' }"
        @click="filtroTipo = 'AMBOS'"
      >
        <Repeat :size="14" /> Ambos
      </button>
      <button
        class="tab"
        :class="{ 'tab--activo': filtroTipo === 'PARTIDA' }"
        @click="filtroTipo = 'PARTIDA'"
      >
        <ArrowUpFromLine :size="14" /> Origen
      </button>
      <button
        class="tab"
        :class="{ 'tab--activo': filtroTipo === 'LLEGADA' }"
        @click="filtroTipo = 'LLEGADA'"
      >
        <ArrowDownToLine :size="14" /> Destino
      </button>
    </div>

    <BaseTable
      :columnas="columnas"
      :filas="direccionesFiltradas"
      :cargando="cargando"
      :texto-cargando="textoCarga"
      texto-vacio="No tienes direcciones registradas. Crea la primera (ej: 'Almacén Principal')."
    >
      <template #nombre="{ fila }">
        <div class="nombre-dir">
          <Star v-if="fila.es_predeterminada" :size="14" class="estrella" />
          <strong>{{ fila.nombre }}</strong>
        </div>
      </template>
      <template #direccion_completa="{ fila }">
        <div class="direccion-info">
          <div>{{ fila.direccion }}</div>
          <div class="ubicacion">
            {{ fila.distrito }} - {{ fila.provincia }} - {{ fila.departamento }}
          </div>
        </div>
      </template>
      <template #tipo="{ valor }">
        <span class="badge-tipo" :class="`badge-tipo--${valor.toLowerCase()}`">
          <Repeat v-if="valor === 'AMBOS'" :size="12" />
          <ArrowUpFromLine v-if="valor === 'PARTIDA'" :size="12" />
          <ArrowDownToLine v-if="valor === 'LLEGADA'" :size="12" />
          {{ 
            valor === 'AMBOS' ? 'Ambos' : 
            valor === 'PARTIDA' ? 'Origen' : 'Destino' 
          }}
        </span>
      </template>
      <template #es_predeterminada="{ fila }">
        <button
          v-if="!fila.es_predeterminada"
          class="btn-estrella btn-estrella--vacia"
          @click="marcarPredeterminada(fila)"
          title="Marcar como predeterminada"
        >
          <Star :size="18" />
        </button>
        <Star v-else :size="18" class="estrella-llena" />
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
      :titulo="editandoId ? 'Editar dirección' : 'Nueva dirección'"
    >
      <div class="form">
        <BaseInput
          v-model="form.nombre"
          label="Nombre identificador"
          placeholder="Almacén Principal, Sucursal Lima Sur..."
        />

        <BaseInput
          v-model="form.direccion"
          label="Dirección"
          placeholder="AV. PRINCIPAL 123"
        />

        <div class="form__grid-2">
          <BaseInput
            v-model="form.ubigeo"
            label="Ubigeo (6 dígitos)"
            placeholder="150101"
            maxlength="6"
          />
          <BaseSelect
            v-model="form.tipo"
            label="¿Para qué se usa?"
            :opciones="tiposDireccion"
          />
        </div>

        <div class="form__grid-3">
          <BaseInput
            v-model="form.departamento"
            label="Departamento"
            placeholder="LIMA"
          />
          <BaseInput
            v-model="form.provincia"
            label="Provincia"
            placeholder="LIMA"
          />
          <BaseInput
            v-model="form.distrito"
            label="Distrito"
            placeholder="LIMA"
          />
        </div>

        <label class="check-predet">
          <input type="checkbox" v-model="form.es_predeterminada" />
          <span>
            <Star :size="16" />
            Usar como dirección predeterminada de origen
          </span>
        </label>
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

/* Tabs */
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
.tab:hover { color: var(--accent); }
.tab--activo {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

/* Nombre con estrella */
.nombre-dir {
  display: flex;
  align-items: center;
  gap: 6px;
}
.estrella { color: var(--warning); }

/* Dirección con ubicación */
.direccion-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ubicacion {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* Badge tipo */
.badge-tipo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
}
.badge-tipo--ambos { background: var(--accent-soft); color: var(--accent); }
.badge-tipo--partida { background: var(--info-soft); color: var(--info); }
.badge-tipo--llegada { background: var(--success-soft); color: var(--success); }

/* Botón estrella */
.btn-estrella {
  background: none;
  border: none;
  padding: 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
}
.btn-estrella--vacia {
  color: var(--text-muted);
}
.btn-estrella--vacia:hover {
  color: var(--warning);
  background: var(--warning-soft);
}
.estrella-llena {
  color: var(--warning);
  fill: var(--warning);
}

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
.form__grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-md);
}

/* Checkbox de predeterminada */
.check-predet {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--warning-soft);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.check-predet input[type="checkbox"] {
  cursor: pointer;
}
.check-predet span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-weight: 500;
}

@media (max-width: 700px) {
  .form__grid-2,
  .form__grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>