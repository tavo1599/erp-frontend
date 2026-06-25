<!-- src/views/NotaNuevaView.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRoute } from 'vue-router';
import { onMounted } from 'vue';
import { ArrowLeft, Search, Send, X } from 'lucide-vue-next';
import { ventasService, type VentaRecuperada } from '../services/ventas.service';
import { notasService } from '../services/notas.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import { useFrases } from '../composables/useFrases';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';

// Interfaz clara para los items de la nota
interface ItemNota {
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
}

const route = useRoute();
const router = useRouter();
const { moneda, fecha } = useFormato();
const toast = useToast();
const { confirmar } = useConfirm();
const { frase } = useFrases();

// --- Datos para buscar el comprobante a afectar ---
const tipoComprobanteAfectado = ref('01');
const serieAfectada = ref('');
const numeroAfectado = ref('');

const tiposComprobante = [
  { valor: '01', texto: 'Factura' },
  { valor: '03', texto: 'Boleta de venta' },
];

// --- Datos del comprobante recuperado ---
const ventaRecuperada = ref<VentaRecuperada | null>(null);
const buscando = ref(false);
const fraseBusqueda = ref('');

// --- Datos de la nota ---
const serieNota = ref('FC01');
const codigoMotivo = ref('01');
const descripcionMotivo = ref('Anulación de la operación');

onMounted(async () => {
  // Si vienes con query params, precargar y recuperar automáticamente
  if (route.query.tipo && route.query.serie && route.query.numero) {
    tipoComprobanteAfectado.value = String(route.query.tipo);
    serieAfectada.value = String(route.query.serie);
    numeroAfectado.value = String(route.query.numero);
    ajustarSerie();
    // Recuperar automáticamente
    await recuperar();
  }
});

const motivos = [
  { valor: '01', texto: 'Anulación de la operación' },
  { valor: '02', texto: 'Anulación por error en el RUC' },
  { valor: '03', texto: 'Corrección por error en la descripción' },
  { valor: '04', texto: 'Descuento global' },
  { valor: '05', texto: 'Descuento por ítem' },
  { valor: '06', texto: 'Devolución total' },
  { valor: '07', texto: 'Devolución por ítem' },
  { valor: '08', texto: 'Bonificación' },
  { valor: '09', texto: 'Disminución en el valor' },
  { valor: '10', texto: 'Otros conceptos' },
];

// --- Ítems de la nota (con interfaz tipada) ---
const items = ref<ItemNota[]>([]);

// --- Emisión ---
const emitiendo = ref(false);
const fraseEmision = ref('');

// --- Computados ---
const totales = computed(() => {
  const totalConIgv = items.value.reduce(
    (s, i) => s + i.cantidad * i.precio_unitario,
    0,
  );
  const totalGravado = totalConIgv / 1.18;
  const totalIgv = totalGravado * 0.18;
  return {
    gravado: totalGravado,
    igv: totalIgv,
    total: totalConIgv,
  };
});

function volver() {
  router.push('/notas');
}

function ajustarSerie() {
  serieNota.value = tipoComprobanteAfectado.value === '01' ? 'FC01' : 'BC01';
}

