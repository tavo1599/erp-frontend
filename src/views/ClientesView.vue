<!-- src/views/ClientesView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus, Pencil, Trash2, Search } from 'lucide-vue-next';
import { clientesService, type Cliente, type CrearCliente } from '../services/clientes.service';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseModal from '../components/ui/BaseModal.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import { sunatService } from '../services/sunat.service';
import { useAuthStore } from '../stores/auth.store';

const toast = useToast();
const consultandoSunat = ref(false);
const auth = useAuthStore();

const clientes = ref<Cliente[]>([]);
const cargando = ref(true);
const buscar = ref('');
const modalAbierto = ref(false);
const guardando = ref(false);
const errorForm = ref('');
const { confirmar } = useConfirm();

const editandoId = ref<string | null>(null);

const columnas = [
  { clave: 'tipo_doc_texto', titulo: 'Tipo' },
  { clave: 'numero_documento', titulo: 'Documento' },
  { clave: 'razon_social', titulo: 'Nombre / Razón social' },
  { clave: 'telefono', titulo: 'Teléfono' },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

const tiposDocumento = [
  { valor: '6', texto: 'RUC' },
  { valor: '1', texto: 'DNI' },
  { valor: '4', texto: 'Carnet de extranjería' },
  { valor: '7', texto: 'Pasaporte' },
];

const form = ref<CrearCliente>({
  tipo_documento: '6',
  numero_documento: '',
  razon_social: '',
  direccion: '',
  email: '',
  telefono: '',
});

async function cargar() {
  cargando.value = true;
  try {
    const data = await clientesService.listar(buscar.value || undefined);
    // Agregamos el texto del tipo de documento para mostrarlo
    clientes.value = data.map((c) => ({
      ...c,
      tipo_doc_texto: tiposDocumento.find((t) => t.valor === c.tipo_documento)?.texto || c.tipo_documento,
    })) as any;
  } finally {
    cargando.value = false;
  }
}

function abrirModalCrear() {
  editandoId.value = null;
  form.value = { tipo_documento: '6', numero_documento: '', razon_social: '', direccion: '', email: '', telefono: '' };
  modalAbierto.value = true;
}

function abrirModalEditar(cliente: any) {
  editandoId.value = cliente.id;
  form.value = {
    tipo_documento: cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    razon_social: cliente.razon_social,
    direccion: cliente.direccion || '',
    email: cliente.email || '',
    telefono: cliente.telefono || '',
  };
  modalAbierto.value = true;
}

async function guardar() {
  if (!form.value.numero_documento || !form.value.razon_social) {
    toast.advertencia('El documento y el nombre son obligatorios');
    return;
  }
  guardando.value = true;
  try {
    if (editandoId.value) {
      await clientesService.actualizar(editandoId.value, form.value);
      toast.exito('Cliente actualizado correctamente');
    } else {
      await clientesService.crear(form.value);
      toast.exito('Cliente guardado correctamente');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al guardar el cliente');
  } finally {
    guardando.value = false;
  }
}

async function desactivar(item: any) {
  const ok = await confirmar({
    titulo: '¿Desactivar?',
    mensaje: `"${item.razon_social}" se desactivará. Esta acción se puede revertir.`,
    textoConfirmar: 'Desactivar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await clientesService.desactivar(item.id); // o proveedoresService
    toast.exito('Desactivado correctamente');
    await cargar();
  } catch {
    toast.error('No se pudo desactivar');
  }
}

async function consultarSunat() {
  const numero = form.value.numero_documento?.trim();
  if (!numero) {
    toast.advertencia('Ingresa el número de documento primero');
    return;
  }

  consultandoSunat.value = true;
  try {
    if (form.value.tipo_documento === '6') {
      // RUC
      const data = await sunatService.consultarRuc(numero);
      form.value.razon_social = data.razon_social;
      if (data.direccion) form.value.direccion = data.direccion;
      toast.exito(`Empresa: ${data.razon_social}`);
    } else if (form.value.tipo_documento === '1') {
      // DNI
      const data = await sunatService.consultarDni(numero);
      form.value.razon_social = data.nombre_completo;
      toast.exito(`Persona: ${data.nombre_completo}`);
    } else {
      toast.info('La consulta automática solo funciona con RUC y DNI');
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo consultar');
  } finally {
    consultandoSunat.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1>Clientes</h1>
        <p class="pagina-subtitulo">Administra tus clientes</p>
      </div>
      <BaseButton 
  v-if="auth.tienePermiso('crear_clientes')"
  @click="abrirModalCrear"
>
  <Plus :size="18" /> Nuevo cliente
</BaseButton>
    </div>

    <div class="barra-busqueda">
      <BaseInput v-model="buscar" placeholder="Buscar por nombre o documento..." @update:model-value="cargar" />
    </div>

    <BaseTable
      :columnas="columnas"
      :filas="clientes"
      :cargando="cargando"
      texto-vacio="No tienes clientes registrados aún."
    >
      <template #telefono="{ valor }">
        {{ valor || '—' }}
      </template>
      <!-- El slot de acciones va AQUÍ, dentro de la tabla -->
      <template #acciones="{ fila }">
  <div style="display: flex; gap: 6px; justify-content: center;">
    <button 
      v-if="auth.tienePermiso('editar_clientes')"
      class="btn-icono" 
      @click="abrirModalEditar(fila)" 
      title="Editar"
    >
      <Pencil :size="18" />
    </button>
    <button 
      v-if="auth.tienePermiso('editar_clientes')"
      class="btn-icono btn-icono--danger" 
      @click="desactivar(fila)" 
      title="Desactivar"
    >
      <Trash2 :size="18" />
    </button>
  </div>
</template>
    </BaseTable>

    <BaseModal v-model="modalAbierto" :titulo="editandoId ? 'Editar cliente' : 'Nuevo cliente'">
      <div class="form">
        <!-- Fila 1: Tipo de documento (solo) -->
        <BaseSelect v-model="form.tipo_documento" label="Tipo de documento" :opciones="tiposDocumento" />

        <!-- Fila 2: Número + botón Consultar (toma todo el ancho) -->
        <div class="campo-con-boton">
          <BaseInput v-model="form.numero_documento" label="Número" placeholder="RUC o DNI" />
          <button
            v-if="form.tipo_documento === '6' || form.tipo_documento === '1'"
            type="button"
            class="btn-consultar"
            :disabled="consultandoSunat"
            @click="consultarSunat"
            :title="form.tipo_documento === '6' ? 'Consultar RUC en SUNAT' : 'Consultar DNI en RENIEC'"
          >
            <Search :size="16" :class="{ 'spin': consultandoSunat }" />
            {{ consultandoSunat ? 'Consultando...' : 'Consultar' }}
          </button>
        </div>

        <BaseInput v-model="form.razon_social" label="Nombre / Razón social" placeholder="Nombre del cliente" />
        <BaseInput v-model="form.direccion" label="Dirección" placeholder="(opcional)" />
        <div class="form__fila">
          <BaseInput v-model="form.email" label="Email" placeholder="(opcional)" />
          <BaseInput v-model="form.telefono" label="Teléfono" placeholder="(opcional)" />
        </div>
        <p v-if="errorForm" class="form__error">{{ errorForm }}</p>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="modalAbierto = false">Cancelar</BaseButton>
        <BaseButton :cargando="guardando" @click="guardar">
          {{ editandoId ? 'Guardar cambios' : 'Guardar cliente' }}
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
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; }
.barra-busqueda { max-width: 360px; margin-bottom: var(--space-md); }
.form { display: flex; flex-direction: column; gap: var(--space-md); }
.form__fila { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
.form__error {
  background: var(--danger-soft);
  color: var(--danger);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}
.btn-icono {
  background: none; border: none; color: var(--accent);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
}
.btn-icono:hover { background: var(--accent-soft); }
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