<!-- src/views/PuntoVentaView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ScanBarcode, Trash2, Plus, Minus, Keyboard, Wallet, Lock, X } from 'lucide-vue-next';
import { productosService, type Producto } from '../services/productos.service';
import { almacenesService, type Almacen } from '../services/almacenes.service';
import { ventasService } from '../services/ventas.service';
import { sunatService } from '../services/sunat.service';
import { cajaService, type CajaEstado } from '../services/caja.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/ui/BaseButton.vue';

const { moneda } = useFormato();
const toast = useToast();

// ============================================================
// DATOS
// ============================================================
const productos = ref<Producto[]>([]);
const almacenes = ref<Almacen[]>([]);
const almacenId = ref('');
const cargando = ref(true);

const busqueda = ref('');
const inputBusqueda = ref<HTMLInputElement | null>(null);

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}
const carrito = ref<ItemCarrito[]>([]);

// Cliente (por defecto "varios" → boleta)
const docCliente = ref('');
const nombreCliente = ref('');
const consultandoDoc = ref(false);

// Consulta DNI (8 díg.) o RUC (11 díg.) y autocompleta el nombre.
async function consultarDocumento() {
  const doc = docCliente.value.trim();
  if (doc.length !== 8 && doc.length !== 11) return;
  if (!/^\d+$/.test(doc)) return;
  consultandoDoc.value = true;
  try {
    if (doc.length === 8) {
      const p = await sunatService.consultarDni(doc);
      if (p?.nombre_completo) nombreCliente.value = p.nombre_completo;
    } else {
      const e = await sunatService.consultarRuc(doc);
      if (e?.razon_social) nombreCliente.value = e.razon_social;
    }
  } catch {
    toast.advertencia('No se pudo consultar el documento');
  } finally {
    consultandoDoc.value = false;
  }
}

// Pago
const metodoPago = ref<'EFECTIVO' | 'YAPE' | 'TARJETA'>('EFECTIVO');
const montoRecibido = ref<number | null>(null);

const emitiendo = ref(false);
const resultado = ref<any>(null);

const mostrarSelectorAlmacen = computed(() => almacenes.value.length > 1);

// ============================================================
// BÚSQUEDA / ESCANEO
// ============================================================
const resultadosBusqueda = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return [];
  return productos.value
    .filter((p) => {
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras || '').toLowerCase().includes(q) ||
        (p.codigo_sunat || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 8);
});

function onEnterBusqueda() {
  const q = busqueda.value.trim();
  if (!q) return;
  // 1) Coincidencia exacta por código de barras (lector)
  const exacto = productos.value.find((p) => (p.codigo_barras || '') === q);
  if (exacto) {
    agregarProducto(exacto);
    return;
  }
  // 2) Primer resultado de la búsqueda
  if (resultadosBusqueda.value.length > 0) {
    agregarProducto(resultadosBusqueda.value[0]);
    return;
  }
  toast.advertencia('Producto no encontrado');
}

function agregarProducto(producto: Producto) {
  const existente = carrito.value.find((i) => i.producto.id === producto.id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.value.push({ producto, cantidad: 1 });
  }
  busqueda.value = '';
  enfocarBusqueda();
}

function cambiarCantidad(item: ItemCarrito, delta: number) {
  const nueva = item.cantidad + delta;
  if (nueva <= 0) {
    quitar(item);
  } else {
    item.cantidad = nueva;
  }
}

function fijarCantidad(item: ItemCarrito, valor: number) {
  const n = Number(valor);
  if (!n || n <= 0) {
    quitar(item);
  } else {
    item.cantidad = n;
  }
}

function quitar(item: ItemCarrito) {
  carrito.value = carrito.value.filter((i) => i !== item);
}

function enfocarBusqueda() {
  nextTick(() => inputBusqueda.value?.focus());
}

// ============================================================
// TOTALES
// ============================================================
const total = computed(() =>
  carrito.value.reduce((s, i) => s + Number(i.producto.precio_venta) * i.cantidad, 0),
);
const cantidadItems = computed(() =>
  carrito.value.reduce((s, i) => s + i.cantidad, 0),
);
const vuelto = computed(() => {
  if (metodoPago.value !== 'EFECTIVO' || montoRecibido.value == null) return 0;
  const v = Number(montoRecibido.value) - total.value;
  return v > 0 ? v : 0;
});

