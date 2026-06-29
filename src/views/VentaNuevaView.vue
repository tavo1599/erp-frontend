<!-- src/views/VentaNuevaView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Trash2, ArrowLeft, FileText, Receipt, CreditCard } from 'lucide-vue-next';
import { ventasService } from '../services/ventas.service';
import { clientesService, type Cliente } from '../services/clientes.service';
import { productosService, type Producto } from '../services/productos.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';

const router = useRouter();
const { moneda } = useFormato();
const toast = useToast();

// ============================================================
// DATOS BASE
// ============================================================
const clientes = ref<Cliente[]>([]);
const productos = ref<Producto[]>([]);
const emitiendo = ref(false);
const resultado = ref<any>(null);

const clienteId = ref('');
const tipoComprobante = ref('01');
const condicionPago = ref('CONTADO');
const diasCredito = ref(30);

const carrito = ref<{ producto: Producto; cantidad: number; descuentoPct: number }[]>([]);
const descuentoGlobalPct = ref(0);
const productoSel = ref('');

// ============================================================
// MEDIOS DE PAGO
// ============================================================
interface Pago {
  metodo: string;
  monto: number;
  referencia: string;
}

const pagos = ref<Pago[]>([
  { metodo: 'EFECTIVO', monto: 0, referencia: '' },
]);

const metodosOpciones = [
  { valor: 'EFECTIVO', texto: 'Efectivo' },
  { valor: 'YAPE', texto: 'Yape / Plin' },
  { valor: 'TRANSFERENCIA', texto: 'Transferencia' },
  { valor: 'TARJETA_DEBITO', texto: 'Tarjeta de débito' },
  { valor: 'TARJETA_CREDITO', texto: 'Tarjeta de crédito' },
  { valor: 'DEPOSITO', texto: 'Depósito' },
  { valor: 'CHEQUE', texto: 'Cheque' },
  { valor: 'OTRO', texto: 'Otro' },
];

const sumaPagos = computed(() =>
  pagos.value.reduce((s, p) => s + Number(p.monto || 0), 0)
);

const vuelto = computed(() => {
  const diff = sumaPagos.value - totales.value.total;
  return diff > 0.001 ? diff : 0;
});

const faltaPagar = computed(() => {
  const diff = totales.value.total - sumaPagos.value;
  return diff > 0.001 ? diff : 0;
});

function agregarPago() {
  pagos.value.push({ metodo: 'EFECTIVO', monto: 0, referencia: '' });
}

function quitarPago(i: number) {
  if (pagos.value.length > 1) {
    pagos.value.splice(i, 1);
  }
}

// Atajo: llenar el primer pago con el total exacto
function autocompletarPagoTotal() {
  if (pagos.value.length === 1) {
    pagos.value[0].monto = Number(totales.value.total.toFixed(2));
  }
}

// ============================================================
// SELECTORES Y OPCIONES
// ============================================================
const serie = computed(() => (tipoComprobante.value === '01' ? 'F001' : 'B001'));

const tiposComprobante = [
  { valor: '01', texto: 'Factura' },
  { valor: '03', texto: 'Boleta' },
];
const condicionesPago = [
  { valor: 'CONTADO', texto: 'Contado' },
  { valor: 'CREDITO', texto: 'Crédito' },
];

const opcionesClientes = computed(() =>
  clientes.value.map((c) => ({ valor: c.id, texto: `${c.razon_social} (${c.numero_documento})` })),
);
const opcionesProductos = computed(() =>
  productos.value.map((p) => ({ valor: p.id, texto: `${p.nombre} - ${moneda(p.precio_venta)}` })),
);

// ============================================================
// CÁLCULOS (separados por tipo de IGV)
// ============================================================

// Subtotal sin descuentos (auditoría)
const subtotalSinDescuentos = computed(() =>
  carrito.value.reduce((s, i) => s + Number(i.producto.precio_venta) * i.cantidad, 0)
);

// Descuento total por líneas
const descuentoLineasTotal = computed(() => {
  return carrito.value.reduce((s, i) => {
    const precio = Number(i.producto.precio_venta);
    return s + precio * i.cantidad * (i.descuentoPct / 100);
  }, 0);
});

