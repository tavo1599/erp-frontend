<!-- src/views/ProductosView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus, Pencil, History, Trash2, Package, DollarSign, Tag } from 'lucide-vue-next';
import { productosService, type Producto, type CrearProducto } from '../services/productos.service';
import { useFormato } from '../composables/useFormato';
import BaseTable from '../components/ui/BaseTable.vue';
import BaseModal from '../components/ui/BaseModal.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';
import { useToast } from '../composables/useToast';
import { kardexService, type MovimientoKardex } from '../services/kardex.service';
import { useConfirm } from '../composables/useConfirm';

const toast = useToast();
const { confirmar } = useConfirm();
const { moneda, numero, fecha } = useFormato();

// ============== ESTADO ==============
const productos = ref<Producto[]>([]);
const cargando = ref(true);
const buscar = ref('');
const modalAbierto = ref(false);
const guardando = ref(false);
const editandoId = ref<string | null>(null);

// Kardex
const modalKardex = ref(false);
const kardexProducto = ref<MovimientoKardex[]>([]);
const productoKardexNombre = ref('');
const cargandoKardex = ref(false);

// ============== CATÁLOGOS ==============
const tiposBienServicio = [
  { valor: 'BIEN', texto: 'Bien' },
  { valor: 'SERVICIO', texto: 'Servicio' },
];

const tiposIgv = [
  { valor: '10', texto: 'Gravado (IGV 18%)' },
  { valor: '20', texto: 'Exonerado (sin IGV)' },
  { valor: '30', texto: 'Inafecto (sin IGV)' },
];

// ============== COLUMNAS ==============
const columnas = [
  { clave: 'codigo_sunat', titulo: 'Código' },
  { clave: 'nombre', titulo: 'Producto' },
  { clave: 'tipo_bien_servicio', titulo: 'Tipo', alineacion: 'center' as const },
  { clave: 'unidad_medida', titulo: 'Unidad', alineacion: 'center' as const },
  { clave: 'precio_venta', titulo: 'Precio', alineacion: 'right' as const },
  { clave: 'stock_actual', titulo: 'Stock', alineacion: 'right' as const },
  { clave: 'acciones', titulo: '', alineacion: 'center' as const },
];

const columnasKardex = [
  { clave: 'fecha_movimiento', titulo: 'Fecha' },
  { clave: 'tipo_movimiento', titulo: 'Movimiento' },
  { clave: 'cantidad', titulo: 'Cantidad', alineacion: 'center' as const },
  { clave: 'stock_posterior', titulo: 'Stock', alineacion: 'right' as const },
];

// ============== FORMULARIO ==============
const form = ref<CrearProducto>({
  nombre: '',
  codigo_sunat: '',
  unidad_medida: 'NIU',
  precio_venta: 0,
  precio_compra: 0,
  tipo_igv: '10',
  tipo_bien_servicio: 'BIEN',
  stock_actual: 0,
});

// ============== FUNCIONES ==============
async function cargar() {
  cargando.value = true;
  try {
    productos.value = await productosService.listar(buscar.value || undefined);
  } finally {
    cargando.value = false;
  }
}

function abrirModalCrear() {
  editandoId.value = null;
  form.value = {
    nombre: '',
    codigo_sunat: '',
    unidad_medida: 'NIU',
    precio_venta: 0,
    precio_compra: 0,
    tipo_igv: '10',
    tipo_bien_servicio: 'BIEN',
    stock_actual: 0,
  };
  modalAbierto.value = true;
}

function abrirModalEditar(producto: Producto) {
  editandoId.value = producto.id;
  form.value = {
    nombre: producto.nombre,
    codigo_sunat: producto.codigo_sunat,
    unidad_medida: producto.unidad_medida,
    precio_venta: Number(producto.precio_venta),
    precio_compra: Number(producto.precio_compra || 0),
    tipo_igv: producto.tipo_igv,
    tipo_bien_servicio: producto.tipo_bien_servicio || 'BIEN',
  };
  modalAbierto.value = true;
}

