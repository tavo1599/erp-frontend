<!-- src/views/FinanzasView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-vue-next';
import { finanzasService, type CuentaCobrar, type CuentaPagar, type MovimientoCaja } from '../services/finanzas.service';
import { useFormato } from '../composables/useFormato';
import BaseTabs from '../components/ui/BaseTabs.vue';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseModal from '../components/ui/BaseModal.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';
import { useToast } from '../composables/useToast';
import { useAuthStore } from '../stores/auth.store';

const toast = useToast();

const { moneda, fecha } = useFormato();
const auth = useAuthStore();

const pestanaActiva = ref('cobrar');
const pestanas = [
  { valor: 'cobrar', texto: 'Por cobrar' },
  { valor: 'pagar', texto: 'Por pagar' },
  { valor: 'caja', texto: 'Caja' },
];

// Datos
const porCobrar = ref<{ total: number; cuentas: CuentaCobrar[] }>({ total: 0, cuentas: [] });
const porPagar = ref<{ total: number; cuentas: CuentaPagar[] }>({ total: 0, cuentas: [] });
const caja = ref<{ ingresos: number; egresos: number; saldo: number; movimientos: MovimientoCaja[] }>({ ingresos: 0, egresos: 0, saldo: 0, movimientos: [] });
const cargando = ref(false);

// Modal de pago/cobro
const modalAbierto = ref(false);
const procesando = ref(false);
const errorModal = ref('');
const pagoActual = ref<{ id: string; tipo: 'cobrar' | 'pagar'; saldo: number; descripcion: string }>({ id: '', tipo: 'cobrar', saldo: 0, descripcion: '' });
const montoPago = ref(0);
const metodoPago = ref('EFECTIVO');

const metodos = [
  { valor: 'EFECTIVO', texto: 'Efectivo' },
  { valor: 'TRANSFERENCIA', texto: 'Transferencia' },
  { valor: 'YAPE', texto: 'Yape / Plin' },
  { valor: 'TARJETA', texto: 'Tarjeta' },
];

const columnasCobrar = [
  { clave: 'comprobante', titulo: 'Comprobante' },
  { clave: 'cliente', titulo: 'Cliente' },
  { clave: 'saldo_pendiente', titulo: 'Saldo', alineacion: 'right' as const },
  { clave: 'estado', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'accion', titulo: '', alineacion: 'center' as const },
];
const columnasPagar = [
  { clave: 'documento', titulo: 'Documento' },
  { clave: 'proveedor', titulo: 'Proveedor' },
  { clave: 'saldo_pendiente', titulo: 'Saldo', alineacion: 'right' as const },
  { clave: 'estado', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'accion', titulo: '', alineacion: 'center' as const },
];
const columnasCaja = [
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'concepto', titulo: 'Concepto' },
  { clave: 'metodo_pago', titulo: 'Método' },
  { clave: 'monto', titulo: 'Monto', alineacion: 'right' as const },
];

async function cargar() {
  cargando.value = true;
  try {
    const [c, p, k] = await Promise.all([
      finanzasService.cuentasPorCobrar(),
      finanzasService.cuentasPorPagar(),
      finanzasService.caja(),
    ]);
    porCobrar.value = { total: c.total_por_cobrar, cuentas: c.cuentas };
    porPagar.value = { total: p.total_por_pagar, cuentas: p.cuentas };
    caja.value = k;
  } finally {
    cargando.value = false;
  }
}

function abrirPago(id: string, tipo: 'cobrar' | 'pagar', saldo: number, descripcion: string) {
  pagoActual.value = { id, tipo, saldo, descripcion };
  montoPago.value = saldo;
  metodoPago.value = 'EFECTIVO';
  errorModal.value = '';
  modalAbierto.value = true;
}

