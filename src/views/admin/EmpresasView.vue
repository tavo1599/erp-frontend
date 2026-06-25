<!-- src/views/admin/EmpresasView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Building2, Pencil, Ban, CheckCircle2, Search } from 'lucide-vue-next';
import { adminService, type EmpresaLista, type CrearEmpresa } from '../../services/admin.service';
import { sunatService } from '../../services/sunat.service';
import { useToast } from '../../composables/useToast';
import { useConfirm } from '../../composables/useConfirm';
import { useFormato } from '../../composables/useFormato';
import { useFrases } from '../../composables/useFrases';
import BaseTable from '../../components/ui/BaseTable.vue';
import BaseModal from '../../components/ui/BaseModal.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseSelect from '../../components/ui/BaseSelect.vue';

const toast = useToast();
const { confirmar } = useConfirm();
const { fecha } = useFormato();
const { frase } = useFrases();

const empresas = ref<EmpresaLista[]>([]);
const cargando = ref(true);
const textoCarga = ref(frase('configuracion'));

// Modal
const modalAbierto = ref(false);
const guardando = ref(false);
const consultandoSunat = ref(false);

const form = ref<CrearEmpresa>({
  ruc: '',
  razon_social: '',
  nombre_comercial: '',
  direccion: '',
  ubigeo: '',
  departamento: '',
  provincia: '',
  distrito: '',
  admin_nombre: '',
  admin_email: '',
  admin_password: '',
  plan: 'GRATUITO',
});

const planes = [
  { valor: 'GRATUITO', texto: 'Gratuito (1000 comprobantes/mes)' },
  { valor: 'BASICO', texto: 'Básico' },
  { valor: 'PRO', texto: 'Pro' },
];

const columnas = [
  { clave: 'ruc', titulo: 'RUC' },
  { clave: 'razon_social', titulo: 'Razón social' },
  { clave: 'plan', titulo: 'Plan', alineacion: 'center' as const },
  { clave: 'ambiente', titulo: 'Ambiente', alineacion: 'center' as const },
  { clave: 'total_comprobantes', titulo: 'Compr.', alineacion: 'right' as const },
  { clave: 'total_usuarios', titulo: 'Usuarios', alineacion: 'right' as const },
  { clave: 'estado_suscripcion', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'fecha_creacion', titulo: 'Creada', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    empresas.value = await adminService.listarEmpresas();
  } catch {
    toast.error('No se pudieron cargar las empresas');
  } finally {
    cargando.value = false;
  }
}

function abrirModalCrear() {
  form.value = {
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    direccion: '',
    ubigeo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    admin_nombre: '',
    admin_email: '',
    admin_password: '',
    plan: 'GRATUITO',
  };
  modalAbierto.value = true;
}