// Comprobante: RUC (11 díg.) → factura, si no → boleta
const tipoComprobante = computed(() => (docCliente.value.trim().length === 11 ? '01' : '03'));
const serie = computed(() => (tipoComprobante.value === '01' ? 'F001' : 'B001'));

function montoExacto() {
  montoRecibido.value = Number(total.value.toFixed(2));
}

// ============================================================
// COBRAR / EMITIR
// ============================================================
async function cobrar() {
  if (carrito.value.length === 0) {
    toast.advertencia('Agrega al menos un producto');
    return;
  }
  if (tipoComprobante.value === '01' && !nombreCliente.value.trim()) {
    toast.advertencia('Para factura, ingresa la razón social del cliente (RUC)');
    return;
  }
  if (
    metodoPago.value === 'EFECTIVO' &&
    montoRecibido.value != null &&
    Number(montoRecibido.value) < total.value - 0.01
  ) {
    toast.advertencia('El monto recibido no cubre el total');
    return;
  }

  const doc = docCliente.value.trim();
  const payload: any = {
    almacen_id: almacenId.value || undefined,
    cliente_numero_documento: doc || '00000000',
    cliente_razon_social:
      nombreCliente.value.trim() || (doc ? 'CLIENTE' : 'CLIENTE VARIOS'),
    tipo_comprobante: tipoComprobante.value,
    serie: serie.value,
    condicion_pago: 'CONTADO',
    detalles: carrito.value.map((i) => ({
      producto_id: i.producto.id,
      cantidad: i.cantidad,
    })),
    pagos: [{ metodo: metodoPago.value === 'TARJETA' ? 'TARJETA_DEBITO' : metodoPago.value, monto: Number(total.value.toFixed(2)) }],
  };

  emitiendo.value = true;
  try {
    const data = await ventasService.emitir(payload);
    resultado.value = data;
    toast.exito(`Comprobante ${data.comprobante} emitido`);
    // Intentar abrir el ticket automáticamente
    verTicket();
  } catch (e: any) {
    const err = e.response?.data?.message;
    if (err?.sunat_descripcion) toast.error(`SUNAT rechazó: ${err.sunat_descripcion}`);
    else if (err?.mensaje) toast.error(err.mensaje);
    else if (typeof err === 'string') toast.error(err);
    else toast.error('Error al emitir el comprobante');
  } finally {
    emitiendo.value = false;
  }
}

async function verTicket() {
  if (!resultado.value?.venta_id) return;
  try {
    const url = await ventasService.obtenerPdf(resultado.value.venta_id, 'ticket');
    window.open(url, '_blank');
  } catch {
    toast.error('No se pudo abrir el ticket');
  }
}

function nuevaVenta() {
  carrito.value = [];
  busqueda.value = '';
  docCliente.value = '';
  nombreCliente.value = '';
  metodoPago.value = 'EFECTIVO';
  montoRecibido.value = null;
  resultado.value = null;
  enfocarBusqueda();
}

// ============================================================
// ATAJOS DE TECLADO
// ============================================================
function manejarAtajo(e: KeyboardEvent) {
  if (e.key === 'F9') {
    e.preventDefault();
    if (!emitiendo.value && !resultado.value) cobrar();
  } else if (e.key === 'F2') {
    e.preventDefault();
    enfocarBusqueda();
  } else if (e.key === 'F4') {
    e.preventDefault();
    montoExacto();
  } else if (e.key === 'Escape') {
    if (resultado.value) {
      nuevaVenta();
    } else if (busqueda.value) {
      busqueda.value = '';
    }
  }
}

// ============================================================
// CARGA
// ============================================================
async function cargarAlmacenes() {
  try {
    almacenes.value = await almacenesService.listar();
    const principal = almacenes.value.find((a) => a.es_principal) || almacenes.value[0];
    almacenId.value = principal?.id || '';
  } catch {
    /* sin almacenes: el backend usará el principal */
  }
}

// ============================================================
// CAJA (apertura / cierre)
// ============================================================
const caja = ref<CajaEstado>({ abierta: false });
const modalCaja = ref<'abrir' | 'cerrar' | null>(null);
const montoInicial = ref<number | null>(null);
const montoContado = ref<number | null>(null);
const obsCierre = ref('');
const procesandoCaja = ref(false);

async function cargarCaja() {
  try {
    caja.value = await cajaService.estado();
  } catch {
    /* silencioso */
  }
}