async function confirmarPago() {
  if (montoPago.value <= 0 || montoPago.value > pagoActual.value.saldo) {
    toast.advertencia(`El monto debe estar entre 0 y ${moneda(pagoActual.value.saldo)}`);
    return;
  }
  procesando.value = true;
  try {
    if (pagoActual.value.tipo === 'cobrar') {
      await finanzasService.cobrar(pagoActual.value.id, montoPago.value, metodoPago.value);
      toast.exito('Cobro registrado correctamente');
    } else {
      await finanzasService.pagar(pagoActual.value.id, montoPago.value, metodoPago.value);
      toast.exito('Pago registrado correctamente');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al procesar el pago');
  } finally {
    procesando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <h1>Finanzas</h1>
    <p class="pagina-subtitulo">Cuentas, cobros, pagos y caja</p>

    <!-- Tarjetas resumen -->
    <div class="resumen-cards">
      <div class="rcard card-hover">
        <ArrowDownCircle :size="22" class="rcard__icono rcard__icono--cobrar" />
        <div>
          <span class="rcard__label">Por cobrar</span>
          <span class="rcard__valor">{{ moneda(porCobrar.total) }}</span>
        </div>
      </div>
      <div class="rcard card-hover">
        <ArrowUpCircle :size="22" class="rcard__icono rcard__icono--pagar" />
        <div>
          <span class="rcard__label">Por pagar</span>
          <span class="rcard__valor">{{ moneda(porPagar.total) }}</span>
        </div>
      </div>
      <div class="rcard card-hover">
        <Wallet :size="22" class="rcard__icono rcard__icono--caja" />
        <div>
          <span class="rcard__label">Saldo en caja</span>
          <span class="rcard__valor">{{ moneda(caja.saldo) }}</span>
        </div>
      </div>
    </div>

    <BaseTabs v-model="pestanaActiva" :pestanas="pestanas" />

    <!-- POR COBRAR -->
    <BaseTable v-if="pestanaActiva === 'cobrar'" :columnas="columnasCobrar" :filas="porCobrar.cuentas" :cargando="cargando" texto-vacio="No hay cuentas por cobrar.">
      <template #saldo_pendiente="{ valor }"><strong>{{ moneda(valor) }}</strong></template>
      <template #estado="{ valor }">
        <span class="badge" :class="valor === 'PAGADO' ? 'badge--ok' : valor === 'PARCIAL' ? 'badge--pend' : 'badge--info'">{{ valor }}</span>
      </template>
      <template #accion="{ fila }">
  <BaseButton 
    v-if="auth.tienePermiso('registrar_pagos')"
    variant="secondary" 
    @click="abrirPago(fila.id, 'cobrar', fila.saldo_pendiente, fila.comprobante)"
  >
    Cobrar
  </BaseButton>
</template>
    </BaseTable>

    <!-- POR PAGAR -->
    <BaseTable v-if="pestanaActiva === 'pagar'" :columnas="columnasPagar" :filas="porPagar.cuentas" :cargando="cargando" texto-vacio="No hay cuentas por pagar.">
      <template #saldo_pendiente="{ valor }"><strong>{{ moneda(valor) }}</strong></template>
      <template #estado="{ valor }">
        <span class="badge" :class="valor === 'PAGADO' ? 'badge--ok' : valor === 'PARCIAL' ? 'badge--pend' : 'badge--info'">{{ valor }}</span>
      </template>
      <template #accion="{ fila }">
  <BaseButton 
    v-if="auth.tienePermiso('registrar_pagos')"
    variant="secondary" 
    @click="abrirPago(fila.id, 'pagar', fila.saldo_pendiente, fila.documento)"
  >
    Pagar
  </BaseButton>
</template>
    </BaseTable>

    <!-- CAJA -->
    <BaseTable v-if="pestanaActiva === 'caja'" :columnas="columnasCaja" :filas="caja.movimientos" :cargando="cargando" texto-vacio="No hay movimientos de caja.">
      <template #fecha="{ valor }">{{ fecha(valor) }}</template>
      <template #monto="{ fila }">
        <strong :class="fila.tipo === 'INGRESO' ? 'monto--ingreso' : 'monto--egreso'">
          {{ fila.tipo === 'INGRESO' ? '+' : '−' }} {{ moneda(fila.monto) }}
        </strong>
      </template>
    </BaseTable>

    <!-- Modal cobro/pago -->
    <BaseModal v-model="modalAbierto" :titulo="pagoActual.tipo === 'cobrar' ? 'Registrar cobro' : 'Registrar pago'">
      <div class="form">
        <p class="pago-info">{{ pagoActual.descripcion }} — Saldo: <strong>{{ moneda(pagoActual.saldo) }}</strong></p>
        <BaseInput
          :model-value="String(montoPago)"
          @update:model-value="montoPago = Number($event)"
          label="Monto"
          tipo="number"
        />
        <BaseSelect v-model="metodoPago" label="Método de pago" :opciones="metodos" />
        <p v-if="errorModal" class="form__error">{{ errorModal }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="modalAbierto = false">Cancelar</BaseButton>
        <BaseButton :cargando="procesando" @click="confirmarPago">Confirmar</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; margin-bottom: var(--space-lg); }
.resumen-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
.rcard {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: var(--bg-surface);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.rcard__icono--cobrar { color: var(--success); }
.rcard__icono--pagar { color: var(--danger); }
.rcard__icono--caja { color: var(--accent); }
.rcard div { display: flex; flex-direction: column; }
.rcard__label { font-size: var(--text-xs); color: var(--text-muted); }
.rcard__valor { font-size: var(--text-xl); font-weight: 700; }
.badge { font-size: var(--text-xs); font-weight: 600; padding: 4px 10px; border-radius: var(--radius-sm); }
.badge--ok { background: var(--success-soft); color: var(--success); }
.badge--pend { background: var(--warning-soft); color: var(--warning); }
.badge--info { background: var(--info-soft); color: var(--info); }
.monto--ingreso { color: var(--success); }
.monto--egreso { color: var(--danger); }
.form { display: flex; flex-direction: column; gap: var(--space-md); }
.pago-info { font-size: var(--text-sm); color: var(--text-secondary); padding: var(--space-sm) 0; }
.form__error { background: var(--danger-soft); color: var(--danger); padding: var(--space-sm) var(--space-md); border-radius: var(--radius-sm); font-size: var(--text-sm); }
@media (max-width: 768px) {
  .resumen-cards { grid-template-columns: 1fr; }
}
</style>