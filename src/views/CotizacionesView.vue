<!-- src/views/CotizacionesView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Trash2, FileText, ArrowRightCircle, X, Printer, Pencil } from 'lucide-vue-next';
import {
  cotizacionesService,
  type CotizacionLista,
  type CotizacionDetalleCompleta,
} from '../services/cotizaciones.service';
import { productosService, type Producto } from '../services/productos.service';
import { sunatService } from '../services/sunat.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';

const { moneda } = useFormato();
const toast = useToast();

const cotizaciones = ref<CotizacionLista[]>([]);
const productos = ref<Producto[]>([]);
const cargando = ref(true);
const filtroEstado = ref('');

// Modal crear / editar
const modalCrear = ref(false);
const editandoId = ref<string | null>(null);
const docCliente = ref('');
const nombreCliente = ref('');
const consultandoDoc = ref(false);
const fechaValidez = ref('');
const observaciones = ref('');
const productoSel = ref('');
const carrito = ref<{ producto: Producto; cantidad: number }[]>([]);
const guardando = ref(false);

// Modal detalle
const detalle = ref<CotizacionDetalleCompleta | null>(null);
const convirtiendo = ref(false);

const estadosFiltro = [
  { valor: '', texto: 'Todas' },
  { valor: 'PENDIENTE', texto: 'Pendientes' },
  { valor: 'ACEPTADA', texto: 'Aceptadas' },
  { valor: 'RECHAZADA', texto: 'Rechazadas' },
  { valor: 'CONVERTIDA', texto: 'Convertidas' },
  { valor: 'ANULADA', texto: 'Anuladas' },
];

const opcionesProductos = computed(() =>
  productos.value.map((p) => ({ valor: p.id, texto: `${p.nombre} - ${moneda(Number(p.precio_venta))}` })),
);

const totalCarrito = computed(() =>
  carrito.value.reduce((s, i) => s + Number(i.producto.precio_venta) * i.cantidad, 0),
);

function badgeClase(estado: string) {
  return {
    PENDIENTE: 'b-amarillo',
    ACEPTADA: 'b-azul',
    CONVERTIDA: 'b-verde',
    RECHAZADA: 'b-rojo',
    ANULADA: 'b-gris',
  }[estado] || 'b-gris';
}

async function cargar() {
  cargando.value = true;
  try {
    cotizaciones.value = await cotizacionesService.listar(filtroEstado.value || undefined);
  } catch {
    toast.error('Error al cargar cotizaciones');
  } finally {
    cargando.value = false;
  }
}

// ---------- Crear / Editar ----------
function abrirCrear() {
  editandoId.value = null;
  docCliente.value = '';
  nombreCliente.value = '';
  fechaValidez.value = '';
  observaciones.value = '';
  productoSel.value = '';
  carrito.value = [];
  modalCrear.value = true;
}

async function abrirEditar(id: string) {
  try {
    const c = await cotizacionesService.obtener(id);
    editandoId.value = c.id;
    docCliente.value = c.cliente_numero_documento === '00000000' ? '' : c.cliente_numero_documento;
    nombreCliente.value = c.cliente_razon_social;
    fechaValidez.value = c.fecha_validez || '';
    observaciones.value = c.observaciones || '';
    productoSel.value = '';
    // Reconstruir el carrito con los productos actuales
    carrito.value = [];
    for (const d of c.detalles) {
      const prod = productos.value.find((p) => p.id === d.producto_id);
      if (prod) carrito.value.push({ producto: prod, cantidad: Number(d.cantidad) });
    }
    detalle.value = null;
    modalCrear.value = true;
  } catch {
    toast.error('No se pudo cargar la cotización para editar');
  }
}

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

function agregarProducto() {
  const p = productos.value.find((x) => x.id === productoSel.value);
  if (!p) return;
  const existe = carrito.value.find((i) => i.producto.id === p.id);
  if (existe) existe.cantidad += 1;
  else carrito.value.push({ producto: p, cantidad: 1 });
  productoSel.value = '';
}

