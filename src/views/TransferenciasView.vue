<!-- src/views/TransferenciasView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Trash2, ArrowRight, X, Eye } from 'lucide-vue-next';
import {
  transferenciasService,
  type TransferenciaLista,
  type TransferenciaDetalleCompleta,
} from '../services/transferencias.service';
import { almacenesService, type Almacen } from '../services/almacenes.service';
import { productosService, type Producto } from '../services/productos.service';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';

const toast = useToast();

const transferencias = ref<TransferenciaLista[]>([]);
const almacenes = ref<Almacen[]>([]);
const productos = ref<Producto[]>([]);
const cargando = ref(true);

// Modal crear
const modalCrear = ref(false);
const origenId = ref('');
const destinoId = ref('');
const observaciones = ref('');
const productoSel = ref('');
const carrito = ref<{ producto: Producto; cantidad: number }[]>([]);
const guardando = ref(false);

// Modal detalle
const detalle = ref<TransferenciaDetalleCompleta | null>(null);

const opcionesAlmacenes = computed(() =>
  almacenes.value.map((a) => ({ valor: a.id, texto: a.es_principal ? `${a.nombre} ★` : a.nombre })),
);
const opcionesProductos = computed(() =>
  productos.value.map((p) => ({ valor: p.id, texto: p.nombre })),
);

async function cargar() {
  cargando.value = true;
  try {
    transferencias.value = await transferenciasService.listar();
  } catch {
    toast.error('Error al cargar transferencias');
  } finally {
    cargando.value = false;
  }
}

function abrirCrear() {
  origenId.value = '';
  destinoId.value = '';
  observaciones.value = '';
  productoSel.value = '';
  carrito.value = [];
  modalCrear.value = true;
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
  if (!origenId.value || !destinoId.value) {
    toast.advertencia('Selecciona almacén de origen y destino');
    return;
  }
  if (origenId.value === destinoId.value) {
    toast.advertencia('El origen y el destino deben ser distintos');
    return;
  }
  if (carrito.value.length === 0) {
    toast.advertencia('Agrega al menos un producto');
    return;
  }
  guardando.value = true;
  try {
    await transferenciasService.crear({
      almacen_origen_id: origenId.value,
      almacen_destino_id: destinoId.value,
      observaciones: observaciones.value.trim() || undefined,
      detalles: carrito.value.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
    });
    toast.exito('Transferencia realizada');
    modalCrear.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al realizar la transferencia');
  } finally {
    guardando.value = false;
  }
}

async function verDetalle(id: string) {
  try {
    detalle.value = await transferenciasService.obtener(id);
  } catch {
    toast.error('No se pudo cargar la transferencia');
  }
}

const fechaFmt = (f: string) => (f ? new Date(f).toLocaleString('es-PE') : '—');

onMounted(async () => {
  almacenes.value = await almacenesService.listar();
  productos.value = await productosService.listar();
  await cargar();
});
</script>

