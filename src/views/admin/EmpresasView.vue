<!-- src/views/admin/EmpresasView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Plus, Building2, Ban, CheckCircle2, Search,
  DollarSign, Send, Pencil, Wallet,
} from 'lucide-vue-next';
import { adminService, type EmpresaLista, type CrearEmpresa, type PagoSuscripcion } from '../../services/admin.service';
import { sunatService } from '../../services/sunat.service';
import { useToast } from '../../composables/useToast';
import { useConfirm } from '../../composables/useConfirm';
import { useFormato } from '../../composables/useFormato';
import BaseTable from '../../components/ui/BaseTable.vue';
import BaseModal from '../../components/ui/BaseModal.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseSelect from '../../components/ui/BaseSelect.vue';

const toast = useToast();
const { confirmar } = useConfirm();
const { fecha, moneda } = useFormato();

const empresas = ref<EmpresaLista[]>([]);
const cargando = ref(true);

// ── Modal crear ──────────────────────────────────────────────────────────
const modalAbierto = ref(false);
const guardando = ref(false);
const consultandoSunat = ref(false);

const form = ref<CrearEmpresa>(formVacio());
function formVacio(): CrearEmpresa {
  return {
    ruc: '', razon_social: '', nombre_comercial: '', direccion: '',
    ubigeo: '', departamento: '', provincia: '', distrito: '',
    admin_nombre: '', admin_email: '', admin_password: '', plan: 'GRATUITO',
  };
}

const planes = [
  { valor: 'GRATUITO', texto: 'Gratuito (1000 comprobantes/mes)' },
  { valor: 'BASICO', texto: 'Básico' },
  { valor: 'PRO', texto: 'Pro' },
];

const metodosPago = [
  { valor: 'EFECTIVO', texto: 'Efectivo' },
  { valor: 'TRANSFERENCIA', texto: 'Transferencia' },
  { valor: 'YAPE', texto: 'Yape' },
  { valor: 'PLIN', texto: 'Plin' },
  { valor: 'TARJETA', texto: 'Tarjeta' },
];