function quitar(index: number) {
  carrito.value.splice(index, 1);
}

async function guardar() {
  if (carrito.value.length === 0) {
    toast.advertencia('Agrega al menos un producto');
    return;
  }
  const payload = {
    cliente_numero_documento: docCliente.value.trim() || '00000000',
    cliente_razon_social: nombreCliente.value.trim() || 'CLIENTE VARIOS',
    fecha_validez: fechaValidez.value || undefined,
    observaciones: observaciones.value.trim() || undefined,
    detalles: carrito.value.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
  };
  guardando.value = true;
  try {
    if (editandoId.value) {
      await cotizacionesService.actualizar(editandoId.value, payload);
      toast.exito('Cotización actualizada');
    } else {
      await cotizacionesService.crear(payload);
      toast.exito('Cotización creada');
    }
    modalCrear.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al guardar la cotización');
  } finally {
    guardando.value = false;
  }
}

// ---------- Detalle / acciones ----------
async function verDetalle(id: string) {
  try {
    detalle.value = await cotizacionesService.obtener(id);
  } catch {
    toast.error('No se pudo cargar la cotización');
  }
}

async function verPdf(id: string) {
  try {
    const url = await cotizacionesService.obtenerPdf(id);
    window.open(url, '_blank');
  } catch {
    toast.error('No se pudo abrir el PDF');
  }
}

async function convertir(id: string) {
  if (!confirm('¿Convertir esta cotización en una venta? Se emitirá el comprobante a SUNAT.')) return;
  convirtiendo.value = true;
  try {
    const res = await cotizacionesService.convertir(id);
    toast.exito(`Convertida en ${res.comprobante || 'venta'}`);
    detalle.value = null;
    await cargar();
  } catch (e: any) {
    const err = e.response?.data?.message;
    toast.error(err?.sunat_descripcion || err?.mensaje || err || 'Error al convertir');
  } finally {
    convirtiendo.value = false;
  }
}

async function marcar(id: string, estado: string) {
  try {
    await cotizacionesService.cambiarEstado(id, estado);
    toast.exito(`Cotización ${estado.toLowerCase()}`);
    detalle.value = null;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error');
  }
}

onMounted(async () => {
  productos.value = await productosService.listar();
  await cargar();
});
</script>