// Totales separados por tipo de IGV
const totales = computed(() => {
  let gravadoConIgv = 0;
  let exonerado = 0;
  let inafecto = 0;

  for (const item of carrito.value) {
    const tipoIgv = item.producto.tipo_igv || '10';
    const precio = Number(item.producto.precio_venta);
    const precioConDescuento = precio * (1 - item.descuentoPct / 100);
    const lineaTotal = precioConDescuento * item.cantidad;

    if (tipoIgv === '10') gravadoConIgv += lineaTotal;
    else if (tipoIgv === '20') exonerado += lineaTotal;
    else if (tipoIgv === '30') inafecto += lineaTotal;
  }

  // Aplicar descuento global proporcionalmente
  const factor = 1 - descuentoGlobalPct.value / 100;
  gravadoConIgv *= factor;
  exonerado *= factor;
  inafecto *= factor;

  // Separar gravado en base + IGV
  const gravadoSinIgv = gravadoConIgv / 1.18;
  const igv = gravadoSinIgv * 0.18;
  const total = gravadoConIgv + exonerado + inafecto;

  return {
    gravado: gravadoSinIgv,
    exonerado,
    inafecto,
    igv,
    total,
  };
});

// Compatibilidad con el resto del template
const totalConIgv = computed(() => totales.value.total);

// Monto del descuento global
const descuentoGlobalMonto = computed(() => {
  const sinGlobal = subtotalSinDescuentos.value - descuentoLineasTotal.value;
  return sinGlobal * (descuentoGlobalPct.value / 100);
});

// ============================================================
// UTILIDAD ESTIMADA
// ============================================================
const costoTotal = computed(() =>
  carrito.value.reduce((s, i) => {
    const costo = Number(i.producto.precio_compra || 0);
    return s + costo * i.cantidad;
  }, 0)
);

const utilidad = computed(() => totales.value.total - costoTotal.value);

const margenPct = computed(() => {
  if (totales.value.total === 0) return 0;
  return (utilidad.value / totales.value.total) * 100;
});

// ============================================================
// ACCIONES
// ============================================================
function agregarProducto() {
  if (!productoSel.value) return;
  const prod = productos.value.find((p) => p.id === productoSel.value);
  if (!prod) return;
  const existe = carrito.value.find((i) => i.producto.id === prod.id);
  if (existe) {
    existe.cantidad++;
  } else {
    carrito.value.push({ producto: prod, cantidad: 1, descuentoPct: 0 });
  }
  productoSel.value = '';
}

function quitarProducto(index: number) {
  carrito.value.splice(index, 1);
}

async function emitir() {
  if (!clienteId.value) { toast.advertencia('Selecciona un cliente'); return; }
  if (carrito.value.length === 0) { toast.advertencia('Agrega al menos un producto'); return; }
  if (condicionPago.value === 'CONTADO' && faltaPagar.value > 0) {
    toast.advertencia(`Falta cubrir S/ ${faltaPagar.value.toFixed(2)} en los pagos`);
    return;
  }

  emitiendo.value = true;
  try {
    const data = await ventasService.emitir({
      cliente_id: clienteId.value,
      tipo_comprobante: tipoComprobante.value,
      serie: serie.value,
      condicion_pago: condicionPago.value,
      dias_credito: condicionPago.value === 'CREDITO' ? diasCredito.value : 0,
      descuento_global_porcentaje: descuentoGlobalPct.value,
      detalles: carrito.value.map((i) => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
        descuento_porcentaje: i.descuentoPct,
      })),
      pagos: condicionPago.value === 'CONTADO' 
        ? pagos.value.filter(p => Number(p.monto) > 0)
        : undefined,
    } as any);
    
    // Ahora SIEMPRE que llegue aquí, fue ACEPTADO (el backend lanza throw si rechaza)
    resultado.value = data;
    toast.exito(`Comprobante ${data.comprobante} aceptado por SUNAT`);
    
  } catch (e: any) {
    // Manejo mejorado: distinguir si es rechazo SUNAT o error del sistema
    const errorData = e.response?.data?.message;
    
    if (errorData?.sunat_codigo) {
      // Rechazo SUNAT con código y descripción
      toast.error(
        `SUNAT rechazó: ${errorData.sunat_descripcion}`,
      );
      console.warn('SUNAT código:', errorData.sunat_codigo, '- Correlativo no avanzó');
    } else if (errorData?.mensaje) {
      // Mensaje con objeto (otros errores de validación)
      toast.error(errorData.mensaje);
    } else if (typeof errorData === 'string') {
      // Mensaje simple
      toast.error(errorData);
    } else {
      toast.error('Error al emitir el comprobante');
    }
  } finally {
    emitiendo.value = false;
  }
}