async function guardar() {
  if (!form.value.nombre || form.value.precio_venta <= 0) {
    toast.advertencia('El nombre y el precio son obligatorios');
    return;
  }
  guardando.value = true;
  try {
    if (editandoId.value) {
      const { stock_actual, ...datosEditar } = form.value;
      await productosService.actualizar(editandoId.value, datosEditar);
      toast.exito('Producto actualizado correctamente');
    } else {
      await productosService.crear(form.value);
      toast.exito('Producto creado correctamente');
    }
    modalAbierto.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al guardar el producto');
  } finally {
    guardando.value = false;
  }
}

async function desactivarProducto(producto: any) {
  const ok = await confirmar({
    titulo: '¿Desactivar producto?',
    mensaje: `El producto "${producto.nombre}" se desactivará y dejará de aparecer en las listas. Esta acción se puede revertir.`,
    textoConfirmar: 'Desactivar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await productosService.desactivar(producto.id);
    toast.exito('Producto desactivado');
    await cargar();
  } catch {
    toast.error('No se pudo desactivar el producto');
  }
}

// Kardex
async function verKardex(producto: any) {
  productoKardexNombre.value = producto.nombre;
  modalKardex.value = true;
  cargandoKardex.value = true;
  try {
    kardexProducto.value = await kardexService.historialProducto(producto.id);
  } finally {
    cargandoKardex.value = false;
  }
}

function nombreMovimiento(tipo: string) {
  const nombres: Record<string, string> = {
    INGRESO_COMPRA: 'Ingreso (compra)',
    SALIDA_VENTA: 'Salida (venta)',
    AJUSTE_INGRESO: 'Ajuste (+)',
    AJUSTE_SALIDA: 'Ajuste (−)',
  };
  return nombres[tipo] || tipo;
}

function esEntrada(tipo: string) {
  return tipo === 'INGRESO_COMPRA' || tipo === 'AJUSTE_INGRESO';
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <!-- Encabezado -->
    <div class="pagina-header">
      <div>
        <h1>Productos</h1>
        <p class="pagina-subtitulo">Gestiona tu catálogo de productos</p>
      </div>
      <BaseButton @click="abrirModalCrear">
        <Plus :size="18" /> Nuevo producto
      </BaseButton>
    </div>

    <!-- Buscador -->
    <div class="barra-busqueda">
      <BaseInput
        v-model="buscar"
        placeholder="Buscar producto..."
        @update:model-value="cargar"
      />
    </div>

    <!-- Tabla -->
    <BaseTable
      :columnas="columnas"
      :filas="productos"
      :cargando="cargando"
      texto-vacio="No tienes productos. Crea el primero."
    >
      <template #precio_venta="{ valor }">
        <strong>{{ moneda(valor) }}</strong>
      </template>
      <template #stock_actual="{ valor }">
        <span class="stock-badge" :class="{ 'stock-badge--bajo': valor <= 10 }">
          {{ numero(valor) }}
        </span>
      </template>
      <template #tipo_bien_servicio="{ valor }">
        <span class="tipo-badge" :class="valor === 'SERVICIO' ? 'tipo-badge--servicio' : 'tipo-badge--bien'">
          {{ valor === 'SERVICIO' ? 'Servicio' : 'Bien' }}
        </span>
      </template>
      <template #acciones="{ fila }">
        <div class="acciones-fila">
          <button class="btn-icono" @click="abrirModalEditar(fila)" title="Editar">
            <Pencil :size="18" />
          </button>
          <button class="btn-icono" @click="verKardex(fila)" title="Ver movimientos">
            <History :size="18" />
          </button>
          <button class="btn-icono btn-icono--danger" @click="desactivarProducto(fila)" title="Desactivar">
            <Trash2 :size="18" />
          </button>
        </div>
      </template>
    </BaseTable>

    <!-- Modal crear/editar producto -->
    <BaseModal
      v-model="modalAbierto"
      :titulo="editandoId ? 'Editar producto' : 'Nuevo producto'"
      ancho="grande"
    >
      <div class="form">
        <!-- Sección: Información básica -->
        <div class="form__seccion">
          <div class="form__seccion-head">
            <Tag :size="18" />
            <span>Información básica</span>
          </div>
          <div class="form__grid-2">
            <BaseInput v-model="form.nombre" label="Nombre del producto" placeholder="Ej: Laptop HP Pavilion" />
            <BaseInput v-model="form.codigo_sunat" label="Código" placeholder="Ej: P001" />
          </div>
        </div>

        <!-- Sección: Clasificación SUNAT -->
        <div class="form__seccion">
          <div class="form__seccion-head">
            <Package :size="18" />
            <span>Clasificación SUNAT</span>
          </div>
          <div class="form__grid-3">
            <BaseSelect
              v-model="form.tipo_bien_servicio"
              label="Tipo"
              :opciones="tiposBienServicio"
            />
            <BaseSelect
              v-model="form.tipo_igv"
              label="Afectación IGV"
              :opciones="tiposIgv"
            />
            <BaseInput
              v-model="form.unidad_medida"
              label="Unidad de medida"
              placeholder="NIU"
            />
          </div>
        </div>

        <!-- Sección: Precios y stock -->
        <div class="form__seccion">
          <div class="form__seccion-head">
            <DollarSign :size="18" />
            <span>Precios y stock</span>
          </div>
          <div class="form__grid-3">
            <BaseInput
              :model-value="String(form.precio_compra)"
              @update:model-value="form.precio_compra = Number($event)"
              label="Precio compra"
              tipo="number"
              placeholder="0.00"
            />
            <BaseInput
              :model-value="String(form.precio_venta)"
              @update:model-value="form.precio_venta = Number($event)"
              label="Precio venta"
              tipo="number"
              placeholder="0.00"
            />
            <BaseInput
              v-if="!editandoId"
              :model-value="String(form.stock_actual)"
              @update:model-value="form.stock_actual = Number($event)"
              label="Stock inicial"
              tipo="number"
              placeholder="0"
            />
          </div>
          <p v-if="editandoId" class="form__nota">
            El stock se gestiona desde compras y movimientos de kardex. No se edita aquí.
          </p>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="modalAbierto = false">Cancelar</BaseButton>
        <BaseButton :cargando="guardando" @click="guardar">
          {{ editandoId ? 'Guardar cambios' : 'Crear producto' }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Modal de kardex -->
    <BaseModal v-model="modalKardex" :titulo="`Movimientos: ${productoKardexNombre}`">
      <BaseTable
        :columnas="columnasKardex"
        :filas="kardexProducto"
        :cargando="cargandoKardex"
        texto-vacio="Sin movimientos registrados."
      >
        <template #fecha_movimiento="{ valor }">{{ fecha(valor) }}</template>
        <template #tipo_movimiento="{ valor }">{{ nombreMovimiento(valor) }}</template>
        <template #cantidad="{ fila }">
          <span :class="esEntrada(fila.tipo_movimiento) ? 'mov--entrada' : 'mov--salida'">
            {{ esEntrada(fila.tipo_movimiento) ? '+' : '−' }}{{ fila.cantidad }}
          </span>
        </template>
      </BaseTable>
    </BaseModal>
  </div>
</template>

<style scoped>
/* === Layout general === */
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
.barra-busqueda {
  max-width: 360px;
  margin-bottom: var(--space-md);
}

/* === Acciones de tabla === */
.acciones-fila {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.btn-icono {
  background: none; border: none; color: var(--accent);
  padding: 6px; border-radius: var(--radius-sm); display: inline-flex;
  cursor: pointer;
}
.btn-icono:hover { background: var(--accent-soft); }
.btn-icono--danger { color: var(--danger); }
.btn-icono--danger:hover { background: var(--danger-soft); }

/* === Badges === */
.stock-badge {
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  background: var(--success-soft);
  color: var(--success);
}
.stock-badge--bajo {
  background: var(--warning-soft);
  color: var(--warning);
}
.tipo-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
}
.tipo-badge--bien {
  background: var(--info-soft);
  color: var(--info);
}
.tipo-badge--servicio {
  background: var(--accent-soft);
  color: var(--accent);
}
.mov--entrada { color: var(--success); font-weight: 600; }
.mov--salida { color: var(--danger); font-weight: 600; }

/* === Formulario con secciones === */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-sm) 0;
}
.form__seccion {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.form__seccion-head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--accent);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border);
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
.form__nota {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-style: italic;
  margin-top: -4px;
}

@media (max-width: 700px) {
  .form__grid-2,
  .form__grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>