<!-- src/views/ComprasView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Trash2 } from 'lucide-vue-next';
import { comprasService, type CompraLista } from '../services/compras.service';
import { proveedoresService, type Proveedor } from '../services/proveedores.service';
import { productosService, type Producto } from '../services/productos.service';
import { useFormato } from '../composables/useFormato';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseModal from '../components/ui/BaseModal.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import { useAuthStore } from '../stores/auth.store';


const toast = useToast();
const { confirmar } = useConfirm();

const { moneda, fecha } = useFormato();
const auth = useAuthStore();

const compras = ref<CompraLista[]>([]);
const proveedores = ref<Proveedor[]>([]);
const productos = ref<Producto[]>([]);
const cargando = ref(true);
const modalAbierto = ref(false);
const guardando = ref(false);
const error = ref('');

const columnas = [
  { clave: 'documento', titulo: 'Documento' },
  { clave: 'proveedor', titulo: 'Proveedor' },
  { clave: 'fecha_compra', titulo: 'Fecha' },
  { clave: 'importe_total', titulo: 'Total', alineacion: 'right' as const },
  { clave: 'estado', titulo: 'Estado', alineacion: 'center' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

// Formulario de compra
const form = ref({
  proveedor_id: '',
  tipo_documento: '01',
  serie_documento: '',
  numero_documento: '',
  fecha_compra: new Date().toISOString().split('T')[0],
  condicion_pago: 'CONTADO',
  dias_credito: 30,
});
const carrito = ref<{ producto: Producto; cantidad: number; costo: number }[]>([]);
const productoSel = ref('');

const opcionesProveedores = computed(() =>
  proveedores.value.map((p) => ({ valor: p.id, texto: `${p.razon_social} (${p.ruc})` })),
);
const opcionesProductos = computed(() =>
  productos.value.map((p) => ({ valor: p.id, texto: p.nombre })),
);
const totalCompra = computed(() =>
  carrito.value.reduce((s, i) => s + i.costo * i.cantidad, 0),
);
const condicionesPago = [
  { valor: 'CONTADO', texto: 'Contado' },
  { valor: 'CREDITO', texto: 'Crédito' },
];

async function cargar() {
  cargando.value = true;
  try {
    compras.value = await comprasService.listar();
  } finally {
    cargando.value = false;
  }
}

async function abrirModal() {
  form.value = {
    proveedor_id: '', tipo_documento: '01', serie_documento: '', numero_documento: '',
    fecha_compra: new Date().toISOString().split('T')[0], condicion_pago: 'CONTADO', dias_credito: 30,
  };
  carrito.value = [];
  error.value = '';
  if (proveedores.value.length === 0) proveedores.value = await proveedoresService.listar();
  if (productos.value.length === 0) productos.value = await productosService.listar();
  modalAbierto.value = true;
}

function agregarProducto() {
  if (!productoSel.value) return;
  const prod = productos.value.find((p) => p.id === productoSel.value);
  if (!prod) return;
  carrito.value.push({ producto: prod, cantidad: 1, costo: 0 });
  productoSel.value = '';
}

function quitar(i: number) { carrito.value.splice(i, 1); }

async function guardar() {
  if (!form.value.proveedor_id) { toast.advertencia('Selecciona un proveedor'); return; }
  if (!form.value.serie_documento || !form.value.numero_documento) { toast.advertencia('Ingresa la serie y número del documento'); return; }
  if (carrito.value.length === 0) { toast.advertencia('Agrega al menos un producto'); return; }
  if (carrito.value.some((i) => i.costo <= 0)) { toast.advertencia('Ingresa el costo de cada producto'); return; }

  guardando.value = true;
  try {
    await comprasService.registrar({
      ...form.value,
      dias_credito: form.value.condicion_pago === 'CREDITO' ? form.value.dias_credito : 0,
      detalles: carrito.value.map((i) => ({
        producto_id: i.producto.id, cantidad: i.cantidad, costo_unitario: i.costo,
      })),
    });
    modalAbierto.value = false;
    toast.exito('Compra registrada y stock actualizado');
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al registrar la compra');
  } finally {
    guardando.value = false;
  }
}

async function anularCompra(compra: any) {
  if (compra.estado === 'ANULADA') {
    toast.info('Esta compra ya está anulada');
    return;
  }
  const ok = await confirmar({
    titulo: '¿Anular compra?',
    mensaje: `Se revertirá el stock y las finanzas de la compra ${compra.documento}. Esta acción no se puede deshacer.`,
    textoConfirmar: 'Anular',
    peligro: true,
  });
  if (!ok) return;
  try {
    await comprasService.anular(compra.id);
    toast.exito('Compra anulada correctamente');
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo anular la compra');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1>Compras</h1>
        <p class="pagina-subtitulo">Registro de compras a proveedores</p>
      </div>
      <BaseButton 
  v-if="auth.tienePermiso('crear_compras')"
  @click="abrirModal"
>
  <Plus :size="18" /> Nueva compra
</BaseButton>
    </div>

    <BaseTable :columnas="columnas" :filas="compras" :cargando="cargando" texto-vacio="No has registrado compras aún.">
      <template #fecha_compra="{ valor }">{{ fecha(valor) }}</template>
      <template #importe_total="{ valor }"><strong>{{ moneda(valor) }}</strong></template>
      <!-- El estado y acciones van DENTRO de la tabla -->
      <template #estado="{ valor }">
        <span class="badge" :class="valor === 'ANULADA' ? 'badge--error' : 'badge--ok'">{{ valor }}</span>
      </template>
      <template #acciones="{ fila }">
  <button
    v-if="fila.estado !== 'ANULADA' && auth.tienePermiso('crear_compras')"
    class="btn-icono btn-icono--danger"
    @click="anularCompra(fila)"
    title="Anular compra"
  >
    <Trash2 :size="18" />
  </button>
</template>
    </BaseTable>

    <!-- Modal registrar compra -->
    <BaseModal v-model="modalAbierto" titulo="Registrar compra">
      <div class="form">
        <BaseSelect v-model="form.proveedor_id" label="Proveedor" :opciones="opcionesProveedores" placeholder="Selecciona proveedor" />
        <div class="form__fila3">
          <BaseInput v-model="form.serie_documento" label="Serie" placeholder="F001" />
          <BaseInput v-model="form.numero_documento" label="Número" placeholder="123" />
          <BaseInput v-model="form.fecha_compra" label="Fecha" tipo="date" />
        </div>
        <BaseSelect v-model="form.condicion_pago" label="Condición de pago" :opciones="condicionesPago" />

        <!-- Productos -->
        <div class="agregar">
          <BaseSelect v-model="productoSel" :opciones="opcionesProductos" placeholder="Agregar producto" />
          <BaseButton @click="agregarProducto"><Plus :size="18" /></BaseButton>
        </div>

        <div v-if="carrito.length > 0" class="carrito">
          <div v-for="(item, i) in carrito" :key="i" class="carrito__item">
            <span class="carrito__nombre">{{ item.producto.nombre }}</span>
            <input v-model.number="item.cantidad" type="number" min="1" class="carrito__input" placeholder="Cant." />
            <input v-model.number="item.costo" type="number" min="0" step="0.01" class="carrito__input" placeholder="Costo" />
            <button class="carrito__quitar" @click="quitar(i)"><Trash2 :size="16" /></button>
          </div>
          <div class="carrito__total">Total: {{ moneda(totalCompra) }}</div>
        </div>

        <p v-if="error" class="form__error">{{ error }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="modalAbierto = false">Cancelar</BaseButton>
        <BaseButton :cargando="guardando" @click="guardar">Registrar compra</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.pagina-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-lg); }
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; }
.badge { font-size: var(--text-xs); font-weight: 600; padding: 4px 10px; border-radius: var(--radius-sm); }
.badge--ok { background: var(--success-soft); color: var(--success); }
.form { display: flex; flex-direction: column; gap: var(--space-md); }
.form__fila3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md); }
.form__error { background: var(--danger-soft); color: var(--danger); padding: var(--space-sm) var(--space-md); border-radius: var(--radius-sm); font-size: var(--text-sm); }
.agregar { display: grid; grid-template-columns: 1fr auto; gap: var(--space-sm); align-items: end; }
.carrito { display: flex; flex-direction: column; gap: var(--space-sm); }
.carrito__item { display: grid; grid-template-columns: 1fr 70px 90px 32px; gap: var(--space-sm); align-items: center; padding: var(--space-sm); background: var(--bg-surface-2); border-radius: var(--radius-md); }
.carrito__nombre { font-size: var(--text-sm); }
.carrito__input { width: 100%; padding: 6px; text-align: center; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.carrito__quitar { background: none; border: none; color: var(--danger); display: flex; padding: 4px; }
.carrito__total { text-align: right; font-weight: 700; padding-top: var(--space-sm); border-top: 1px solid var(--border); }
.badge--error { background: var(--danger-soft); color: var(--danger); }
.btn-icono { background: none; border: none; color: var(--accent); padding: 6px; border-radius: var(--radius-sm); display: inline-flex; }
.btn-icono--danger { color: var(--danger); }
.btn-icono--danger:hover { background: var(--danger-soft); }
</style>