async function abrirCaja() {
  procesandoCaja.value = true;
  try {
    await cajaService.abrir(Number(montoInicial.value) || 0);
    toast.exito('Caja abierta');
    modalCaja.value = null;
    montoInicial.value = null;
    await cargarCaja();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo abrir la caja');
  } finally {
    procesandoCaja.value = false;
  }
}

const diferenciaCierre = computed(() => {
  if (montoContado.value == null || !caja.value.caja) return null;
  return Number((Number(montoContado.value) - caja.value.caja.monto_esperado).toFixed(2));
});

async function cerrarCaja() {
  if (montoContado.value == null) {
    toast.advertencia('Ingresa el monto contado');
    return;
  }
  procesandoCaja.value = true;
  try {
    const res = await cajaService.cerrar(Number(montoContado.value), obsCierre.value.trim() || undefined);
    const dif = res.diferencia;
    toast.exito(
      `Caja cerrada. ${dif === 0 ? 'Cuadró exacto' : dif > 0 ? `Sobró S/ ${dif}` : `Faltó S/ ${Math.abs(dif)}`}`,
    );
    modalCaja.value = null;
    montoContado.value = null;
    obsCierre.value = '';
    await cargarCaja();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo cerrar la caja');
  } finally {
    procesandoCaja.value = false;
  }
}

onMounted(async () => {
  cargando.value = true;
  try {
    productos.value = await productosService.listar();
    await cargarAlmacenes();
    await cargarCaja();
  } finally {
    cargando.value = false;
  }
  window.addEventListener('keydown', manejarAtajo);
  enfocarBusqueda();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', manejarAtajo);
});
</script>

