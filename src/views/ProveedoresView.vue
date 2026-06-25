<!-- src/views/ProveedoresView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus, Pencil, Trash2, Search } from 'lucide-vue-next';
import { proveedoresService, type Proveedor, type CrearProveedor } from '../services/proveedores.service';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseModal from '../components/ui/BaseModal.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import { sunatService } from '../services/sunat.service';

const toast = useToast();
const { confirmar } = useConfirm();

const proveedores = ref<Proveedor[]>([]);
const cargando = ref(true);
const buscar = ref('');
const modalAbierto = ref(false);
const guardando = ref(false);
const editandoId = ref<string | null>(null);

  const consultandoSunat = ref(false);

async function consultarRucProveedor() {
  const ruc = form.value.ruc?.trim();
  if (!ruc || ruc.length !== 11) {
    toast.advertencia('Ingresa un RUC válido de 11 dígitos');
    return;
  }
  consultandoSunat.value = true;
  try {
    const data = await sunatService.consultarRuc(ruc);
    form.value.razon_social = data.razon_social;
    if (data.direccion) form.value.direccion = data.direccion;
    toast.exito(`Empresa: ${data.razon_social}`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo consultar el RUC');
  } finally {
    consultandoSunat.value = false;
  }
}

const columnas = [
  { clave: 'ruc', titulo: 'RUC' },
  { clave: 'razon_social', titulo: 'Razón social' },
  { clave: 'contacto', titulo: 'Contacto' },
  { clave: 'telefono', titulo: 'Teléfono' },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

const form = ref<CrearProveedor>({
  ruc: '', razon_social: '', direccion: '', email: '', telefono: '', contacto: '',
});

async function cargar() {
  cargando.value = true;
  try {
    proveedores.value = await proveedoresService.listar(buscar.value || undefined);
  } finally {
    cargando.value = false;
  }
}

function abrirModalCrear() {
  editandoId.value = null;
  form.value = { ruc: '', razon_social: '', direccion: '', email: '', telefono: '', contacto: '' };
  modalAbierto.value = true;
}

function abrirModalEditar(proveedor: any) {
  editandoId.value = proveedor.id;
  form.value = {
    ruc: proveedor.ruc,
    razon_social: proveedor.razon_social,
    direccion: proveedor.direccion || '',
    email: proveedor.email || '',
    telefono: proveedor.telefono || '',
    contacto: proveedor.contacto || '',
  };
  modalAbierto.value = true;
}

async function guardar() {
  if (!form.value.ruc || !form.value.razon_social) {
    toast.advertencia('El RUC y la razón social son obligatorios');
    return;
  }
  guardando.value = true;
  try {
    if (editandoId.value) {
      await proveedoresService.actualizar(editandoId.value, form.value);
      toast.exito('Proveedor actualizado correctamente');
    } else {
      await proveedoresService.crear(form.value);
      toast.exito('Proveedor guardado correctamente');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al guardar el proveedor');
  } finally {
    guardando.value = false;
  }
}

async function desactivar(item: any) {
  const ok = await confirmar({
    titulo: '¿Desactivar proveedor?',
    mensaje: `"${item.razon_social}" se desactivará y dejará de aparecer en las listas. Esta acción se puede revertir.`,
    textoConfirmar: 'Desactivar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await proveedoresService.desactivar(item.id);
    toast.exito('Proveedor desactivado');
    await cargar();
  } catch {
    toast.error('No se pudo desactivar el proveedor');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1>Proveedores</h1>
        <p class="pagina-subtitulo">Administra tus proveedores</p>
      </div>
      <BaseButton @click="abrirModalCrear"><Plus :size="18" /> Nuevo proveedor</BaseButton>
    </div>

    <div class="barra-busqueda">
      <BaseInput v-model="buscar" placeholder="Buscar por nombre o RUC..." @update:model-value="cargar" />
    </div>

    <BaseTable :columnas="columnas" :filas="proveedores" :cargando="cargando" texto-vacio="No tienes proveedores aún.">
      <template #contacto="{ valor }">{{ valor || '—' }}</template>
      <template #telefono="{ valor }">{{ valor || '—' }}</template>
      <template #acciones="{ fila }">
        <div style="display: flex; gap: 6px; justify-content: center;">
          <button class="btn-icono" @click="abrirModalEditar(fila)" title="Editar">
            <Pencil :size="18" />
          </button>
          <button class="btn-icono btn-icono--danger" @click="desactivar(fila)" title="Desactivar">
            <Trash2 :size="18" />
          </button>
        </div>
      </template>
    </BaseTable>

    <BaseModal v-model="modalAbierto" :titulo="editandoId ? 'Editar proveedor' : 'Nuevo proveedor'">
      <div class="form">
        <!-- Fila 1: RUC + botón Consultar (toma todo el ancho) -->
        <div class="campo-con-boton">
          <BaseInput v-model="form.ruc" label="RUC" placeholder="20XXXXXXXXX" />
          <button
            type="button"
            class="btn-consultar"
            :disabled="consultandoSunat"
            @click="consultarRucProveedor"
            title="Consultar RUC en SUNAT"
          >
            <Search :size="16" :class="{ 'spin': consultandoSunat }" />
            {{ consultandoSunat ? 'Consultando...' : 'Consultar' }}
          </button>
        </div>

        <BaseInput v-model="form.razon_social" label="Razón social" placeholder="Nombre del proveedor" />

        <div class="form__fila">
          <BaseInput v-model="form.contacto" label="Contacto" placeholder="(opcional)" />
          <BaseInput v-model="form.telefono" label="Teléfono" placeholder="(opcional)" />
        </div>

        <BaseInput v-model="form.direccion" label="Dirección" placeholder="(opcional)" />
        <BaseInput v-model="form.email" label="Email" placeholder="(opcional)" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="modalAbierto = false">Cancelar</BaseButton>
        <BaseButton :cargando="guardando" @click="guardar">
          {{ editandoId ? 'Guardar cambios' : 'Guardar' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.pagina-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-lg); }
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; }
.barra-busqueda { max-width: 360px; margin-bottom: var(--space-md); }
.form { display: flex; flex-direction: column; gap: var(--space-md); }
.form__fila { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
.btn-icono {
  background: none; border: none; color: var(--accent);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
}
.btn-icono:hover { background: var(--accent-soft); }
.btn-icono--danger { color: var(--danger); }
.btn-icono--danger:hover { background: var(--danger-soft); }
.campo-con-boton {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-end;
  width: 100%;
  min-width: 0;
}
.campo-con-boton > :first-child {
  flex: 1 1 auto;
  min-width: 0;
}
.campo-con-boton :deep(input) {
  width: 100%;
}
.btn-consultar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--accent);
  color: white;
  border: none;
  padding: 0 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  height: 40px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: var(--transition);
}
.btn-consultar:hover:not(:disabled) { filter: brightness(0.92); }
.btn-consultar:disabled { opacity: 0.6; cursor: wait; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
</style>