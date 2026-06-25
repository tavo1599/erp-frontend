<!-- src/views/GuiaRemisionDetalleView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  ArrowLeft, FileText, FileCode2, FileCheck2, CheckCircle2, XCircle, Ban,
  MapPin, Truck, Car, User, Package, ArrowUpFromLine, ArrowDownToLine,
  Weight, Calendar, AlertCircle, Trash2,
} from 'lucide-vue-next';
import { useConfirm } from '../composables/useConfirm';
import { guiasRemisionService } from '../services/guias-remision.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import { useFrases } from '../composables/useFrases';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSpinner from '../components/ui/BaseSpinner.vue';

const router = useRouter();
const route = useRoute();
const { fecha } = useFormato();
const toast = useToast();
const { confirmar } = useConfirm();
const { frase } = useFrases();

const guia = ref<any>(null);
const cargando = ref(true);
const textoCarga = ref(frase('general'));

const tipoNombre = computed(() => {
  if (!guia.value) return '';
  return guia.value.tipo_guia === '09'
    ? 'Guía de Remisión Remitente'
    : 'Guía de Remisión Transportista';
});

const modalidadNombre = computed(() => {
  if (!guia.value) return '';
  return guia.value.modalidad_transporte === '01' ? 'Pública' : 'Privada';
});

const motivoNombre = computed(() => {
  if (!guia.value) return '';
  const motivos: Record<string, string> = {
    '01': 'Venta',
    '02': 'Compra',
    '04': 'Traslado entre establecimientos',
    '08': 'Importación',
    '09': 'Exportación',
    '13': 'Otros',
    '14': 'Venta sujeta a confirmación',
    '18': 'Traslado para transformación',
  };
  return motivos[guia.value.motivo_traslado] || guia.value.motivo_traslado;
});

async function cargar() {
  cargando.value = true;
  try {
    const id = route.params.id as string;
    guia.value = await guiasRemisionService.obtener(id);
  } catch {
    toast.error('No se pudo cargar la guía');
    router.push('/guias-remision');
  } finally {
    cargando.value = false;
  }
}

function volver() {
  router.push('/guias-remision');
}

async function verPdf() {
  if (!guia.value) return;
  try {
    const url = await guiasRemisionService.obtenerPdf(guia.value.id);
    window.open(url, '_blank');
  } catch {
    toast.error('No se pudo cargar el PDF');
  }
}

async function descargarXml() {
  if (!guia.value) return;
  try {
    await guiasRemisionService.descargarXml(guia.value.id, guia.value.nombre_archivo);
    toast.exito('XML descargado');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo descargar el XML');
  }
}

async function descargarCdr() {
  if (!guia.value) return;
  try {
    await guiasRemisionService.descargarCdr(guia.value.id, guia.value.nombre_archivo);
    toast.exito('CDR descargado');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo descargar el CDR');
  }
}

