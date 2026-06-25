<!-- src/views/TransportistasView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Plus, Pencil, Trash2, Truck, Search, Phone, FileText,
} from 'lucide-vue-next';
import {
  transportistasService,
  type Transportista,
  type CrearTransportista,
} from '../services/transportistas.service';
import { sunatService } from '../services/sunat.service';
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

const transportistas = ref<Transportista[]>([]);
const cargando = ref(true);
const textoCarga = ref(frase('configuracion'));

// Modal
const modalAbierto = ref(false);
const guardando = ref(false);
const consultandoSunat = ref(false);
const editandoId = ref<string | null>(null);

const form = ref<CrearTransportista>({
  tipo_documento: '6',
  numero_documento: '',
  razon_social: '',
  numero_mtc: '',
  direccion: '',
  telefono: '',
});

const tiposDocumento = [
  { valor: '6', texto: 'RUC' },
  { valor: '1', texto: 'DNI' },
];

const columnas = [
  { clave: 'numero_documento', titulo: 'Documento' },
  { clave: 'razon_social', titulo: 'Razón social' },
  { clave: 'numero_mtc', titulo: 'N° MTC', alineacion: 'center' as const },
  { clave: 'telefono', titulo: 'Teléfono', alineacion: 'center' as const },
  { clave: 'fecha_creacion', titulo: 'Registrado', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    transportistas.value = await transportistasService.listar();
  } catch {
    toast.error('No se pudieron cargar los transportistas');
  } finally {
    cargando.value = false;
  }
}

function abrirModalCrear() {
  editandoId.value = null;
  form.value = {
    tipo_documento: '6',
    numero_documento: '',
    razon_social: '',
    numero_mtc: '',
    direccion: '',
    telefono: '',
  };
  modalAbierto.value = true;
}

function abrirModalEditar(t: Transportista) {
  editandoId.value = t.id;
  form.value = {
    tipo_documento: t.tipo_documento,
    numero_documento: t.numero_documento,
    razon_social: t.razon_social,
    numero_mtc: t.numero_mtc || '',
    direccion: t.direccion || '',
    telefono: t.telefono || '',
  };
  modalAbierto.value = true;
}

async function consultarSunat() {
  if (!form.value.numero_documento) {
    toast.advertencia('Ingresa el número de documento primero');
    return;
  }

  consultandoSunat.value = true;
  try {
    if (form.value.tipo_documento === '6') {
      // RUC
      if (form.value.numero_documento.length !== 11) {
        toast.advertencia('El RUC debe tener 11 dígitos');
        return;
      }
      const data = await sunatService.consultarRuc(form.value.numero_documento);
      form.value.razon_social = data.razon_social;
      if (data.direccion) form.value.direccion = data.direccion;
      toast.exito(`Empresa: ${data.razon_social}`);
    } else {
      // DNI
      if (form.value.numero_documento.length !== 8) {
        toast.advertencia('El DNI debe tener 8 dígitos');
        return;
      }
      const data = await sunatService.consultarDni(form.value.numero_documento);
      form.value.razon_social = `${data.nombres} ${data.apellido_paterno} ${data.apellido_materno}`.trim();
      toast.exito(`Persona: ${form.value.razon_social}`);
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo consultar');
  } finally {
    consultandoSunat.value = false;
  }
}

async function guardar() {
  if (!form.value.numero_documento || !form.value.razon_social) {
    toast.advertencia('Completa documento y razón social');
    return;
  }

  guardando.value = true;
  try {
    if (editandoId.value) {
      await transportistasService.actualizar(editandoId.value, form.value);
      toast.exito('Transportista actualizado');
    } else {
      await transportistasService.crear(form.value);
      toast.exito('Transportista creado');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo guardar');
  } finally {
    guardando.value = false;
  }
}

async function desactivar(t: Transportista) {
  const ok = await confirmar({
    titulo: '¿Desactivar transportista?',
    mensaje: `"${t.razon_social}" ya no aparecerá al crear nuevas guías.`,
    textoConfirmar: 'Desactivar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await transportistasService.desactivar(t.id);
    toast.exito('Transportista desactivado');
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
        <h1><Truck :size="22" /> Transportistas</h1>
        <p class="pagina-subtitulo">Empresas o personas que transportan tu mercadería</p>
      </div>
      <BaseButton @click="abrirModalCrear">
        <Plus :size="18" /> Nuevo transportista
      </BaseButton>
    </div>

    <BaseTable
      :columnas="columnas"
      :filas="transportistas"
      :cargando="cargando"
      :texto-cargando="textoCarga"
      texto-vacio="No tienes transportistas registrados. Crea el primero para empezar."
    >
      <template #numero_documento="{ fila }">
        <div class="documento">
          <span class="tipo-doc">{{ fila.tipo_documento === '6' ? 'RUC' : 'DNI' }}</span>
          <strong>{{ fila.numero_documento }}</strong>
        </div>
      </template>
      <template #numero_mtc="{ valor }">
        {{ valor || '—' }}
      </template>
      <template #telefono="{ valor }">
        {{ valor || '—' }}
      </template>
      <template #fecha_creacion="{ valor }">{{ fecha(valor) }}</template>
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
      :titulo="editandoId ? 'Editar transportista' : 'Nuevo transportista'"
    >
      <div class="form">
        <div class="form__grid-2">
          <BaseSelect
            v-model="form.tipo_documento"
            label="Tipo de documento"
            :opciones="tiposDocumento"
          />
          <div class="campo-con-boton">
            <BaseInput
              v-model="form.numero_documento"
              label="Número"
              :placeholder="form.tipo_documento === '6' ? '20XXXXXXXXX' : '12345678'"
            />
            <button
              type="button"
              class="btn-consultar"
              :disabled="consultandoSunat"
              @click="consultarSunat"
              :title="form.tipo_documento === '6' ? 'Consultar RUC' : 'Consultar DNI'"
            >
              <Search :size="16" :class="{ 'spin': consultandoSunat }" />
            </button>
          </div>
        </div>

        <BaseInput
          v-model="form.razon_social"
          :label="form.tipo_documento === '6' ? 'Razón social' : 'Nombres completos'"
          placeholder="Se autocompleta al consultar"
        />

        <div class="form__grid-2">
          <BaseInput
            v-model="form.numero_mtc"
            label="Número MTC (opcional)"
            placeholder="Solo para transportistas habilitados"
          />
          <BaseInput
            v-model="form.telefono"
            label="Teléfono (opcional)"
            placeholder="999 999 999"
          />
        </div>

        <BaseInput
          v-model="form.direccion"
          label="Dirección (opcional)"
          placeholder="AV. PRINCIPAL 123, LIMA"
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

.documento {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tipo-doc {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
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
  align-items: start;
}

.campo-con-boton {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-end;
}
.campo-con-boton > :first-child {
  flex: 1;
}
.btn-consultar {
  background: var(--accent);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-consultar:hover:not(:disabled) { filter: brightness(0.92); }
.btn-consultar:disabled { opacity: 0.6; cursor: wait; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .form__grid-2 { grid-template-columns: 1fr; }
}
</style>