async function verPdf(formato: 'a4' | 'ticket' = 'a4') {
  if (!resultado.value?.venta_id) return;
  try {
    const url = await ventasService.obtenerPdf(resultado.value.venta_id, formato);
    window.open(url, '_blank');
  } catch {
    toast.error('No se pudo cargar el PDF');
  }
}

onMounted(async () => {
  clientes.value = await clientesService.listar();
  productos.value = await productosService.listar();
});
</script>

<template>
  <div class="anim-entrada">
    <button class="volver" @click="router.push('/ventas')">
      <ArrowLeft :size="18" /> Volver
    </button>

    <h1>Nueva venta</h1>

    <!-- Resultado tras emitir -->
    <div v-if="resultado" class="resultado" :class="resultado.estado === 'ACEPTADO' ? 'resultado--ok' : 'resultado--error'">
      <h2>{{ resultado.estado === 'ACEPTADO' ? '✓ Comprobante aceptado' : '✕ Comprobante rechazado' }}</h2>
      <p>{{ resultado.comprobante }} — {{ resultado.sunat_descripcion || resultado.error_sunat }}</p>

      <!-- Selector de formato (solo si fue aceptado) -->
      <div v-if="resultado.estado === 'ACEPTADO'" class="resultado__formato">
        <p class="resultado__formato-label">Descargar PDF en:</p>
        <div class="resultado__acciones">
          <BaseButton @click="verPdf('a4')">
            <FileText :size="18" /> Formato A4
          </BaseButton>
          <BaseButton variant="secondary" @click="verPdf('ticket')">
            <Receipt :size="18" /> Ticket 80mm
          </BaseButton>
        </div>
      </div>

      <div class="resultado__acciones" style="margin-top: var(--space-md);">
        <BaseButton variant="secondary" @click="router.push('/ventas')">Ir a ventas</BaseButton>
      </div>
    </div>

    <!-- Formulario de emisión -->
    <div v-else class="emision">
      <!-- Datos del comprobante -->
      <div class="panel">
        <h3 class="panel__titulo">Datos del comprobante</h3>
        <div class="panel__grid">
          <BaseSelect v-model="tipoComprobante" label="Tipo" :opciones="tiposComprobante" />
          <BaseSelect v-model="clienteId" label="Cliente" :opciones="opcionesClientes" placeholder="Selecciona un cliente" />
          <BaseSelect v-model="condicionPago" label="Condición de pago" :opciones="condicionesPago" />
        </div>
      </div>

      <!-- Productos -->
      <div class="panel">
        <h3 class="panel__titulo">Productos</h3>
        <div class="agregar-producto">
          <BaseSelect v-model="productoSel" :opciones="opcionesProductos" placeholder="Selecciona un producto" />
          <BaseButton @click="agregarProducto"><Plus :size="18" /></BaseButton>
        </div>

        <!-- Carrito -->
        <div v-if="carrito.length > 0" class="carrito">
          <div class="carrito__header">
            <span>Producto</span>
            <span class="centro">Stock</span>
            <span class="centro">Cantidad</span>
            <span class="derecha">P.U.</span>
            <span class="centro">Desc %</span>
            <span class="derecha">Subtotal</span>
            <span></span>
          </div>
          <div v-for="(item, i) in carrito" :key="i" class="carrito__fila">
            <span class="carrito__nombre">{{ item.producto.nombre }}</span>
            <span class="centro stock-badge" :class="{ 'stock-bajo': Number(item.producto.stock_actual) <= 10 }">
              {{ Number(item.producto.stock_actual) }}
            </span>
            <input
              v-model.number="item.cantidad"
              type="number"
              min="1"
              :max="Number(item.producto.stock_actual)"
              class="carrito__input centro"
            />
            <span class="derecha">{{ moneda(Number(item.producto.precio_venta)) }}</span>
            <input
              v-model.number="item.descuentoPct"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="carrito__input centro"
              placeholder="0"
            />
            <span class="derecha">
              <strong>{{ moneda(Number(item.producto.precio_venta) * item.cantidad * (1 - item.descuentoPct / 100)) }}</strong>
            </span>
            <button class="carrito__quitar" @click="quitarProducto(i)" title="Quitar">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>