async function consultarRuc() {
  if (!form.value.ruc || form.value.ruc.length !== 11) {
    toast.advertencia('Ingresa un RUC válido de 11 dígitos');
    return;
  }
  consultandoSunat.value = true;
  try {
    const data = await sunatService.consultarRuc(form.value.ruc);
    form.value.razon_social = data.razon_social;
    if (data.direccion) form.value.direccion = data.direccion;
    if (data.ubigeo) form.value.ubigeo = data.ubigeo;
    if (data.departamento) form.value.departamento = data.departamento;
    if (data.provincia) form.value.provincia = data.provincia;
    if (data.distrito) form.value.distrito = data.distrito;
    toast.exito(`Empresa: ${data.razon_social}`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo consultar');
  } finally {
    consultandoSunat.value = false;
  }
}

async function guardar() {
  // Validaciones básicas
  if (!form.value.ruc || form.value.ruc.length !== 11) {
    toast.advertencia('Ingresa un RUC válido');
    return;
  }
  if (!form.value.razon_social) {
    toast.advertencia('La razón social es obligatoria');
    return;
  }
  if (!form.value.admin_nombre || !form.value.admin_email || !form.value.admin_password) {
    toast.advertencia('Completa los datos del administrador');
    return;
  }
  if (form.value.admin_password.length < 8) {
    toast.advertencia('La contraseña debe tener al menos 8 caracteres');
    return;
  }

  guardando.value = true;
  try {
    await adminService.crearEmpresa(form.value);
    toast.exito(`Empresa "${form.value.razon_social}" creada correctamente`);
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo crear la empresa');
  } finally {
    guardando.value = false;
  }
}

async function suspender(empresa: EmpresaLista) {
  const ok = await confirmar({
    titulo: '¿Suspender empresa?',
    mensaje: `"${empresa.razon_social}" no podrá emitir comprobantes hasta que la reactives.`,
    textoConfirmar: 'Suspender',
    peligro: true,
  });
  if (!ok) return;
  try {
    await adminService.cambiarEstado(empresa.id, 'SUSPENDIDA');
    toast.exito('Empresa suspendida');
    await cargar();
  } catch {
    toast.error('No se pudo suspender');
  }
}

async function activar(empresa: EmpresaLista) {
  try {
    await adminService.cambiarEstado(empresa.id, 'ACTIVA');
    toast.exito('Empresa activada');
    await cargar();
  } catch {
    toast.error('No se pudo activar');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1>Empresas</h1>
        <p class="pagina-subtitulo">Gestiona las empresas registradas en el sistema</p>
      </div>
      <BaseButton @click="abrirModalCrear">
        <Plus :size="18" /> Nueva empresa
      </BaseButton>
    </div>

    <BaseTable
      :columnas="columnas"
      :filas="empresas"
      :cargando="cargando"
      texto-vacio="No hay empresas registradas."
    >
      <template #plan="{ valor }">
        <span class="badge-plan" :class="`badge-plan--${valor.toLowerCase()}`">
          {{ valor }}
        </span>
      </template>
      <template #ambiente="{ valor }">
        <span class="badge-ambiente" :class="valor === 'produccion' ? 'badge-prod' : 'badge-beta'">
          {{ valor }}
        </span>
      </template>
      <template #estado_suscripcion="{ valor }">
        <span class="estado" :class="{
          'estado--ok': valor === 'ACTIVA',
          'estado--warn': valor === 'SUSPENDIDA',
          'estado--error': valor === 'CANCELADA',
        }">
          {{ valor }}
        </span>
      </template>
      <template #fecha_creacion="{ valor }">{{ fecha(valor) }}</template>
      <template #acciones="{ fila }">
        <div class="acciones-fila">
          <button
            v-if="fila.estado_suscripcion === 'ACTIVA'"
            class="btn-icono btn-icono--warn"
            @click="suspender(fila)"
            title="Suspender"
          >
            <Ban :size="18" />
          </button>
          <button
            v-else
            class="btn-icono"
            @click="activar(fila)"
            title="Activar"
          >
            <CheckCircle2 :size="18" />
          </button>
        </div>
      </template>
    </BaseTable>

    <!-- Modal crear empresa -->
    <BaseModal v-model="modalAbierto" titulo="Nueva empresa" ancho="grande">
      <div class="form">
        <!-- Sección: Datos de la empresa -->
        <div class="form__seccion">
          <div class="form__seccion-head">
            <Building2 :size="18" />
            <span>Datos de la empresa</span>
          </div>
          <div class="form__grid-2">
            <div class="campo-con-boton">
              <BaseInput v-model="form.ruc" label="RUC" placeholder="20XXXXXXXXX" />
              <button
                type="button"
                class="btn-consultar"
                :disabled="consultandoSunat"
                @click="consultarRuc"
                title="Consultar RUC en SUNAT"
              >
                <Search :size="16" :class="{ 'spin': consultandoSunat }" />
                {{ consultandoSunat ? 'Consultando...' : 'Consultar' }}
              </button>
            </div>
            <BaseInput v-model="form.razon_social" label="Razón social" placeholder="Nombre legal" />
          </div>
          <div class="form__grid-2">
            <BaseInput v-model="form.nombre_comercial" label="Nombre comercial" placeholder="(opcional)" />
            <BaseSelect v-model="form.plan" label="Plan" :opciones="planes" />
          </div>
          <BaseInput v-model="form.direccion" label="Dirección" placeholder="Dirección fiscal" />
          <div class="form__grid-3">
            <BaseInput v-model="form.departamento" label="Departamento" placeholder="LIMA" />
            <BaseInput v-model="form.provincia" label="Provincia" placeholder="LIMA" />
            <BaseInput v-model="form.distrito" label="Distrito" placeholder="LIMA" />
          </div>
        </div>

        <!-- Sección: Administrador inicial -->
        <div class="form__seccion">
          <div class="form__seccion-head">
            <CheckCircle2 :size="18" />
            <span>Administrador de la empresa</span>
          </div>
          <p class="form__hint">
            Este será el primer usuario de la empresa. Con estas credenciales podrá entrar y configurar todo lo demás.
          </p>
          <div class="form__grid-2">
            <BaseInput v-model="form.admin_nombre" label="Nombre completo" placeholder="Juan Pérez" />
            <BaseInput v-model="form.admin_email" label="Email" placeholder="admin@empresa.com" />
          </div>
          <BaseInput
            v-model="form.admin_password"
            label="Contraseña inicial"
            tipo="password"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="modalAbierto = false">Cancelar</BaseButton>
        <BaseButton :cargando="guardando" @click="guardar">
          Crear empresa
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
.pagina-subtitulo {
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Badges */
.badge-plan {
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
}
.badge-plan--gratuito { background: var(--bg-surface-2); color: var(--text-secondary); }
.badge-plan--basico { background: var(--info-soft); color: var(--info); }
.badge-plan--pro { background: var(--accent-soft); color: var(--accent); }

.badge-ambiente {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}
.badge-beta { background: var(--warning-soft); color: var(--warning); }
.badge-prod { background: var(--success-soft); color: var(--success); }

.estado {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
}
.estado--ok { background: var(--success-soft); color: var(--success); }
.estado--warn { background: var(--warning-soft); color: var(--warning); }
.estado--error { background: var(--danger-soft); color: var(--danger); }

/* Acciones */
.acciones-fila { display: flex; gap: 6px; justify-content: center; }
.btn-icono {
  background: none; border: none; color: var(--success);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
  cursor: pointer;
}
.btn-icono:hover { background: var(--success-soft); }
.btn-icono--warn { color: var(--warning); }
.btn-icono--warn:hover { background: var(--warning-soft); }

/* Formulario por secciones */
.form { display: flex; flex-direction: column; gap: var(--space-lg); padding: var(--space-sm) 0; }
.form__seccion { display: flex; flex-direction: column; gap: var(--space-md); }
.form__seccion-head {
  display: flex; align-items: center; gap: var(--space-sm);
  font-size: var(--text-sm); font-weight: 700;
  color: var(--accent);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border);
}
.form__hint {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-style: italic;
}
.form__grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  align-items: start;
}
.form__grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-md);
  align-items: start;
}

.campo-con-boton { display: flex; gap: var(--space-sm); align-items: flex-end; }
.campo-con-boton > :first-child { flex: 1; }
.btn-consultar {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--accent); color: white;
  border: none; padding: 0 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm); font-weight: 600;
  height: 40px;
  cursor: pointer;
}
.btn-consultar:hover:not(:disabled) { filter: brightness(0.92); }
.btn-consultar:disabled { opacity: 0.6; cursor: wait; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .form__grid-2,
  .form__grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>