<template>
  <div>
    <div class="tra__top">
      <h1>Transferencias entre almacenes</h1>
      <BaseButton @click="abrirCrear"><Plus :size="18" /> Nueva transferencia</BaseButton>
    </div>

    <div class="tra__tabla-wrap">
      <table class="tra__tabla">
        <thead>
          <tr>
            <th>Código</th><th>Origen → Destino</th><th>Fecha</th><th>Usuario</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando"><td colspan="6" class="tra__vacio">Cargando…</td></tr>
          <tr v-else-if="transferencias.length === 0"><td colspan="6" class="tra__vacio">Sin transferencias</td></tr>
          <tr v-for="t in transferencias" :key="t.id">
            <td><strong>{{ t.codigo }}</strong></td>
            <td>
              <span class="tra__ruta">
                {{ t.almacen_origen }} <ArrowRight :size="14" /> {{ t.almacen_destino }}
              </span>
            </td>
            <td>{{ fechaFmt(t.fecha) }}</td>
            <td>{{ t.usuario_email || '—' }}</td>
            <td><span class="badge b-verde">{{ t.estado }}</span></td>
            <td class="d">
              <button class="tra__link" @click="verDetalle(t.id)"><Eye :size="16" /> Ver</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal crear -->
    <div v-if="modalCrear" class="tra__modal-bg" @click.self="modalCrear = false">
      <div class="tra__modal">
        <div class="tra__modal-head">
          <h2>Nueva transferencia</h2>
          <button @click="modalCrear = false"><X :size="20" /></button>
        </div>
        <div class="tra__form">
          <div class="tra__grid2">
            <BaseSelect v-model="origenId" label="Desde (origen)" :opciones="opcionesAlmacenes" placeholder="Almacén origen" />
            <BaseSelect v-model="destinoId" label="Hacia (destino)" :opciones="opcionesAlmacenes" placeholder="Almacén destino" />
          </div>

          <div class="tra__agregar">
            <BaseSelect v-model="productoSel" :opciones="opcionesProductos" placeholder="Selecciona un producto" />
            <BaseButton @click="agregarProducto"><Plus :size="18" /></BaseButton>
          </div>

          <table v-if="carrito.length" class="tra__items">
            <tr v-for="(item, i) in carrito" :key="item.producto.id">
              <td>{{ item.producto.nombre }}</td>
              <td class="c"><input v-model.number="item.cantidad" type="number" min="1" class="tra__cant" /></td>
              <td class="c"><button class="tra__quitar" @click="quitar(i)"><Trash2 :size="15" /></button></td>
            </tr>
          </table>
          <p v-else class="tra__hint">Agrega los productos a transferir.</p>

          <textarea v-model="observaciones" placeholder="Observaciones (opcional)" rows="2"></textarea>
        </div>
        <div class="tra__modal-foot">
          <BaseButton variant="secondary" @click="modalCrear = false">Cancelar</BaseButton>
          <BaseButton :cargando="guardando" @click="guardar">Transferir</BaseButton>
        </div>
      </div>
    </div>

    <!-- Modal detalle -->
    <div v-if="detalle" class="tra__modal-bg" @click.self="detalle = null">
      <div class="tra__modal">
        <div class="tra__modal-head">
          <h2>{{ detalle.codigo }}</h2>
          <button @click="detalle = null"><X :size="20" /></button>
        </div>
        <div class="tra__form">
          <p class="tra__ruta-big">
            {{ detalle.almacen_origen_nombre }} <ArrowRight :size="18" /> {{ detalle.almacen_destino_nombre }}
          </p>
          <p class="tra__sub">{{ fechaFmt(detalle.fecha) }} · {{ detalle.usuario_email || '—' }}</p>
          <table class="tra__items">
            <tr v-for="d in detalle.detalles" :key="d.producto_id">
              <td>{{ d.producto_nombre }}</td>
              <td class="c">{{ Number(d.cantidad) }}</td>
            </tr>
          </table>
          <p v-if="detalle.observaciones" class="tra__sub">{{ detalle.observaciones }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tra__top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
.tra__top h1 { margin: 0; font-size: 1.4rem; }
.tra__tabla-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
.tra__tabla { width: 100%; border-collapse: collapse; }
.tra__tabla th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; padding: .7rem .9rem; background: #f8fafc; white-space: nowrap; }
.tra__tabla td { padding: .7rem .9rem; border-top: 1px solid #f1f5f9; }
.tra__tabla td.d { text-align: right; }
.tra__vacio { text-align: center; color: #94a3b8; padding: 2rem; }
.tra__ruta { display: inline-flex; align-items: center; gap: .4rem; }
.tra__ruta-big { display: inline-flex; align-items: center; gap: .6rem; font-size: 1.05rem; font-weight: 600; }
.tra__link { background: none; border: none; color: #6366f1; cursor: pointer; display: inline-flex; align-items: center; gap: .25rem; font-size: .82rem; }
.badge { padding: .15rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 600; }
.b-verde { background: #dcfce7; color: #16a34a; }

.tra__modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: grid; place-items: center; z-index: 50; padding: 1rem; }
.tra__modal { background: #fff; border-radius: 16px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
.tra__modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; }
.tra__modal-head h2 { margin: 0; font-size: 1.1rem; }
.tra__modal-head button { background: none; border: none; cursor: pointer; color: #64748b; }
.tra__form { padding: 1.25rem; display: flex; flex-direction: column; gap: .7rem; }
.tra__grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
.tra__agregar { display: flex; gap: .5rem; align-items: center; }
.tra__agregar > :first-child { flex: 1; }
.tra__items { width: 100%; border-collapse: collapse; }
.tra__items td { padding: .4rem .3rem; border-top: 1px solid #f1f5f9; }
.tra__items td.c { text-align: center; }
.tra__cant { width: 64px; text-align: center; padding: .3rem; border: 1px solid #cbd5e1; border-radius: 6px; }
.tra__quitar { color: #ef4444; background: none; border: none; cursor: pointer; }
.tra__hint { color: #94a3b8; font-size: .85rem; }
.tra__form textarea { width: 100%; padding: .55rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.tra__sub { font-size: .82rem; color: #64748b; }
.tra__modal-foot { display: flex; justify-content: flex-end; gap: .6rem; padding: 1rem 1.25rem; border-top: 1px solid #f1f5f9; }
</style>