async function recuperar() {
  if (!serieAfectada.value || !numeroAfectado.value) {
    toast.advertencia('Ingresa la serie y el número del comprobante');
    return;
  }

  fraseBusqueda.value = frase('consultando');
  buscando.value = true;
  try {
    const venta = await ventasService.buscarPorNumero(
      tipoComprobanteAfectado.value,
      serieAfectada.value.trim().toUpperCase(),
      Number(numeroAfectado.value),
    );
    ventaRecuperada.value = venta;
    // Mapeo tipado explícito
    items.value = venta.detalles.map<ItemNota>((d) => ({
      producto_id: d.producto_id,
      producto_nombre: d.producto_nombre,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
    }));
    toast.exito(`Comprobante ${venta.comprobante} recuperado`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se encontró el comprobante');
    ventaRecuperada.value = null;
    items.value = [];
  } finally {
    buscando.value = false;
  }
}

function actualizarMotivo() {
  const m = motivos.find((m) => m.valor === codigoMotivo.value);
  if (m) descripcionMotivo.value = m.texto;
}

function quitarItem(i: number) {
  items.value.splice(i, 1);
}

async function emitir() {
  if (!ventaRecuperada.value) {
    toast.advertencia('Primero recupera el comprobante a afectar');
    return;
  }
  if (items.value.length === 0) {
    toast.advertencia('Debes incluir al menos un ítem en la nota');
    return;
  }

  const ok = await confirmar({
    titulo: '¿Emitir nota de crédito?',
    mensaje: `Se emitirá una nota de crédito ${serieNota.value}-XXXX que afecta a ${ventaRecuperada.value.comprobante}. Motivo: ${descripcionMotivo.value}.`,
    textoConfirmar: 'Sí, emitir',
  });
  if (!ok) return;

  fraseEmision.value = frase('emitiendo');
  emitiendo.value = true;
  try {
    const resultado = await notasService.emitir({
      tipo_nota: '07',
      serie: serieNota.value,
      tipo_comprobante_afectado: tipoComprobanteAfectado.value,
      comprobante_afectado: ventaRecuperada.value.comprobante,
      codigo_motivo: codigoMotivo.value,
      descripcion_motivo: descripcionMotivo.value,
      cliente_numero_documento: ventaRecuperada.value.cliente.numero_documento,
      cliente_razon_social: ventaRecuperada.value.cliente.razon_social,
      detalles: items.value.map((i) => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
      })),
    });

    if (resultado.estado === 'ACEPTADO') {
      toast.exito(`Nota emitida: ${resultado.comprobante}`);
      router.push('/notas');
    } else {
      toast.error(`SUNAT rechazó la nota: ${resultado.error_sunat || 'Error desconocido'}`);
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al emitir la nota');
  } finally {
    emitiendo.value = false;
  }
}
</script>