<template>
  <div class="pos">
    <!-- Encabezado -->
    <div class="pos__top">
      <div class="pos__titulo">
        <ScanBarcode :size="22" />
        <h1>Punto de Venta</h1>
      </div>
      <div class="pos__top-derecha">
        <!-- Caja -->
        <button v-if="!caja.abierta" class="pos__caja pos__caja--cerrada" @click="modalCaja = 'abrir'">
          <Wallet :size="16" /> Abrir caja
        </button>
        <button v-else class="pos__caja pos__caja--abierta" @click="modalCaja = 'cerrar'" title="Cerrar caja">
          <Wallet :size="16" /> Caja: {{ moneda(caja.caja!.monto_esperado) }} <Lock :size="13" />
        </button>

        <label v-if="mostrarSelectorAlmacen" class="pos__almacen">
          Almacén
          <select v-model="almacenId">
            <option v-for="a in almacenes" :key="a.id" :value="a.id">
              {{ a.es_principal ? `${a.nombre} ★` : a.nombre }}
            </option>
          </select>
        </label>
        <span class="pos__atajos" title="Atajos de teclado">
          <Keyboard :size="16" /> F2 buscar · F4 exacto · F9 cobrar · Esc limpiar
        </span>
      </div>
    </div>

    <!-- Modal abrir caja -->
    <div v-if="modalCaja === 'abrir'" class="pos__exito-bg" @click.self="modalCaja = null">
      <div class="pos__caja-modal">
        <div class="pos__caja-head"><h2>Abrir caja</h2><button @click="modalCaja = null"><X :size="20" /></button></div>
        <label>Monto inicial (efectivo en caja)
          <input v-model.number="montoInicial" type="number" min="0" step="0.10" placeholder="0.00" autofocus />
        </label>
        <BaseButton bloque :cargando="procesandoCaja" @click="abrirCaja">Abrir caja</BaseButton>
      </div>
    </div>

    <!-- Modal cerrar caja -->
    <div v-if="modalCaja === 'cerrar' && caja.caja" class="pos__exito-bg" @click.self="modalCaja = null">
      <div class="pos__caja-modal">
        <div class="pos__caja-head"><h2>Cerrar caja</h2><button @click="modalCaja = null"><X :size="20" /></button></div>
        <div class="pos__caja-resumen">
          <div><span>Monto inicial</span><strong>{{ moneda(caja.caja.monto_inicial) }}</strong></div>
          <div><span>Ventas en efectivo</span><strong>{{ moneda(caja.caja.ventas_efectivo) }}</strong></div>
          <div class="pos__caja-esperado"><span>Esperado en caja</span><strong>{{ moneda(caja.caja.monto_esperado) }}</strong></div>
        </div>
        <label>Monto contado (lo que hay físicamente)
          <input v-model.number="montoContado" type="number" min="0" step="0.10" placeholder="0.00" autofocus />
        </label>
        <p v-if="diferenciaCierre !== null" class="pos__caja-dif" :class="diferenciaCierre === 0 ? 'ok' : diferenciaCierre > 0 ? 'sobra' : 'falta'">
          {{ diferenciaCierre === 0 ? 'Cuadra exacto ✓' : diferenciaCierre > 0 ? `Sobra ${moneda(diferenciaCierre)}` : `Falta ${moneda(Math.abs(diferenciaCierre))}` }}
        </p>
        <textarea v-model="obsCierre" placeholder="Observaciones (opcional)" rows="2"></textarea>
        <BaseButton bloque :cargando="procesandoCaja" @click="cerrarCaja">Cerrar caja</BaseButton>
      </div>
    </div>

    <div class="pos__grid">
      <!-- IZQUIERDA: búsqueda + carrito -->
      <section class="pos__izq">
        <div class="pos__buscar">
          <ScanBarcode :size="18" class="pos__buscar-icono" />
          <input
            ref="inputBusqueda"
            v-model="busqueda"
            type="text"
            placeholder="Escanea un código o escribe el nombre del producto…"
            autocomplete="off"
            @keydown.enter.prevent="onEnterBusqueda"
          />
          <!-- Resultados -->
          <ul v-if="resultadosBusqueda.length" class="pos__resultados">
            <li
              v-for="p in resultadosBusqueda"
              :key="p.id"
              @click="agregarProducto(p)"
            >
              <span class="pos__res-nombre">{{ p.nombre }}</span>
              <span class="pos__res-meta">
                <span v-if="p.codigo_barras" class="pos__res-cod">{{ p.codigo_barras }}</span>
                <span>Stock: {{ Number(p.stock_actual) }}</span>
                <strong>{{ moneda(Number(p.precio_venta)) }}</strong>
              </span>
            </li>
          </ul>
        </div>

        <!-- Carrito -->
        <div class="pos__carrito">
          <div v-if="carrito.length === 0" class="pos__vacio">
            <ScanBarcode :size="40" />
            <p>Escanea o busca productos para empezar</p>
          </div>

          <table v-else class="pos__tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="c">Cantidad</th>
                <th class="d">P. Unit.</th>
                <th class="d">Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in carrito" :key="item.producto.id">
                <td>
                  <div class="pos__prod">{{ item.producto.nombre }}</div>
                  <div class="pos__prod-sub">
                    Stock: {{ Number(item.producto.stock_actual) }}
                  </div>
                </td>
                <td class="c">
                  <div class="pos__cant">
                    <button @click="cambiarCantidad(item, -1)"><Minus :size="14" /></button>
                    <input
                      :value="item.cantidad"
                      type="number"
                      min="1"
                      @input="fijarCantidad(item, ($event.target as HTMLInputElement).valueAsNumber)"
                    />
                    <button @click="cambiarCantidad(item, 1)"><Plus :size="14" /></button>
                  </div>
                </td>
                <td class="d">{{ moneda(Number(item.producto.precio_venta)) }}</td>
                <td class="d">
                  <strong>{{ moneda(Number(item.producto.precio_venta) * item.cantidad) }}</strong>
                </td>
                <td class="c">
                  <button class="pos__quitar" @click="quitar(item)"><Trash2 :size="16" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- DERECHA: cliente + cobro -->
      <aside class="pos__der">
        <div class="pos__cliente">
          <h3>Cliente</h3>
          <div class="pos__doc">
            <input
              v-model="docCliente"
              type="text"
              maxlength="15"
              placeholder="DNI / RUC (opcional → Cliente varios)"
              @blur="consultarDocumento"
              @keydown.enter.prevent="consultarDocumento"
            />
            <span v-if="consultandoDoc" class="pos__doc-cargando">Consultando…</span>
          </div>
          <input
            v-model="nombreCliente"
            type="text"
            placeholder="Nombre / Razón social (se autocompleta con el DNI/RUC)"
          />
          <span class="pos__comprobante">
            {{ tipoComprobante === '01' ? 'Factura' : 'Boleta' }} · {{ serie }}
          </span>
        </div>

        <div class="pos__pago">
          <h3>Pago</h3>
          <div class="pos__metodos">
            <button :class="{ activo: metodoPago === 'EFECTIVO' }" @click="metodoPago = 'EFECTIVO'">Efectivo</button>
            <button :class="{ activo: metodoPago === 'YAPE' }" @click="metodoPago = 'YAPE'">Yape/Plin</button>
            <button :class="{ activo: metodoPago === 'TARJETA' }" @click="metodoPago = 'TARJETA'">Tarjeta</button>
          </div>

          <div v-if="metodoPago === 'EFECTIVO'" class="pos__efectivo">
            <label>Recibido
              <div class="pos__recibido">
                <input v-model.number="montoRecibido" type="number" min="0" step="0.10" placeholder="0.00" />
                <button class="pos__exacto" @click="montoExacto">Exacto</button>
              </div>
            </label>
            <div class="pos__vuelto">
              <span>Vuelto</span>
              <strong>{{ moneda(vuelto) }}</strong>
            </div>
          </div>
        </div>

        <div class="pos__totales">
          <div class="pos__total-fila">
            <span>{{ cantidadItems }} ítem(s)</span>
          </div>
          <div class="pos__total-grande">
            <span>TOTAL</span>
            <strong>{{ moneda(total) }}</strong>
          </div>
        </div>

        <BaseButton
          class="pos__cobrar"
          bloque
          :cargando="emitiendo"
          @click="cobrar"
        >
          Cobrar (F9)
        </BaseButton>
      </aside>
    </div>

    <!-- Panel de éxito -->
    <div v-if="resultado" class="pos__exito-bg" @click.self="nuevaVenta">
      <div class="pos__exito">
        <div class="pos__exito-check">✓</div>
        <h2>Comprobante {{ resultado.comprobante }}</h2>
        <p>emitido correctamente</p>
        <div class="pos__exito-acciones">
          <BaseButton variant="secondary" @click="verTicket">Ver ticket</BaseButton>
          <BaseButton @click="nuevaVenta">Nueva venta (Esc)</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pos { display: flex; flex-direction: column; gap: 1rem; height: calc(100vh - 90px); }