<!-- Sección final: pagos a la izquierda + totales a la derecha -->
      <div v-if="carrito.length > 0" class="cierre-grid">
        <!-- Medios de pago (solo CONTADO) -->
        <div v-if="condicionPago === 'CONTADO'" class="panel">
          <div class="panel__head">
            <h3 class="panel__titulo">
              <CreditCard :size="18" class="panel__icono" />
              Medios de pago
            </h3>
            <div class="panel__acciones">
              <button class="btn-mini" @click="autocompletarPagoTotal" title="Llenar con el total exacto">
                Auto total
              </button>
              <button class="btn-mini btn-mini--accent" @click="agregarPago">
                <Plus :size="14" /> Agregar
              </button>
            </div>
          </div>

          <div class="pagos">
            <div v-for="(pago, i) in pagos" :key="i" class="pago-fila">
              <BaseSelect
                v-model="pago.metodo"
                :opciones="metodosOpciones"
                label="Método"
              />
              <div class="pago-fila__monto">
                <label class="pago-fila__label">Monto</label>
                <input
                  v-model.number="pago.monto"
                  type="number"
                  min="0"
                  step="0.01"
                  class="pago-fila__input"
                  placeholder="0.00"
                />
              </div>
              <div class="pago-fila__ref" v-if="pago.metodo !== 'EFECTIVO'">
                <label class="pago-fila__label">N° operación</label>
                <input
                  v-model="pago.referencia"
                  type="text"
                  class="pago-fila__input"
                  placeholder="(opcional)"
                />
              </div>
              <button
                v-if="pagos.length > 1"
                class="pago-fila__quitar"
                @click="quitarPago(i)"
                title="Quitar"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <!-- Resumen de pagos -->
          <div class="pago-resumen">
            <div class="pago-resumen__linea">
              <span>Total a pagar</span>
              <strong>{{ moneda(totales.total) }}</strong>
            </div>
            <div class="pago-resumen__linea">
              <span>Total ingresado</span>
              <strong>{{ moneda(sumaPagos) }}</strong>
            </div>
            <div v-if="faltaPagar > 0" class="pago-resumen__alerta pago-resumen__alerta--falta">
              <span>Falta pagar</span>
              <strong>{{ moneda(faltaPagar) }}</strong>
            </div>
            <div v-if="vuelto > 0" class="pago-resumen__alerta pago-resumen__alerta--vuelto">
              <span>Vuelto a entregar</span>
              <strong>{{ moneda(vuelto) }}</strong>
            </div>
          </div>
        </div>

        <!-- Espaciador cuando es CRÉDITO (mantiene los totales a la derecha) -->
        <div v-else class="cierre-vacio">
          <div class="info-credito">
            <CreditCard :size="32" class="info-credito__icono" />
            <p class="info-credito__titulo">Venta al crédito</p>
            <p class="info-credito__texto">
              Se generará una cuenta por cobrar. El cobro se registra desde Finanzas cuando el cliente pague.
            </p>
          </div>
        </div>

        <!-- Totales (siempre a la derecha) -->
        <div class="totales-card">
          <div class="totales__linea">
            <span>Subtotal sin descuento</span>
            <span>{{ moneda(subtotalSinDescuentos) }}</span>
          </div>
          <div v-if="descuentoLineasTotal > 0" class="totales__linea totales__descuento">
            <span>Descuentos por línea</span>
            <span>− {{ moneda(descuentoLineasTotal) }}</span>
          </div>

          <!-- Descuento global -->
          <div class="totales__linea totales__global">
            <span>Descuento global (%)</span>
            <input
              v-model.number="descuentoGlobalPct"
              type="number"
              min="0"
              max="100"
              step="0.5"
              class="descuento-global-input"
            />
          </div>
          <div v-if="descuentoGlobalMonto > 0" class="totales__linea totales__descuento">
            <span>Descuento aplicado</span>
            <span>− {{ moneda(descuentoGlobalMonto) }}</span>
          </div>

          <!-- Utilidad estimada -->
          <div v-if="costoTotal > 0" class="totales__utilidad">
            <div class="utilidad__linea">
              <span>Costo total</span>
              <span>{{ moneda(costoTotal) }}</span>
            </div>
            <div class="utilidad__linea utilidad__ganancia" :class="{
              'utilidad__ganancia--baja': margenPct < 15,
              'utilidad__ganancia--buena': margenPct >= 15 && margenPct < 30,
              'utilidad__ganancia--alta': margenPct >= 30,
            }">
              <span>Utilidad estimada</span>
              <span>{{ moneda(utilidad) }} ({{ margenPct.toFixed(1) }}%)</span>
            </div>
          </div>

          <div class="totales__separador"></div>

          <div v-if="totales.gravado > 0" class="totales__linea">
            <span>Op. Gravada</span>
            <span>{{ moneda(totales.gravado) }}</span>
          </div>
          <div v-if="totales.exonerado > 0" class="totales__linea">
            <span>Op. Exonerada</span>
            <span>{{ moneda(totales.exonerado) }}</span>
          </div>
          <div v-if="totales.inafecto > 0" class="totales__linea">
            <span>Op. Inafecta</span>
            <span>{{ moneda(totales.inafecto) }}</span>
          </div>
          <div v-if="totales.igv > 0" class="totales__linea">
            <span>IGV (18%)</span>
            <span>{{ moneda(totales.igv) }}</span>
          </div>
          <div class="totales__total">
            <span>TOTAL</span>
            <span>{{ moneda(totales.total) }}</span>
          </div>
        </div>
      </div>

      <!-- Botón emitir centrado al final -->
      <div v-if="carrito.length > 0" class="acciones-finales">
        <BaseButton :cargando="emitiendo" bloque @click="emitir">
          Emitir comprobante
        </BaseButton>
      </div>
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
h1 { margin-bottom: var(--space-lg); }