const columnas = [
  { clave: 'razon_social', titulo: 'Empresa' },
  { clave: 'plan', titulo: 'Plan', alineacion: 'center' as const },
  { clave: 'total_usuarios', titulo: 'Usuarios', alineacion: 'right' as const },
  { clave: 'total_almacenes', titulo: 'Almac.', alineacion: 'right' as const },
  { clave: 'estado_suscripcion', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'fecha_fin_suscripcion', titulo: 'Próximo pago', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

function diasRestantes(fin: string | null): number | null {
  if (!fin) return null;
  const ms = new Date(fin).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

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
  form.value = formVacio();
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
    const res = await adminService.crearEmpresa(form.value);
    if (res?.correo_credenciales_enviado) {
      toast.exito(`Empresa creada. Credenciales enviadas a ${form.value.admin_email}`);
    } else {
      toast.exito(`Empresa "${form.value.razon_social}" creada (no se pudo enviar el correo de credenciales)`);
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo crear la empresa');
  } finally {
    guardando.value = false;
  }
}

// ── Estado ────────────────────────────────────────────────────────────────
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

// ── Registrar pago ──────────────────────────────────────────────────────────
const modalPago = ref(false);
const registrandoPago = ref(false);
const empresaPago = ref<EmpresaLista | null>(null);
const historialPagos = ref<PagoSuscripcion[]>([]);
const formPago = ref({ monto: '', meses: '1', metodo: 'EFECTIVO', notas: '' });

async function abrirPago(empresa: EmpresaLista) {
  empresaPago.value = empresa;
  formPago.value = { monto: '', meses: '1', metodo: 'EFECTIVO', notas: '' };
  modalPago.value = true;
  historialPagos.value = [];
  try {
    historialPagos.value = await adminService.listarPagos(empresa.id);
  } catch {
    /* historial opcional */
  }
}

async function registrarPago() {
  if (!empresaPago.value) return;
  const monto = Number(formPago.value.monto);
  const meses = Number(formPago.value.meses);
  if (!monto || monto <= 0) {
    toast.advertencia('Ingresa el monto del pago');
    return;
  }
  if (!meses || meses < 1) {
    toast.advertencia('Los meses deben ser al menos 1');
    return;
  }
  registrandoPago.value = true;
  try {
    await adminService.registrarPago(empresaPago.value.id, {
      monto,
      meses,
      metodo: formPago.value.metodo,
      notas: formPago.value.notas || undefined,
    });
    toast.exito('Pago registrado y suscripción extendida');
    modalPago.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo registrar el pago');
  } finally {
    registrandoPago.value = false;
  }
}

// ── Recordatorio ─────────────────────────────────────────────────────────────
const enviandoRecordatorio = ref<string | null>(null);
async function enviarRecordatorio(empresa: EmpresaLista) {
  const ok = await confirmar({
    titulo: 'Enviar recordatorio de pago',
    mensaje: `Se enviará un correo a ${empresa.admin_email || 'el administrador'} recordando el próximo pago.`,
    textoConfirmar: 'Enviar',
  });
  if (!ok) return;
  enviandoRecordatorio.value = empresa.id;
  try {
    await adminService.enviarRecordatorio(empresa.id);
    toast.exito('Recordatorio enviado');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo enviar el recordatorio');
  } finally {
    enviandoRecordatorio.value = null;
  }
}

// ── Editar plan ──────────────────────────────────────────────────────────────
const modalPlan = ref(false);
const guardandoPlan = ref(false);
const empresaPlan = ref<EmpresaLista | null>(null);
const planSeleccionado = ref('GRATUITO');

function abrirPlan(empresa: EmpresaLista) {
  empresaPlan.value = empresa;
  planSeleccionado.value = empresa.plan;
  modalPlan.value = true;
}

async function guardarPlan() {
  if (!empresaPlan.value) return;
  guardandoPlan.value = true;
  try {
    await adminService.actualizarEmpresa(empresaPlan.value.id, { plan: planSeleccionado.value });
    toast.exito('Plan actualizado');
    modalPlan.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo actualizar el plan');
  } finally {
    guardandoPlan.value = false;
  }
}

const finVigente = computed(() =>
  empresaPago.value?.fecha_fin_suscripcion
    ? fecha(empresaPago.value.fecha_fin_suscripcion)
    : 'sin fecha',
);

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
      <template #razon_social="{ fila }">
        <div class="celda-empresa">
          <span class="celda-empresa__nombre">{{ fila.razon_social }}</span>
          <span class="celda-empresa__ruc">{{ fila.ruc }}</span>
        </div>
      </template>
      <template #plan="{ valor }">
        <span class="badge-plan" :class="`badge-plan--${valor.toLowerCase()}`">
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
      <template #fecha_fin_suscripcion="{ valor }">
        <div v-if="valor" class="celda-pago">
          <span>{{ fecha(valor) }}</span>
          <span
            class="celda-pago__dias"
            :class="{
              'dias--vencido': (diasRestantes(valor) ?? 0) < 0,
              'dias--urgente': (diasRestantes(valor) ?? 99) >= 0 && (diasRestantes(valor) ?? 99) <= 7,
            }"
          >
            {{ (diasRestantes(valor) ?? 0) < 0
              ? `vencida hace ${Math.abs(diasRestantes(valor) ?? 0)} d`
              : `en ${diasRestantes(valor)} d` }}
          </span>
        </div>
        <span v-else class="text-muted">—</span>
      </template>
      <template #acciones="{ fila }">
        <div class="acciones-fila">
          <button class="btn-icono btn-icono--accent" @click="abrirPago(fila)" title="Registrar pago">
            <DollarSign :size="18" />
          </button>
          <button
            class="btn-icono"
            :disabled="enviandoRecordatorio === fila.id"
            @click="enviarRecordatorio(fila)"
            title="Enviar recordatorio de pago"
          >
            <Send :size="18" :class="{ spin: enviandoRecordatorio === fila.id }" />
          </button>
          <button class="btn-icono" @click="abrirPlan(fila)" title="Cambiar plan">
            <Pencil :size="18" />
          </button>
          <button
            v-if="fila.estado_suscripcion === 'ACTIVA'"
            class="btn-icono btn-icono--warn"
            @click="suspender(fila)"
            title="Suspender"
          >
            <Ban :size="18" />
          </button>
          <button v-else class="btn-icono" @click="activar(fila)" title="Activar">
            <CheckCircle2 :size="18" />
          </button>
        </div>
      </template>
    </BaseTable>

    <!-- Modal crear empresa -->
    <BaseModal v-model="modalAbierto" titulo="Nueva empresa" ancho="grande">
      <div class="form">
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

        <div class="form__seccion">
          <div class="form__seccion-head">
            <CheckCircle2 :size="18" />
            <span>Administrador de la empresa</span>
          </div>
          <p class="form__hint">
            Al crear la empresa se enviará un correo a este email con las credenciales de acceso.
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
        <BaseButton :cargando="guardando" @click="guardar">Crear empresa</BaseButton>
      </template>
    </BaseModal>

    <!-- Modal registrar pago -->
    <BaseModal v-model="modalPago" titulo="Registrar pago">
      <div v-if="empresaPago" class="form">
        <div class="pago-empresa">
          <Wallet :size="18" />
          <div>
            <div class="pago-empresa__nombre">{{ empresaPago.razon_social }}</div>
            <div class="pago-empresa__sub">Vigente hasta: {{ finVigente }}</div>
          </div>
        </div>

        <div class="form__grid-2">
          <BaseInput v-model="formPago.monto" label="Monto (S/)" tipo="number" placeholder="0.00" />
          <BaseInput v-model="formPago.meses" label="Meses a extender" tipo="number" placeholder="1" />
        </div>
        <BaseSelect v-model="formPago.metodo" label="Método de pago" :opciones="metodosPago" />
        <BaseInput v-model="formPago.notas" label="Notas" placeholder="(opcional)" />

        <div v-if="historialPagos.length" class="historial">
          <div class="historial__titulo">Últimos pagos</div>
          <div v-for="p in historialPagos.slice(0, 5)" :key="p.id" class="historial__fila">
            <span>{{ fecha(p.fecha_pago) }}</span>
            <span class="historial__metodo">{{ p.metodo }}</span>
            <span class="historial__monto">{{ moneda(Number(p.monto)) }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="modalPago = false">Cancelar</BaseButton>
        <BaseButton :cargando="registrandoPago" @click="registrarPago">Registrar pago</BaseButton>
      </template>
    </BaseModal>

    <!-- Modal cambiar plan -->
    <BaseModal v-model="modalPlan" titulo="Cambiar plan">
      <div v-if="empresaPlan" class="form">
        <p class="form__hint">Empresa: <strong>{{ empresaPlan.razon_social }}</strong></p>
        <BaseSelect v-model="planSeleccionado" label="Plan" :opciones="planes" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="modalPlan = false">Cancelar</BaseButton>
        <BaseButton :cargando="guardandoPlan" @click="guardarPlan">Guardar</BaseButton>
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

/* Celda empresa */
.celda-empresa { display: flex; flex-direction: column; gap: 2px; }
.celda-empresa__nombre { font-weight: 600; }
.celda-empresa__ruc { font-size: var(--text-xs); color: var(--text-muted); }

/* Celda próximo pago */
.celda-pago { display: flex; flex-direction: column; gap: 2px; align-items: center; }
.celda-pago__dias { font-size: var(--text-xs); color: var(--text-muted); }
.dias--urgente { color: var(--warning); font-weight: 700; }
.dias--vencido { color: var(--danger); font-weight: 700; }
.text-muted { color: var(--text-muted); }

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
.acciones-fila { display: flex; gap: 4px; justify-content: center; }
.btn-icono {
  background: none; border: none; color: var(--text-secondary);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
  cursor: pointer;
}
.btn-icono:hover { background: var(--bg-surface-2); color: var(--text-primary); }
.btn-icono:disabled { opacity: 0.5; cursor: wait; }
.btn-icono--accent { color: var(--accent); }
.btn-icono--accent:hover { background: var(--accent-soft); }
.btn-icono--warn { color: var(--warning); }
.btn-icono--warn:hover { background: var(--warning-soft); }

/* Pago */
.pago-empresa {
  display: flex; align-items: center; gap: var(--space-sm);
  background: var(--bg-surface-2);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  color: var(--accent);
}
.pago-empresa__nombre { font-weight: 700; color: var(--text-primary); }
.pago-empresa__sub { font-size: var(--text-xs); color: var(--text-secondary); }

.historial { border-top: 1px solid var(--border); padding-top: var(--space-md); }
.historial__titulo {
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;
  color: var(--text-muted); margin-bottom: var(--space-sm);
}
.historial__fila {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-md);
  font-size: var(--text-sm);
  padding: 4px 0;
}
.historial__metodo { color: var(--text-secondary); }
.historial__monto { font-weight: 700; }

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
