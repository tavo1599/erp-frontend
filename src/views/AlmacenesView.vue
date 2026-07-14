<!-- src/views/AlmacenesView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { almacenesService, type Almacen, type CrearAlmacen } from '../services/almacenes.service';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import { useAuthStore } from '../stores/auth.store';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseModal from '../components/ui/BaseModal.vue';
import { Plus, Pencil, Trash2, Warehouse, Star, MapPin, User } from 'lucide-vue-next';

const toast = useToast();
const { confirmar } = useConfirm();
const auth = useAuthStore();

const almacenes = ref<Almacen[]>([]);
const cargando = ref(true);
const modalAbierto = ref(false);
const guardando = ref(false);
const editandoId = ref<string | null>(null);

const form = ref<CrearAlmacen & {
  es_principal: boolean;
}>({
  nombre: '',
  direccion: '',
  encargado_nombre: '',
  encargado_telefono: '',
  es_principal: false,
});

const columnas = [
  { clave: 'nombre', titulo: 'Nombre' },
  { clave: 'direccion', titulo: 'Dirección' },
  { clave: 'encargado_nombre', titulo: 'Encargado' },
  { clave: 'es_principal', titulo: 'Principal', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    almacenes.value = await almacenesService.listar();
  } catch (e) {
    toast.error('Error al cargar almacenes');
  } finally {
    cargando.value = false;
  }
}

function abrirModalCrear() {
  editandoId.value = null;
  form.value = {
    nombre: '',
    direccion: '',
    encargado_nombre: '',
    encargado_telefono: '',
    es_principal: false,
  };
  modalAbierto.value = true;
}

function abrirModalEditar(almacen: Almacen) {
  editandoId.value = almacen.id;
  form.value = {
    nombre: almacen.nombre,
    direccion: almacen.direccion || '',
    encargado_nombre: almacen.encargado_nombre || '',
    encargado_telefono: almacen.encargado_telefono || '',
    es_principal: almacen.es_principal,
  };
  modalAbierto.value = true;
}

async function guardar() {
  if (!form.value.nombre) {
    toast.advertencia('El nombre es obligatorio');
    return;
  }
  
  guardando.value = true;
  try {
    if (editandoId.value) {
      await almacenesService.actualizar(editandoId.value, form.value);
      toast.exito('Almacén actualizado');
    } else {
      await almacenesService.crear(form.value);
      toast.exito('Almacén creado');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al guardar');
  } finally {
    guardando.value = false;
  }
}

async function desactivar(almacen: Almacen) {
  if (almacen.es_principal) {
    toast.advertencia('No puedes desactivar el almacén principal');
    return;
  }
  
  const ok = await confirmar({
    titulo: '¿Desactivar almacén?',
    mensaje: `El almacén "${almacen.nombre}" será desactivado. Podrás reactivarlo después.`,
    textoConfirmar: 'Sí, desactivar',
    peligro: true,
  });
  if (!ok) return;
  
  try {
    await almacenesService.desactivar(almacen.id);
    toast.exito('Almacén desactivado');
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al desactivar');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1><Warehouse :size="26" /> Almacenes</h1>
        <p class="pagina-subtitulo">Gestiona los almacenes de tu empresa</p>
      </div>
      <BaseButton
        v-if="auth.tienePermiso('crear_almacenes')"
        @click="abrirModalCrear"
      >
        <Plus :size="18" /> Nuevo almacén
      </BaseButton>
    </div>

    <BaseTable
      :columnas="columnas"
      :filas="almacenes"
      :cargando="cargando"
      texto-vacio="No tienes almacenes. Crea el primero."
    >
      <template #nombre="{ fila }">
        <div class="celda-nombre">
          <strong>{{ fila.nombre }}</strong>
        </div>
      </template>

      <template #direccion="{ valor }">
        <span v-if="valor" class="celda-secundaria">
          <MapPin :size="14" /> {{ valor }}
        </span>
        <span v-else class="celda-vacia">—</span>
      </template>

      <template #encargado_nombre="{ fila }">
        <div v-if="fila.encargado_nombre" class="celda-encargado">
          <User :size="14" />
          <div>
            <div>{{ fila.encargado_nombre }}</div>
            <small v-if="fila.encargado_telefono">{{ fila.encargado_telefono }}</small>
          </div>
        </div>
        <span v-else class="celda-vacia">—</span>
      </template>

      <template #es_principal="{ valor }">
        <span v-if="valor" class="badge-principal">
          <Star :size="14" /> Principal
        </span>
      </template>

      <template #acciones="{ fila }">
        <div class="acciones-fila">
          <button
            v-if="auth.tienePermiso('editar_almacenes')"
            class="btn-icono"
            @click="abrirModalEditar(fila)"
            title="Editar"
          >
            <Pencil :size="18" />
          </button>
          <button
            v-if="auth.tienePermiso('editar_almacenes') && !fila.es_principal"
            class="btn-icono btn-icono--danger"
            @click="desactivar(fila)"
            title="Desactivar"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </template>
    </BaseTable>

    <!-- Modal crear/editar -->
    <BaseModal
      v-model="modalAbierto"
      :titulo="editandoId ? 'Editar almacén' : 'Nuevo almacén'"
    >
      <div class="form">
        <BaseInput
          v-model="form.nombre"
          label="Nombre del almacén *"
          placeholder="Ej: Sucursal Miraflores"
        />
        <BaseInput
          v-model="form.direccion"
          label="Dirección"
          placeholder="Av. Larco 456, Miraflores"
        />
        <div class="form__grid-2">
          <BaseInput
            v-model="form.encargado_nombre"
            label="Encargado (opcional)"
            placeholder="Nombre del responsable"
          />
          <BaseInput
            v-model="form.encargado_telefono"
            label="Teléfono encargado"
            placeholder="999 999 999"
          />
        </div>

        <label class="checkbox-principal">
          <input type="checkbox" v-model="form.es_principal" />
          <div>
            <strong>Marcar como almacén principal</strong>
            <span>Solo puede haber un almacén principal por empresa</span>
          </div>
        </label>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="modalAbierto = false">
          Cancelar
        </BaseButton>
        <BaseButton :cargando="guardando" @click="guardar">
          {{ editandoId ? 'Guardar cambios' : 'Crear almacén' }}
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

.celda-nombre strong {
  color: var(--text-primary);
}

.celda-secundaria {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.celda-encargado {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
}

.celda-encargado small {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.celda-vacia {
  color: var(--text-tertiary);
  font-style: italic;
}

.badge-principal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: var(--text-xs);
}

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
  cursor: pointer;
  display: inline-flex;
  transition: var(--transition);
}

.btn-icono:hover {
  background: var(--accent-soft);
}

.btn-icono--danger {
  color: var(--danger);
}

.btn-icono--danger:hover {
  background: var(--danger-soft);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form__grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.checkbox-principal {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
  padding: var(--space-md);
  background: var(--bg-surface-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 2px solid var(--border);
  transition: var(--transition);
}

.checkbox-principal:hover {
  border-color: var(--accent);
}

.checkbox-principal input {
  margin-top: 4px;
  accent-color: var(--accent);
}

.checkbox-principal strong {
  display: block;
  font-size: var(--text-sm);
  margin-bottom: 2px;
}

.checkbox-principal span {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

@media (max-width: 700px) {
  .form__grid-2 {
    grid-template-columns: 1fr;
  }
  .pagina-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
  }
}
</style>