/* Layout general */
.emision {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.panel__titulo {
  font-size: var(--text-base);
  margin-bottom: var(--space-md);
}
.panel__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

.agregar-producto {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-sm);
  align-items: end;
  margin-bottom: var(--space-md);
}

/* Carrito */
.carrito {
  margin-top: var(--space-md);
  background: var(--bg-surface-2);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
}
.carrito__header, .carrito__fila {
  display: grid;
  grid-template-columns: 2fr 70px 90px 90px 80px 110px 32px;
  gap: var(--space-sm);
  align-items: center;
  padding: var(--space-sm) var(--space-md);
}
.carrito__header {
  background: var(--bg-surface);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.carrito__fila {
  border-top: 1px solid var(--border);
  font-size: var(--text-sm);
  background: var(--bg-surface);
}
.carrito__nombre { font-weight: 500; }
.centro { text-align: center; }
.derecha { text-align: right; }
.carrito__input {
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  text-align: center;
  width: 100%;
}
.stock-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--success-soft);
  color: var(--success);
  font-weight: 600;
}
.stock-bajo {
  background: var(--warning-soft);
  color: var(--warning);
}
.carrito__quitar {
  background: none; border: none; color: var(--danger);
  padding: 4px; display: flex; cursor: pointer;
  border-radius: var(--radius-sm);
}
.carrito__quitar:hover { background: var(--danger-soft); }

/* Totales */
.totales-card {
  margin-top: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  border: 1px solid var(--border);
  max-width: 460px;
  margin-left: auto;
}
.totales__linea {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  padding: var(--space-sm) 0;
}
.totales__descuento { color: var(--danger); }
.totales__global {
  align-items: center;
  background: var(--accent-soft);
  margin: var(--space-sm) calc(var(--space-lg) * -1);
  padding: var(--space-sm) var(--space-lg);
}
.descuento-global-input {
  width: 80px;
  padding: 6px;
  text-align: center;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.totales__utilidad {
  background: var(--bg-surface-2);
  padding: var(--space-sm) var(--space-md);
  margin: var(--space-sm) calc(var(--space-lg) * -1);
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
}
.utilidad__linea {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  padding: 4px 0;
}
.utilidad__ganancia { font-weight: 700; }
.utilidad__ganancia--baja { color: var(--danger); }
.utilidad__ganancia--buena { color: var(--warning); }
.utilidad__ganancia--alta { color: var(--success); }

.totales__separador {
  height: 1px;
  background: var(--border);
  margin: var(--space-sm) 0;
}
.totales__total {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-lg);
  font-weight: 700;
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
  margin-top: var(--space-sm);
}