.pos__top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; }
.pos__titulo { display: flex; align-items: center; gap: .5rem; }
.pos__titulo h1 { font-size: 1.3rem; margin: 0; }
.pos__top-derecha { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.pos__almacen { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: #475569; }
.pos__almacen select { padding: .35rem .5rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.pos__atajos { display: inline-flex; align-items: center; gap: .35rem; font-size: .75rem; color: #64748b; background: #f1f5f9; padding: .3rem .6rem; border-radius: 8px; }
.pos__caja { display: inline-flex; align-items: center; gap: .35rem; font-size: .82rem; font-weight: 600; padding: .4rem .7rem; border-radius: 8px; cursor: pointer; border: 1px solid transparent; }
.pos__caja--cerrada { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.pos__caja--abierta { background: #dcfce7; color: #16a34a; border-color: #bbf7d0; }
.pos__caja-modal { background: #fff; border-radius: 16px; padding: 1.25rem 1.5rem; width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: .7rem; }
.pos__caja-head { display: flex; align-items: center; justify-content: space-between; }
.pos__caja-head h2 { margin: 0; font-size: 1.15rem; }
.pos__caja-head button { background: none; border: none; cursor: pointer; color: #64748b; }
.pos__caja-modal label { font-size: .82rem; color: #475569; display: flex; flex-direction: column; gap: .3rem; }
.pos__caja-modal input, .pos__caja-modal textarea { padding: .6rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; }
.pos__caja-resumen { background: #f8fafc; border-radius: 10px; padding: .7rem .9rem; display: flex; flex-direction: column; gap: .3rem; }
.pos__caja-resumen div { display: flex; justify-content: space-between; font-size: .85rem; color: #64748b; }
.pos__caja-esperado { border-top: 1px dashed #e2e8f0; padding-top: .3rem; }
.pos__caja-esperado strong { color: #0f172a; font-size: 1.05rem; }
.pos__caja-dif { text-align: center; font-weight: 600; padding: .4rem; border-radius: 8px; margin: 0; }
.pos__caja-dif.ok { background: #dcfce7; color: #16a34a; }
.pos__caja-dif.sobra { background: #dbeafe; color: #1d4ed8; }
.pos__caja-dif.falta { background: #fee2e2; color: #b91c1c; }

.pos__grid { display: grid; grid-template-columns: 1fr 340px; gap: 1rem; flex: 1; min-height: 0; }

.pos__izq { display: flex; flex-direction: column; gap: .75rem; min-height: 0; }
.pos__buscar { position: relative; }
.pos__buscar-icono { position: absolute; left: .8rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
.pos__buscar input { width: 100%; padding: .9rem 1rem .9rem 2.6rem; font-size: 1.05rem; border: 2px solid #6366f1; border-radius: 12px; outline: none; }
.pos__resultados { position: absolute; z-index: 20; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.12); list-style: none; margin: 0; padding: .3rem; max-height: 320px; overflow-y: auto; }
.pos__resultados li { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .6rem .7rem; border-radius: 8px; cursor: pointer; }
.pos__resultados li:hover { background: #eef2ff; }
.pos__res-nombre { font-weight: 500; }
.pos__res-meta { display: flex; align-items: center; gap: .8rem; font-size: .8rem; color: #64748b; }
.pos__res-cod { background: #f1f5f9; padding: .1rem .4rem; border-radius: 5px; font-family: monospace; }

.pos__carrito { flex: 1; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; }
.pos__vacio { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .6rem; color: #cbd5e1; }
.pos__tabla { width: 100%; border-collapse: collapse; }
.pos__tabla thead th { position: sticky; top: 0; background: #f8fafc; text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; padding: .6rem .8rem; }
.pos__tabla th.c, .pos__tabla td.c { text-align: center; }
.pos__tabla th.d, .pos__tabla td.d { text-align: right; }
.pos__tabla td { padding: .6rem .8rem; border-top: 1px solid #f1f5f9; }
.pos__prod { font-weight: 500; }
.pos__prod-sub { font-size: .72rem; color: #94a3b8; }
.pos__cant { display: inline-flex; align-items: center; gap: .25rem; }
.pos__cant button { width: 26px; height: 26px; display: grid; place-items: center; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; cursor: pointer; }
.pos__cant input { width: 48px; text-align: center; padding: .3rem; border: 1px solid #cbd5e1; border-radius: 6px; }
.pos__quitar { color: #ef4444; background: none; border: none; cursor: pointer; }

.pos__der { display: flex; flex-direction: column; gap: .75rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; overflow-y: auto; }
.pos__der h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; margin: 0 0 .5rem; }
.pos__cliente input { width: 100%; padding: .55rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: .5rem; }
.pos__doc { position: relative; }
.pos__doc-cargando { position: absolute; right: .6rem; top: .55rem; font-size: .72rem; color: #6366f1; }
.pos__comprobante { font-size: .8rem; color: #6366f1; font-weight: 600; }

.pos__metodos { display: grid; grid-template-columns: repeat(3, 1fr); gap: .4rem; }
.pos__metodos button { padding: .5rem; border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; cursor: pointer; font-size: .82rem; }
.pos__metodos button.activo { border-color: #6366f1; background: #eef2ff; color: #4338ca; font-weight: 600; }
.pos__efectivo { margin-top: .6rem; }
.pos__efectivo label { font-size: .8rem; color: #475569; }
.pos__recibido { display: flex; gap: .4rem; margin-top: .25rem; }
.pos__recibido input { flex: 1; padding: .55rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.pos__exacto { padding: 0 .8rem; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; cursor: pointer; font-size: .8rem; }
.pos__vuelto { display: flex; justify-content: space-between; margin-top: .5rem; font-size: .9rem; }
.pos__vuelto strong { color: #16a34a; }

.pos__totales { margin-top: auto; border-top: 2px dashed #e2e8f0; padding-top: .6rem; }
.pos__total-fila { font-size: .8rem; color: #94a3b8; }
.pos__total-grande { display: flex; justify-content: space-between; align-items: baseline; }
.pos__total-grande span { font-size: .9rem; color: #475569; }
.pos__total-grande strong { font-size: 1.8rem; color: #0f172a; }
.pos__cobrar { font-size: 1.05rem; padding: .9rem; }

.pos__exito-bg { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: grid; place-items: center; z-index: 50; }
.pos__exito { background: #fff; border-radius: 16px; padding: 2rem 2.5rem; text-align: center; max-width: 360px; }
.pos__exito-check { width: 64px; height: 64px; margin: 0 auto 1rem; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 2rem; display: grid; place-items: center; }
.pos__exito h2 { margin: 0; font-size: 1.2rem; }
.pos__exito p { color: #64748b; margin: .25rem 0 1.2rem; }
.pos__exito-acciones { display: flex; gap: .6rem; justify-content: center; }

@media (max-width: 860px) {
  .pos__grid { grid-template-columns: 1fr; }
  .pos { height: auto; }
}
</style>
