<!-- src/views/ConductoresView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Plus, Pencil, Trash2, UserCircle2, Search, IdCard,
} from 'lucide-vue-next';
import {
  conductoresService,
  type Conductor,
  type CrearConductor,
} from '../services/conductores.service';
import {
  transportistasService,
  type Transportista,
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

const conductores = ref<Conductor[]>([]);
const transportistas = ref<Transportista[]>([]);
const cargando = ref(true);
const textoCarga = ref(frase('configuracion'));

// Modal
const modalAbierto = ref(false);
const guardando = ref(false);
const consultandoDni = ref(false);
const editandoId = ref<string | null>(null);

const form = ref<CrearConductor>({
  tipo_documento: '1',
  numero_documento: '',
  nombres: '',
  apellidos: '',
  licencia_conducir: '',
  transportista_id: '',
});

const tiposDocumento = [
  { valor: '1', texto: 'DNI' },
  { valor: '4', texto: 'Carnet de Extranjería' },
  { valor: '7', texto: 'Pasaporte' },
];

// Opciones de transportista (incluye "Sin transportista" para propios)
const transportistasOpciones = computed(() => [
  { valor: '', texto: 'Sin transportista (interno)' },
  ...transportistas.value.map((t) => ({
    valor: t.id,
    texto: t.razon_social,
  })),
]);

const columnas = [
  { clave: 'numero_documento', titulo: 'Documento' },
  { clave: 'nombre_completo', titulo: 'Nombre completo' },
  { clave: 'licencia_conducir', titulo: 'Licencia', alineacion: 'center' as const },
  { clave: 'transportista', titulo: 'Transportista' },
  { clave: 'fecha_creacion', titulo: 'Registrado', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    const [conds, trans] = await Promise.all([
      conductoresService.listar(),
      transportistasService.listar(),
    ]);
    conductores.value = conds;
    transportistas.value = trans;
  } catch {
    toast.error('No se pudieron cargar los conductores');
  } finally {
    cargando.value = false;
  }
}

function nombreTransportista(id: string | null): string {
  if (!id) return 'Interno';
  const t = transportistas.value.find((tr) => tr.id === id);
  return t?.razon_social || '—';
}

function abrirModalCrear() {
  editandoId.value = null;
  form.value = {
    tipo_documento: '1',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    licencia_conducir: '',
    transportista_id: '',
  };
  modalAbierto.value = true;
}

function abrirModalEditar(c: Conductor) {
  editandoId.value = c.id;
  form.value = {
    tipo_documento: c.tipo_documento,
    numero_documento: c.numero_documento,
    nombres: c.nombres,
    apellidos: c.apellidos || '',
    licencia_conducir: c.licencia_conducir,
    transportista_id: c.transportista_id || '',
  };
  modalAbierto.value = true;
}

async function consultarDni() {
  if (form.value.tipo_documento !== '1') {
    toast.advertencia('La consulta automática solo funciona para DNI');
    return;
  }
  if (!form.value.numero_documento || form.value.numero_documento.length !== 8) {
    toast.advertencia('El DNI debe tener 8 dígitos');
    return;
  }

  consultandoDni.value = true;
  try {
    const data = await sunatService.consultarDni(form.value.numero_documento);
    form.value.nombres = data.nombres || '';
    form.value.apellidos = `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim();
    toast.exito(`Persona: ${form.value.nombres} ${form.value.apellidos}`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo consultar');
  } finally {
    consultandoDni.value = false;
  }
}

async function guardar() {
  if (!form.value.numero_documento || !form.value.nombres || !form.value.licencia_conducir) {
    toast.advertencia('Completa documento, nombres y licencia');
    return;
  }

  guardando.value = true;
  try {
    const payload: CrearConductor = {
      tipo_documento: form.value.tipo_documento,
      numero_documento: form.value.numero_documento,
      nombres: form.value.nombres,
      apellidos: form.value.apellidos || undefined,
      licencia_conducir: form.value.licencia_conducir.toUpperCase(),
      transportista_id: form.value.transportista_id || '',
    };

    if (editandoId.value) {
      await conductoresService.actualizar(editandoId.value, payload);
      toast.exito('Conductor actualizado');
    } else {
      await conductoresService.crear(payload);
      toast.exito('Conductor creado');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo guardar');
  } finally {
    guardando.value = false;
  }
}

async function desactivar(c: Conductor) {
  const nombreCompleto = `${c.nombres} ${c.apellidos || ''}`.trim();
  const ok = await confirmar({
    titulo: '¿Desactivar conductor?',
    mensaje: `"${nombreCompleto}" ya no aparecerá al crear nuevas guías.`,
    textoConfirmar: 'Desactivar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await conductoresService.desactivar(c.id);
    toast.exito('Conductor desactivado');
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
        <h1><UserCircle2 :size="22" /> Conductores</h1>
        <p class="pagina-subtitulo">Choferes con licencia para trasladar mercadería</p>
      </div>
      <BaseButton @click="abrirModalCrear">
        <Plus :size="18" /> Nuevo conductor
      </BaseButton>
    </div>

    <BaseTable
      :columnas="columnas"
      :filas="conductores"
      :cargando="cargando"
      :texto-cargando="textoCarga"
      texto-vacio="No tienes conductores registrados. Crea el primero para empezar."
    >
      <template #numero_documento="{ fila }">
        <div class="documento">
          <span class="tipo-doc">
            {{ 
              fila.tipo_documento === '1' ? 'DNI' : 
              fila.tipo_documento === '4' ? 'CE' : 'PAS' 
            }}
          </span>
          <strong>{{ fila.numero_documento }}</strong>
        </div>
      </template>
      <template #nombre_completo="{ fila }">
        {{ fila.nombres }} {{ fila.apellidos || '' }}
      </template>
      <template #licencia_conducir="{ valor }">
        <span class="licencia">
          <IdCard :size="14" /> {{ valor }}
        </span>
      </template>
      <template #transportista="{ fila }">
        <span :class="{ 'texto-interno': !fila.transportista_id }">
          {{ nombreTransportista(fila.transportista_id) }}
        </span>
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
      :titulo="editandoId ? 'Editar conductor' : 'Nuevo conductor'"
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
              placeholder="12345678"
            />
            <button
              v-if="form.tipo_documento === '1'"
              type="button"
              class="btn-consultar"
              :disabled="consultandoDni"
              @click="consultarDni"
              title="Consultar DNI"
            >
              <Search :size="16" :class="{ 'spin': consultandoDni }" />
            </button>
          </div>
        </div>

        <div class="form__grid-2">
          <BaseInput
            v-model="form.nombres"
            label="Nombres"
            placeholder="Juan"
          />
          <BaseInput
            v-model="form.apellidos"
            label="Apellidos"
            placeholder="Pérez García"
          />
        </div>

        <BaseInput
          v-model="form.licencia_conducir"
          label="Número de licencia"
          placeholder="Q12345678"
          @input="(e: any) => form.licencia_conducir = e.target.value.toUpperCase()"
        />

        <BaseSelect
          v-model="form.transportista_id"
          label="Pertenece a transportista (opcional)"
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

.licencia {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface-2);
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: var(--text-sm);
  font-weight: 600;
}

.texto-interno {
  font-style: italic;
  color: var(--text-muted);
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