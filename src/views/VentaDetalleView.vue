<!-- src/views/VentaDetalleView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, FileText, Receipt, Trash2, FileCode2, FileCheck2 } from 'lucide-vue-next';
import { ventasService } from '../services/ventas.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import { useFrases } from '../composables/useFrases';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSpinner from '../components/ui/BaseSpinner.vue';

const route = useRoute();
const router = useRouter();
const { moneda, fecha } = useFormato();
const toast = useToast();
const { frase } = useFrases();

const venta = ref<any>(null);
const cargando = ref(true);
const textoCarga = ref(frase('ventas'));

async function cargar() {
  cargando.value = true;
  try {
    const id = route.params.id as string;
    venta.value = await ventasService.obtener(id);
  } catch {
    toast.error('No se pudo cargar la venta');
  } finally {
    cargando.value = false;
  }
}

async function verPdf(formato: 'a4' | 'ticket' = 'a4') {
  if (!venta.value?.id) return;
  try {
    const url = await ventasService.obtenerPdf(venta.value.id, formato);
    window.open(url, '_blank');
  } catch {
    toast.error('No se pudo cargar el PDF');
  }
}

function volver() {
  router.push('/ventas');
}

async function descargarXml() {
  if (!venta.value) return;
  try {
    await ventasService.descargarXml(venta.value.id, venta.value.nombre_archivo);
    toast.exito('XML descargado');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo descargar el XML');
  }
}

async function descargarCdr() {
  if (!venta.value) return;
  try {
    await ventasService.descargarCdr(venta.value.id, venta.value.nombre_archivo);
    toast.exito('CDR descargado');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo descargar el CDR');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <button class="volver" @click="volver">
      <ArrowLeft :size="18" /> Volver a ventas
    </button>

    <BaseSpinner v-if="cargando" :texto="textoCarga" />

    <div v-else-if="venta" class="detalle">
      <!-- Encabezado -->
      <div class="detalle__header">
        <div>
          <h1>{{ venta.tipo_nombre }}</h1>
          <p class="detalle__comprobante">{{ venta.comprobante }}</p>
        </div>
        <span class="badge" :class="{
          'badge--ok': venta.estado_sunat === 'ACEPTADO',
          'badge--error': venta.estado_sunat === 'RECHAZADO',
          'badge--anulada': venta.estado_sunat === 'ANULADA',
        }">
          {{ venta.estado_sunat }}
        </span>
      </div>

<!-- Acciones -->
      <div v-if="venta.estado_sunat === 'ACEPTADO'" class="detalle__acciones">
        <BaseButton @click="verPdf('a4')">
          <FileText :size="18" /> PDF A4
        </BaseButton>
        <BaseButton variant="secondary" @click="verPdf('ticket')">
          <Receipt :size="18" /> Ticket 80mm
        </BaseButton>
        <BaseButton variant="secondary" @click="descargarXml" v-if="venta.tiene_xml">
          <FileCode2 :size="18" /> XML
        </BaseButton>
        <BaseButton variant="secondary" @click="descargarCdr" v-if="venta.tiene_cdr">
          <FileCheck2 :size="18" /> CDR
        </BaseButton>
      </div>

      <!-- Datos del cliente -->
      <div class="panel">
        <h3 class="panel__titulo">Cliente</h3>
        <div class="panel__grid">
          <div class="dato">
            <span class="dato__label">Razón social</span>
            <span class="dato__valor">{{ venta.cliente.razon_social }}</span>
          </div>
          <div class="dato">
            <span class="dato__label">Documento</span>
            <span class="dato__valor">{{ venta.cliente.numero_documento }}</span>
          </div>
          <div class="dato">
            <span class="dato__label">Fecha de emisión</span>
            <span class="dato__valor">{{ fecha(venta.fecha_emision) }}</span>
          </div>
        </div>
      </div>

      <!-- Detalle de productos -->
      <div class="panel">
        <h3 class="panel__titulo">Productos</h3>
        <table class="tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: center;">Cantidad</th>
              <th style="text-align: right;">P. Unit.</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in venta.detalles" :key="i">
              <td>{{ item.producto_nombre }}</td>
              <td style="text-align: center;">{{ item.cantidad }}</td>
              <td style="text-align: right;">{{ moneda(item.precio_unitario) }}</td>
              <td style="text-align: right;"><strong>{{ moneda(item.subtotal) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totales -->
      <div class="panel panel--totales">
        <div class="totales__linea">
          <span>Op. Gravada</span>
          <span>{{ moneda(venta.totales.gravado) }}</span>
        </div>
        <div class="totales__linea">
          <span>IGV (18%)</span>
          <span>{{ moneda(venta.totales.igv) }}</span>
        </div>
        <div class="totales__total">
          <span>TOTAL</span>
          <span>{{ moneda(venta.totales.total) }}</span>
        </div>
      </div>

      <!-- Estado SUNAT -->
      <div class="panel">
        <h3 class="panel__titulo">Estado SUNAT</h3>
        <div class="dato">
          <span class="dato__label">Código</span>
          <span class="dato__valor">{{ venta.sunat_codigo || '—' }}</span>
        </div>
        <div class="dato">
          <span class="dato__label">Descripción</span>
          <span class="dato__valor">{{ venta.sunat_descripcion || '—' }}</span>
        </div>
        <div class="dato">
          <span class="dato__label">Archivo</span>
          <span class="dato__valor">{{ venta.nombre_archivo }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.volver {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; color: var(--text-secondary);
  font-size: var(--text-sm); margin-bottom: var(--space-md);
  cursor: pointer;
}
.volver:hover { color: var(--accent); }

.detalle { display: flex; flex-direction: column; gap: var(--space-md); }

.detalle__header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: var(--space-sm);
}
.detalle__comprobante {
  color: var(--accent);
  font-size: var(--text-lg);
  font-weight: 700;
  margin-top: 4px;
}

.badge {
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
}
.badge--ok { background: var(--success-soft); color: var(--success); }
.badge--error { background: var(--danger-soft); color: var(--danger); }
.badge--anulada { background: var(--warning-soft); color: var(--warning); }

.detalle__acciones {
  display: flex; gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.panel__titulo { font-size: var(--text-base); margin-bottom: var(--space-md); }
.panel__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

.dato { display: flex; flex-direction: column; gap: 2px; padding: var(--space-sm) 0; }
.dato__label { font-size: var(--text-xs); color: var(--text-secondary); }
.dato__valor { font-size: var(--text-sm); font-weight: 500; }

.tabla {
  width: 100%;
  border-collapse: collapse;
}
.tabla th, .tabla td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-sm);
}
.tabla th {
  background: var(--bg-surface-2);
  font-size: var(--text-xs);
  text-transform: uppercase;
  color: var(--text-secondary);
}

.panel--totales {
  max-width: 380px;
  margin-left: auto;
}
.totales__linea {
  display: flex; justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  padding: var(--space-sm) 0;
}
.totales__total {
  display: flex; justify-content: space-between;
  font-size: var(--text-lg);
  font-weight: 700;
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
  margin-top: var(--space-sm);
}

@media (max-width: 800px) {
  .panel__grid { grid-template-columns: 1fr; }
}
</style>