<template>
  <div>
    <div class="cot__top">
      <h1>Cotizaciones</h1>
      <div class="cot__acciones">
        <BaseSelect v-model="filtroEstado" :opciones="estadosFiltro" @update:model-value="cargar" />
        <BaseButton @click="abrirCrear"><Plus :size="18" /> Nueva cotización</BaseButton>
      </div>
    </div>

    <div class="cot__tabla-wrap">
      <table class="cot__tabla">
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Emisión</th>
            <th>Validez</th>
            <th>Estado</th>
            <th class="d">Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando"><td colspan="7" class="cot__vacio">Cargando…</td></tr>
          <tr v-else-if="cotizaciones.length === 0"><td colspan="7" class="cot__vacio">Sin cotizaciones</td></tr>
          <tr v-for="c in cotizaciones" :key="c.id">
            <td><strong>{{ c.codigo }}</strong></td>
            <td>{{ c.cliente }}</td>
            <td>{{ c.fecha_emision }}</td>
            <td>{{ c.fecha_validez || '—' }}</td>
            <td><span class="badge" :class="badgeClase(c.estado)">{{ c.estado }}</span></td>
            <td class="d">{{ moneda(c.importe_total) }}</td>
            <td class="d">
              <button class="cot__link" @click="verDetalle(c.id)"><FileText :size="16" /> Ver</button>
              <button class="cot__link" @click="verPdf(c.id)"><Printer :size="16" /> PDF</button>
              <button v-if="c.estado === 'PENDIENTE'" class="cot__link" @click="abrirEditar(c.id)">
                <Pencil :size="16" /> Editar
              </button>
              <button
                v-if="c.estado !== 'CONVERTIDA' && c.estado !== 'ANULADA' && c.estado !== 'RECHAZADA'"
                class="cot__link cot__link--verde"
                @click="convertir(c.id)"
              >
                <ArrowRightCircle :size="16" /> Convertir
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal crear -->
    <div v-if="modalCrear" class="cot__modal-bg" @click.self="modalCrear = false">
      <div class="cot__modal">
        <div class="cot__modal-head">
          <h2>{{ editandoId ? 'Editar cotización' : 'Nueva cotización' }}</h2>
          <button @click="modalCrear = false"><X :size="20" /></button>
        </div>

        <div class="cot__form">
          <div class="cot__doc">
            <input
              v-model="docCliente"
              placeholder="DNI / RUC (opcional → Cliente varios)"
              maxlength="15"
              @blur="consultarDocumento"
              @keydown.enter.prevent="consultarDocumento"
            />
            <span v-if="consultandoDoc" class="cot__cargando">Consultando…</span>
          </div>
          <input v-model="nombreCliente" placeholder="Nombre / Razón social" />

          <div class="cot__agregar">
            <BaseSelect v-model="productoSel" :opciones="opcionesProductos" placeholder="Selecciona un producto" />
            <BaseButton @click="agregarProducto"><Plus :size="18" /></BaseButton>
          </div>

          <table v-if="carrito.length" class="cot__items">
            <tr v-for="(item, i) in carrito" :key="item.producto.id">
              <td>{{ item.producto.nombre }}</td>
              <td class="c">
                <input v-model.number="item.cantidad" type="number" min="1" class="cot__cant" />
              </td>
              <td class="d">{{ moneda(Number(item.producto.precio_venta) * item.cantidad) }}</td>
              <td class="c"><button class="cot__quitar" @click="quitar(i)"><Trash2 :size="15" /></button></td>
            </tr>
          </table>

          <div class="cot__grid2">
            <label>Válida hasta
              <input v-model="fechaValidez" type="date" />
            </label>
          </div>
          <textarea v-model="observaciones" placeholder="Observaciones (opcional)" rows="2"></textarea>

          <div class="cot__total-form">
            <span>Total</span>
            <strong>{{ moneda(totalCarrito) }}</strong>
          </div>
        </div>

        <div class="cot__modal-foot">
          <BaseButton variant="secondary" @click="modalCrear = false">Cancelar</BaseButton>
          <BaseButton :cargando="guardando" @click="guardar">Guardar cotización</BaseButton>
        </div>
      </div>
    </div>

    <!-- Modal detalle -->
    <div v-if="detalle" class="cot__modal-bg" @click.self="detalle = null">
      <div class="cot__modal">
        <div class="cot__modal-head">
          <h2>{{ detalle.codigo }} <span class="badge" :class="badgeClase(detalle.estado)">{{ detalle.estado }}</span></h2>
          <button @click="detalle = null"><X :size="20" /></button>
        </div>
        <div class="cot__form">
          <p><strong>{{ detalle.cliente_razon_social }}</strong> · {{ detalle.cliente_numero_documento }}</p>
          <p class="cot__sub">Emitida {{ detalle.fecha_emision }} · Válida hasta {{ detalle.fecha_validez || '—' }}</p>
          <table class="cot__items">
            <tr v-for="d in detalle.detalles" :key="d.producto_id">
              <td>{{ d.producto_nombre }}</td>
              <td class="c">{{ Number(d.cantidad) }}</td>
              <td class="d">{{ moneda(Number(d.subtotal)) }}</td>
            </tr>
          </table>
          <div class="cot__total-form">
            <span>Total</span>
            <strong>{{ moneda(Number(detalle.importe_total)) }}</strong>
          </div>
          <p v-if="detalle.observaciones" class="cot__sub">{{ detalle.observaciones }}</p>
        </div>
        <div class="cot__modal-foot">
          <BaseButton variant="secondary" @click="verPdf(detalle.id)">
            <Printer :size="16" /> PDF
          </BaseButton>
          <BaseButton v-if="detalle.estado === 'PENDIENTE'" variant="secondary" @click="abrirEditar(detalle.id)">
            <Pencil :size="16" /> Editar
          </BaseButton>
          <template v-if="detalle.estado !== 'CONVERTIDA' && detalle.estado !== 'ANULADA' && detalle.estado !== 'RECHAZADA'">
            <BaseButton variant="secondary" @click="marcar(detalle.id, 'RECHAZADA')">Rechazar</BaseButton>
            <BaseButton :cargando="convirtiendo" @click="convertir(detalle.id)">Convertir en venta</BaseButton>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cot__top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