/* Resultado */
.resultado {
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  text-align: center;
}
.resultado--ok { background: var(--success-soft); }
.resultado--error { background: var(--danger-soft); }
.resultado h2 { margin-bottom: var(--space-sm); }
.resultado__acciones {
  display: flex; gap: var(--space-sm); justify-content: center;
  margin-top: var(--space-lg);
}

@media (max-width: 1000px) {
  .carrito__header, .carrito__fila {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .carrito__header { display: none; }
  .carrito__fila { padding: var(--space-md); }
}
@media (max-width: 800px) {
  .panel__grid { grid-template-columns: 1fr; }
}
.resultado__formato {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid rgba(0,0,0,0.1);
}
.resultado__formato-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}
/* Panel de medios de pago */
.panel__head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-md);
}
.panel__titulo {
  display: flex; align-items: center; gap: var(--space-sm);
  margin: 0;
  font-size: var(--text-base);
}
.panel__icono { color: var(--accent); }
.panel__acciones { display: flex; gap: var(--space-sm); }

.btn-mini {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--bg-surface-2); color: var(--text-secondary);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs); font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}
.btn-mini:hover { background: var(--bg-surface); border-color: var(--text-secondary); }
.btn-mini--accent {
  background: var(--accent-soft); color: var(--accent);
  border-color: var(--accent);
}
.btn-mini--accent:hover { background: var(--accent); color: white; }

.pagos { display: flex; flex-direction: column; gap: var(--space-sm); }
.pago-fila {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr 32px;
  gap: var(--space-sm);
  align-items: end;
  padding: var(--space-sm);
  background: var(--bg-surface-2);
  border-radius: var(--radius-sm);
}
.pago-fila__monto, .pago-fila__ref { display: flex; flex-direction: column; gap: 4px; }
.pago-fila__label { font-size: var(--text-xs); color: var(--text-secondary); }
.pago-fila__input {
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}
.pago-fila__quitar {
  background: none; border: none; color: var(--danger);
  padding: 4px; display: flex; height: 38px; align-items: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.pago-fila__quitar:hover { background: var(--danger-soft); }

.pago-resumen {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
  display: flex; flex-direction: column; gap: var(--space-sm);
}
.pago-resumen__linea {
  display: flex; justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.pago-resumen__alerta {
  display: flex; justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: var(--text-base);
}
.pago-resumen__alerta--falta {
  background: var(--danger-soft); color: var(--danger);
}
.pago-resumen__alerta--vuelto {
  background: var(--success-soft); color: var(--success);
}

.acciones-finales {
  margin-top: var(--space-md);
}

@media (max-width: 700px) {
  .pago-fila { grid-template-columns: 1fr; }
  .pago-fila__quitar { width: auto; justify-content: flex-end; }
}
/* Grilla del cierre: pagos (izquierda) + totales (derecha) */
.cierre-grid {
  display: grid;
  grid-template-columns: 1fr 460px;
  gap: var(--space-md);
  align-items: start;
  margin-top: var(--space-md);
}

/* Quitar el margin-left: auto del totales-card cuando está en la grilla */
.cierre-grid .totales-card {
  margin: 0;
  max-width: 100%;
  width: 100%;
}

/* Info de crédito (cuando NO hay medios de pago) */
.cierre-vacio {
  display: flex;
  align-items: center;
  justify-content: center;
}
.info-credito {
  text-align: center;
  padding: var(--space-xl);
  background: var(--bg-surface);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
}
.info-credito__icono {
  color: var(--accent);
  margin-bottom: var(--space-sm);
}
.info-credito__titulo {
  font-weight: 700;
  font-size: var(--text-base);
  color: var(--text-primary);
  margin-bottom: 4px;
}
.info-credito__texto {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Acciones finales: botón centrado con ancho máximo */
.acciones-finales {
  margin-top: var(--space-md);
  display: flex;
  justify-content: center;
}
.acciones-finales :deep(button) {
  max-width: 460px;
  width: 100%;
}

/* Responsive: en pantallas chicas, todo apilado */
@media (max-width: 1100px) {
  .cierre-grid {
    grid-template-columns: 1fr;
  }
  .cierre-vacio {
    /* Cuando se apila, no ocupa espacio inútil */
    display: none;
  }
}
</style>