<template>
  <div class="anim-entrada">
    <button class="volver" @click="volver">
      <ArrowLeft :size="18" /> Volver a notas
    </button>

    <h1>Nueva nota de crédito</h1>
    <p class="pagina-subtitulo">Anula, corrige o ajusta un comprobante emitido</p>

    <!-- PASO 1: Recuperar comprobante -->
    <div class="seccion">
      <div class="seccion__head">
        <span class="numero-paso">1</span>
        <h3>Comprobante a afectar</h3>
      </div>
      <div class="recuperar-form">
        <BaseSelect
          v-model="tipoComprobanteAfectado"
          label="Tipo"
          :opciones="tiposComprobante"
          @update:model-value="ajustarSerie"
        />
        <BaseInput v-model="serieAfectada" label="Serie" placeholder="F001 / B001" />
        <BaseInput v-model="numeroAfectado" label="Número" tipo="number" placeholder="123" />
        <button
          type="button"
          class="btn-consultar"
          :disabled="buscando"
          @click="recuperar"
        >
          <Search :size="16" :class="{ 'spin': buscando }" />
          {{ buscando ? fraseBusqueda : 'Recuperar' }}
        </button>
      </div>

      <!-- Datos del comprobante recuperado -->
      <div v-if="ventaRecuperada" class="info-recuperado">
        <div class="info-recuperado__cliente">
          <span class="info-recuperado__label">Cliente:</span>
          <strong>{{ ventaRecuperada.cliente.razon_social }}</strong>
          <span class="info-recuperado__doc">{{ ventaRecuperada.cliente.numero_documento }}</span>
        </div>
        <div class="info-recuperado__fecha">
          Emitido el {{ fecha(ventaRecuperada.fecha_emision) }}
        </div>
        <div class="info-recuperado__total">
          Total original: <strong>{{ moneda(ventaRecuperada.importe_total) }}</strong>
        </div>
      </div>
    </div>

    <!-- PASO 2: Motivo de la nota -->
    <div v-if="ventaRecuperada" class="seccion anim-entrada">
      <div class="seccion__head">
        <span class="numero-paso">2</span>
        <h3>Motivo de la nota</h3>
      </div>
      <div class="motivo-form">
        <BaseSelect
          v-model="codigoMotivo"
          label="Motivo (SUNAT)"
          :opciones="motivos.map(m => ({ valor: m.valor, texto: `${m.valor} - ${m.texto}` }))"
          @update:model-value="actualizarMotivo"
        />
        <BaseInput v-model="descripcionMotivo" label="Descripción adicional" placeholder="Detalle del motivo" />
      </div>
    </div>

    <!-- PASO 3: Ítems a incluir en la nota -->
    <div v-if="ventaRecuperada" class="seccion anim-entrada">
      <div class="seccion__head">
        <span class="numero-paso">3</span>
        <h3>Ítems incluidos</h3>
      </div>
      <p class="ayuda">
        Por defecto se incluyen todos los ítems del comprobante. Puedes quitar los que no aplican o ajustar cantidades para una devolución parcial.
      </p>
      <div v-if="items.length > 0" class="items-lista">
        <div v-for="(item, i) in items" :key="i" class="item">
          <span class="item__nombre">{{ item.producto_nombre }}</span>
          <input
            v-model.number="item.cantidad"
            type="number"
            min="0.01"
            step="0.01"
            class="item__input"
          />
          <span class="item__precio">{{ moneda(item.precio_unitario) }}</span>
          <span class="item__subtotal">{{ moneda(item.cantidad * item.precio_unitario) }}</span>
          <button class="item__quitar" @click="quitarItem(i)" title="Quitar de la nota">
            <X :size="16" />
          </button>
        </div>
      </div>
      <p v-else class="vacio">No hay ítems en la nota.</p>
    </div>

    <!-- TOTALES y EMITIR -->
    <div v-if="ventaRecuperada && items.length > 0" class="totales-card anim-entrada">
      <div class="totales">
        <div class="totales__linea">
          <span>Op. Gravada</span>
          <span>{{ moneda(totales.gravado) }}</span>
        </div>
        <div class="totales__linea">
          <span>IGV (18%)</span>
          <span>{{ moneda(totales.igv) }}</span>
        </div>
        <div class="totales__total">
          <span>Total nota</span>
          <span>{{ moneda(totales.total) }}</span>
        </div>
      </div>
      <BaseButton :cargando="emitiendo" @click="emitir">
        <Send :size="18" /> {{ emitiendo ? fraseEmision : 'Emitir nota de crédito' }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.volver {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; color: var(--text-secondary);
  font-size: var(--text-sm); margin-bottom: var(--space-md);
}
.volver:hover { color: var(--accent); }
.pagina-subtitulo { color: var(--text-secondary); margin-bottom: var(--space-lg); }

.seccion {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.seccion__head {
  display: flex; align-items: center; gap: var(--space-sm);
  margin-bottom: var(--space-md);
}
.seccion__head h3 { margin: 0; font-size: var(--text-base); }
.numero-paso {
  width: 28px; height: 28px;
  background: var(--accent); color: white;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: var(--text-sm);
}

.recuperar-form {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto;
  gap: var(--space-md);
  align-items: end;
}
.btn-consultar {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--accent); color: white;
  border: none; padding: 0 16px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm); font-weight: 600;
  height: 40px; white-space: nowrap; flex-shrink: 0;
  transition: var(--transition);
}
.btn-consultar:hover:not(:disabled) { filter: brightness(0.92); }
.btn-consultar:disabled { opacity: 0.6; cursor: wait; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

.info-recuperado {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: var(--accent-soft);
  border-radius: var(--radius-md);
  display: flex; flex-direction: column; gap: 4px;
  font-size: var(--text-sm);
}
.info-recuperado__label { color: var(--text-secondary); margin-right: 6px; }
.info-recuperado__doc { color: var(--text-secondary); margin-left: 8px; }
.info-recuperado__fecha, .info-recuperado__total { color: var(--text-secondary); }

.motivo-form { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }

.ayuda { font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-md); }
.items-lista { display: flex; flex-direction: column; gap: var(--space-sm); }
.item {
  display: grid;
  grid-template-columns: 1fr 80px 100px 100px 32px;
  gap: var(--space-sm);
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface-2);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}
.item__nombre { font-weight: 500; }
.item__input {
  padding: 6px; text-align: center;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  width: 100%;
}
.item__precio, .item__subtotal { text-align: right; }
.item__subtotal { font-weight: 700; }
.item__quitar {
  background: none; border: none; color: var(--danger);
  padding: 4px; display: flex; cursor: pointer;
}
.item__quitar:hover { background: var(--danger-soft); border-radius: var(--radius-sm); }
.vacio { color: var(--text-muted); text-align: center; padding: var(--space-lg); }

.totales-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-top: var(--space-md);
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--space-lg);
  border: 1px solid var(--border);
}
.totales { flex: 1; max-width: 360px; }
.totales__linea {
  display: flex; justify-content: space-between;
  font-size: var(--text-sm); color: var(--text-secondary);
  padding: var(--space-sm) 0;
}
.totales__total {
  display: flex; justify-content: space-between;
  font-size: var(--text-lg); font-weight: 700;
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
  margin-top: var(--space-sm);
}
@media (max-width: 900px) {
  .recuperar-form { grid-template-columns: 1fr 1fr; }
  .motivo-form { grid-template-columns: 1fr; }
  .totales-card { flex-direction: column; align-items: stretch; }
  .totales { max-width: 100%; }
}
</style>