.cot__top h1 { margin: 0; font-size: 1.4rem; }
.cot__acciones { display: flex; align-items: center; gap: .6rem; }
.cot__tabla-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
.cot__tabla { width: 100%; border-collapse: collapse; }
.cot__tabla th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; padding: .7rem .9rem; background: #f8fafc; }
.cot__tabla th.d, .cot__tabla td.d { text-align: right; }
.cot__tabla td { padding: .7rem .9rem; border-top: 1px solid #f1f5f9; }
.cot__vacio { text-align: center; color: #94a3b8; padding: 2rem; }
.cot__link { background: none; border: none; color: #6366f1; cursor: pointer; display: inline-flex; align-items: center; gap: .25rem; font-size: .82rem; margin-left: .6rem; }
.cot__link--verde { color: #16a34a; }

.badge { padding: .15rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 600; }
.b-amarillo { background: #fef9c3; color: #a16207; }
.b-azul { background: #dbeafe; color: #1d4ed8; }
.b-verde { background: #dcfce7; color: #16a34a; }
.b-rojo { background: #fee2e2; color: #b91c1c; }
.b-gris { background: #f1f5f9; color: #64748b; }

.cot__modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: grid; place-items: center; z-index: 50; padding: 1rem; }
.cot__modal { background: #fff; border-radius: 16px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; }
.cot__modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; }
.cot__modal-head h2 { margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: .5rem; }
.cot__modal-head button { background: none; border: none; cursor: pointer; color: #64748b; }
.cot__form { padding: 1.25rem; display: flex; flex-direction: column; gap: .6rem; }
.cot__form input, .cot__form textarea { width: 100%; padding: .55rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.cot__doc { position: relative; }
.cot__cargando { position: absolute; right: .6rem; top: .55rem; font-size: .72rem; color: #6366f1; }
.cot__agregar { display: flex; gap: .5rem; align-items: center; }
.cot__agregar > :first-child { flex: 1; }
.cot__items { width: 100%; border-collapse: collapse; }
.cot__items td { padding: .4rem .3rem; border-top: 1px solid #f1f5f9; }
.cot__items td.c { text-align: center; } .cot__items td.d { text-align: right; }
.cot__cant { width: 60px; text-align: center; padding: .3rem !important; }
.cot__quitar { color: #ef4444; background: none; border: none; cursor: pointer; }
.cot__grid2 { display: grid; grid-template-columns: 1fr; gap: .5rem; }
.cot__grid2 label { font-size: .8rem; color: #475569; }
.cot__total-form { display: flex; justify-content: space-between; align-items: baseline; border-top: 2px dashed #e2e8f0; padding-top: .6rem; }
.cot__total-form strong { font-size: 1.4rem; }
.cot__sub { font-size: .82rem; color: #64748b; }
.cot__modal-foot { display: flex; justify-content: flex-end; gap: .6rem; padding: 1rem 1.25rem; border-top: 1px solid #f1f5f9; }
</style>