async function anular() {
  if (!guia.value) return;

  const ok = await confirmar({
    titulo: '¿Anular esta guía?',
    mensaje: `Vas a anular la guía ${guia.value.guia}. Esta acción no se puede deshacer. ¿Continuar?`,
    textoConfirmar: 'Anular guía',
    peligro: true,
  });
  if (!ok) return;

  try {
    await guiasRemisionService.anular(guia.value.id);
    toast.exito('Guía anulada correctamente');
    await cargar(); // Recarga para mostrar el nuevo estado
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo anular');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <!-- Encabezado con volver -->
    <div class="pagina-header">
      <button class="btn-volver" @click="volver">
        <ArrowLeft :size="20" />
      </button>
      <div class="header-info">
        <h1>{{ tipoNombre }}</h1>
        <p class="pagina-subtitulo" v-if="guia">{{ guia.guia }}</p>
      </div>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" class="cargando-completo">
      <BaseSpinner :texto="textoCarga" />
    </div>

    <div v-else-if="guia" class="detalle">
      <!-- Estado destacado -->
      <div class="estado-card" :class="{
        'estado-card--ok': guia.estado_sunat === 'ACEPTADO',
        'estado-card--error': guia.estado_sunat === 'RECHAZADO',
        'estado-card--anulada': guia.estado_sunat === 'ANULADA',
      }">
        <div class="estado-card__icono">
          <CheckCircle2 v-if="guia.estado_sunat === 'ACEPTADO'" :size="32" />
          <XCircle v-else-if="guia.estado_sunat === 'RECHAZADO'" :size="32" />
          <Ban v-else-if="guia.estado_sunat === 'ANULADA'" :size="32" />
          <AlertCircle v-else :size="32" />
        </div>
        <div class="estado-card__info">
          <h3>{{ guia.estado_sunat }}</h3>
          <p v-if="guia.sunat_descripcion">{{ guia.sunat_descripcion }}</p>
        </div>
      </div>

      <!-- Acciones -->
      <div v-if="guia.estado_sunat === 'ACEPTADO'" class="detalle__acciones">
  <BaseButton @click="verPdf">
    <FileText :size="18" /> Descargar PDF
  </BaseButton>
  <BaseButton variant="secondary" @click="descargarXml" v-if="guia.tiene_xml">
    <FileCode2 :size="18" /> XML
  </BaseButton>
  <BaseButton variant="secondary" @click="descargarCdr" v-if="guia.tiene_cdr">
    <FileCheck2 :size="18" /> CDR
  </BaseButton>
  
  <!-- NUEVO: botón anular -->
  <button class="btn-anular" @click="anular">
  <Trash2 :size="18" /> Anular guía
</button>
</div>

      <!-- Información en cards -->
      <div class="info-grid">
        <!-- Datos generales -->
        <div class="card">
          <h3 class="card__titulo">
            <Calendar :size="18" /> Datos generales
          </h3>
          <div class="campo">
            <span class="campo__label">Tipo de guía</span>
            <strong>{{ tipoNombre }}</strong>
          </div>
          <div class="campo">
            <span class="campo__label">Serie y correlativo</span>
            <strong>{{ guia.guia }}</strong>
          </div>
          <div class="campo">
            <span class="campo__label">Fecha de emisión</span>
            <strong>{{ fecha(guia.fecha_emision) }}</strong>
          </div>
          <div class="campo">
            <span class="campo__label">Fecha inicio traslado</span>
            <strong>{{ fecha(guia.fecha_inicio_traslado) }}</strong>
          </div>
          <div class="campo" v-if="guia.doc_relacionado_numero">
            <span class="campo__label">Documento relacionado</span>
            <strong>{{ guia.doc_relacionado_numero }}</strong>
          </div>
        </div>

        <!-- Motivo -->
        <div class="card">
          <h3 class="card__titulo">
            <Truck :size="18" /> Motivo del traslado
          </h3>
          <div class="campo">
            <span class="campo__label">Motivo</span>
            <strong>{{ motivoNombre }}</strong>
          </div>
          <div class="campo">
            <span class="campo__label">Descripción</span>
            <strong>{{ guia.descripcion_motivo }}</strong>
          </div>
        </div>

        <!-- Destinatario -->
        <div class="card">
          <h3 class="card__titulo">
            <User :size="18" /> Destinatario
          </h3>
          <div class="campo">
            <span class="campo__label">{{ guia.destinatario_tipo_documento === '6' ? 'RUC' : 'DNI' }}</span>
            <strong>{{ guia.destinatario_numero_documento }}</strong>
          </div>
          <div class="campo">
            <span class="campo__label">Razón social</span>
            <strong>{{ guia.destinatario_razon_social }}</strong>
          </div>
        </div>

        <!-- Origen -->
        <div class="card">
          <h3 class="card__titulo">
            <ArrowUpFromLine :size="18" /> Origen (Partida)
          </h3>
          <div class="campo">
            <span class="campo__label">Ubigeo</span>
            <strong>{{ guia.partida_ubigeo }}</strong>
          </div>
          <div class="campo">
            <span class="campo__label">Dirección</span>
            <strong>{{ guia.partida_direccion }}</strong>
          </div>
        </div>

        <!-- Destino -->
        <div class="card">
          <h3 class="card__titulo">
            <ArrowDownToLine :size="18" /> Destino (Llegada)
          </h3>
          <div class="campo">
            <span class="campo__label">Ubigeo</span>
            <strong>{{ guia.llegada_ubigeo }}</strong>
          </div>
          <div class="campo">
            <span class="campo__label">Dirección</span>
            <strong>{{ guia.llegada_direccion }}</strong>
          </div>
        </div>

        <!-- Transporte -->
        <div class="card">
          <h3 class="card__titulo">
            <Car :size="18" /> Transporte
          </h3>
          <div class="campo">
            <span class="campo__label">Modalidad</span>
            <span class="badge-modalidad" :class="`badge-modalidad--${modalidadNombre.toLowerCase()}`">
              {{ modalidadNombre }}
            </span>
          </div>
          <template v-if="guia.transportista_razon_social">
            <div class="campo">
              <span class="campo__label">Transportista</span>
              <strong>{{ guia.transportista_razon_social }}</strong>
            </div>
            <div class="campo" v-if="guia.transportista_numero_documento">
              <span class="campo__label">RUC transportista</span>
              <strong>{{ guia.transportista_numero_documento }}</strong>
            </div>
          </template>
          <div class="campo" v-if="guia.numero_placa">
            <span class="campo__label">Placa del vehículo</span>
            <span class="placa">{{ guia.numero_placa }}</span>
          </div>
          <div class="campo" v-if="guia.conductor_nombre">
            <span class="campo__label">Conductor</span>
            <strong>{{ guia.conductor_nombre }}</strong>
          </div>
          <div class="campo" v-if="guia.conductor_numero_documento">
            <span class="campo__label">DNI conductor</span>
            <strong>{{ guia.conductor_numero_documento }}</strong>
          </div>
          <div class="campo" v-if="guia.conductor_licencia">
            <span class="campo__label">Licencia de conducir</span>
            <strong>{{ guia.conductor_licencia }}</strong>
          </div>
        </div>

        <!-- Peso -->
        <div class="card">
          <h3 class="card__titulo">
            <Weight :size="18" /> Peso del traslado
          </h3>
          <div class="campo">
            <span class="campo__label">Peso bruto total</span>
            <strong class="peso-grande">{{ Number(guia.peso_bruto_total).toFixed(3) }} KG</strong>
          </div>
        </div>
      </div>

      <!-- Productos trasladados -->
      <div class="card">
        <h3 class="card__titulo">
          <Package :size="18" /> Productos trasladados
        </h3>
        <div class="tabla-productos">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Unidad</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Peso unit.</th>
                <th class="text-right">Peso total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in guia.detalles" :key="item.id">
                <td>{{ item.numero }}</td>
                <td>{{ item.descripcion }}</td>
                <td>{{ item.unidad_medida }}</td>
                <td class="text-right">{{ Number(item.cantidad).toFixed(3) }}</td>
                <td class="text-right">{{ Number(item.peso_unitario || 0).toFixed(3) }}</td>
                <td class="text-right">
                  <strong>{{ (Number(item.cantidad) * Number(item.peso_unitario || 0)).toFixed(3) }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Observaciones -->
      <div v-if="guia.observaciones" class="card">
        <h3 class="card__titulo">Observaciones</h3>
        <p class="observaciones">{{ guia.observaciones }}</p>
      </div>

      <!-- Info técnica -->
      <div class="card card--secundario">
        <h3 class="card__titulo">Información técnica SUNAT</h3>
        <div class="campo">
          <span class="campo__label">Archivo</span>
          <strong class="mono">{{ guia.nombre_archivo }}</strong>
        </div>
        <div class="campo" v-if="guia.sunat_hash">
          <span class="campo__label">Hash</span>
          <strong class="mono mono-pequeno">{{ guia.sunat_hash }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagina-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
.btn-volver {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.btn-volver:hover { background: var(--bg-surface-2); }
.header-info h1 { color: var(--accent); }
.pagina-subtitulo {
  color: var(--text-secondary);
  margin-top: 4px;
  font-family: monospace;
  font-size: var(--text-base);
}

.cargando-completo {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.detalle {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Estado card */
.estado-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}
.estado-card--ok {
  background: var(--success-soft);
  border-color: var(--success);
  color: var(--success);
}
.estado-card--error {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--danger);
}
.estado-card--anulada {
  background: var(--warning-soft);
  border-color: var(--warning);
  color: var(--warning);
}
.estado-card__icono {
  flex-shrink: 0;
}
.estado-card__info h3 {
  margin: 0;
  font-size: var(--text-lg);
}
.estado-card__info p {
  margin: 4px 0 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  opacity: 0.85;
}

/* Acciones */
.detalle__acciones {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

/* Grid de info */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

/* Cards */
.card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
}
.card--secundario {
  background: var(--bg-surface-2);
}
.card__titulo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-base);
  color: var(--accent);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border);
}

/* Campos dentro de cards */
.campo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border);
}
.campo:last-child {
  border-bottom: none;
}
.campo__label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.campo strong {
  font-size: var(--text-sm);
  color: var(--text-primary);
}
.peso-grande {
  font-size: var(--text-2xl) !important;
  color: var(--accent) !important;
  font-family: monospace;
}

/* Badges */
.badge-modalidad {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  width: fit-content;
}
.badge-modalidad--pública { background: var(--info-soft); color: var(--info); }
.badge-modalidad--privada { background: var(--success-soft); color: var(--success); }

.placa {
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-weight: 700;
  letter-spacing: 1px;
  width: fit-content;
}

/* Tabla productos */
.tabla-productos {
  overflow-x: auto;
}
.tabla-productos table {
  width: 100%;
  border-collapse: collapse;
}
.tabla-productos th {
  background: var(--bg-surface-2);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  text-transform: uppercase;
}
.tabla-productos td {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  border-top: 1px solid var(--border);
}
.text-right { text-align: right; }

/* Observaciones */
.observaciones {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* Mono space */
.mono {
  font-family: monospace;
}
.mono-pequeno {
  font-size: var(--text-xs);
  word-break: break-all;
}

@media (max-width: 900px) {
  .info-grid { grid-template-columns: 1fr; }
}
.btn-anular {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--danger);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  font-size: var(--text-sm);
}
.btn-anular:hover {
  filter: brightness(0.92);
}
</style>