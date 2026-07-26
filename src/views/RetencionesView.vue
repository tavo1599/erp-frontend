<!-- src/views/RetencionesView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Trash2, X, FileCode2, FileCheck2 } from 'lucide-vue-next';
import { retencionesService, type RetencionLista } from '../services/retenciones.service';
import { proveedoresService, type Proveedor } from '../services/proveedores.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';

const { moneda } = useFormato();
const toast = useToast();

const retenciones = ref<RetencionLista[]>([]);
const proveedores = ref<Proveedor[]>([]);
const cargando = ref(true);

// Modal emitir
const modal = ref(false);
const serie = ref('R001');
const regimen = ref('01');
const proveedorId = ref('');
const observaciones = ref('');
const emitiendo = ref(false);

interface FilaDoc {
  num_doc_relacionado: string;
  fecha_doc: string;
  importe_doc: number;
  fecha_pago: string;
  importe_pagado: number;
}
const documentos = ref<FilaDoc[]>([]);

const regimenes = [
  { valor: '01', texto: 'Régimen General (3%)' },
  { valor: '02', texto: 'Tasa 6%' },
];
const opcionesProveedores = computed(() =>
  proveedores.value.map((p) => ({ valor: p.id, texto: `${p.razon_social} (${p.ruc})` })),
);

const tasa = computed(() => (regimen.value === '02' ? 6 : 3));
const totalPagado = computed(() =>
  documentos.value.reduce((s, d) => s + Number(d.importe_pagado || 0), 0),
);
const totalRetenido = computed(() =>
  Math.round(totalPagado.value * (tasa.value / 100) * 100) / 100,
);

function montoRetenidoFila(d: FilaDoc) {
  return Math.round(Number(d.importe_pagado || 0) * (tasa.value / 100) * 100) / 100;
}

async function cargar() {
  cargando.value = true;
  try {
    retenciones.value = await retencionesService.listar();
  } catch {
    toast.error('Error al cargar retenciones');
  } finally {
    cargando.value = false;
  }
}

function abrir() {
  serie.value = 'R001';
  regimen.value = '01';
  proveedorId.value = '';
  observaciones.value = '';
  documentos.value = [];
  agregarFila();
  modal.value = true;
}

function agregarFila() {
  const hoy = new Date().toISOString().split('T')[0];
  documentos.value.push({
    num_doc_relacionado: '',
    fecha_doc: hoy,
    importe_doc: 0,
    fecha_pago: hoy,
    importe_pagado: 0,
  });
}
function quitarFila(i: number) {
  documentos.value.splice(i, 1);
}

async function emitir() {
  const prov = proveedores.value.find((p) => p.id === proveedorId.value);
  if (!prov) {
    toast.advertencia('Selecciona un proveedor');
    return;
  }
  const docsValidos = documentos.value.filter(
    (d) => d.num_doc_relacionado.trim() && Number(d.importe_pagado) > 0,
  );
  if (docsValidos.length === 0) {
    toast.advertencia('Agrega al menos un documento pagado');
    return;
  }
  emitiendo.value = true;
  try {
    const res = await retencionesService.emitir({
      serie: serie.value,
      regimen: regimen.value,
      proveedor_numero_documento: prov.ruc,
      proveedor_razon_social: prov.razon_social,
      proveedor_direccion: prov.direccion || undefined,
      observaciones: observaciones.value.trim() || undefined,
      detalles: docsValidos.map((d) => ({
        num_doc_relacionado: d.num_doc_relacionado.trim(),
        fecha_doc: d.fecha_doc,
        importe_doc: Number(d.importe_doc),
        fecha_pago: d.fecha_pago,
        importe_pagado: Number(d.importe_pagado),
      })),
    });
    toast.exito(`Retención ${res.comprobante} aceptada por SUNAT`);
    modal.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al emitir la retención');
  } finally {
    emitiendo.value = false;
  }
}

async function bajarXml(r: RetencionLista) {
  try {
    await retencionesService.descargarXml(r.id, r.comprobante);
  } catch {
    toast.error('No se pudo descargar el XML');
  }
}
async function bajarCdr(r: RetencionLista) {
  try {
    await retencionesService.descargarCdr(r.id, r.comprobante);
  } catch {
    toast.error('No se pudo descargar el CDR');
  }
}

const fechaFmt = (f: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');

onMounted(async () => {
  proveedores.value = await proveedoresService.listar();
  await cargar();
});
</script>

<template>
  <div>
    <div class="ret__top">
      <h1>Comprobantes de Retención</h1>
      <BaseButton @click="abrir"><Plus :size="18" /> Nueva retención</BaseButton>
    </div>

    <div class="ret__tabla-wrap">
      <table class="ret__tabla">
        <thead>
          <tr>
            <th>Comprobante</th><th>Fecha</th><th>Proveedor</th>
            <th class="d">Pagado</th><th class="d">Retenido</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando"><td colspan="7" class="ret__vacio">Cargando…</td></tr>
          <tr v-else-if="retenciones.length === 0"><td colspan="7" class="ret__vacio">Sin retenciones</td></tr>
          <tr v-for="r in retenciones" :key="r.id">
            <td><strong>{{ r.comprobante }}</strong></td>
            <td>{{ fechaFmt(r.fecha_emision) }}</td>
            <td>{{ r.proveedor }}</td>
            <td class="d">{{ moneda(r.total_pagado) }}</td>
            <td class="d"><strong>{{ moneda(r.total_retenido) }}</strong></td>
            <td><span class="badge b-verde">{{ r.estado_sunat }}</span></td>
            <td class="d">
              <button v-if="r.tiene_xml" class="ret__link" @click="bajarXml(r)"><FileCode2 :size="15" /> XML</button>
              <button v-if="r.tiene_cdr" class="ret__link" @click="bajarCdr(r)"><FileCheck2 :size="15" /> CDR</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal emitir -->
    <div v-if="modal" class="ret__modal-bg" @click.self="modal = false">
      <div class="ret__modal">
        <div class="ret__modal-head">
          <h2>Nueva retención</h2>
          <button @click="modal = false"><X :size="20" /></button>
        </div>
        <div class="ret__form">
          <div class="ret__grid3">
            <label>Serie <input v-model="serie" maxlength="4" /></label>
            <BaseSelect v-model="regimen" label="Régimen" :opciones="regimenes" />
            <BaseSelect v-model="proveedorId" label="Proveedor" :opciones="opcionesProveedores" placeholder="Selecciona" />
          </div>

          <div class="ret__docs-head">
            <span>Documentos pagados (tasa {{ tasa }}%)</span>
            <button class="ret__mini" @click="agregarFila"><Plus :size="14" /> Fila</button>
          </div>

          <div class="ret__docs">
            <div v-for="(d, i) in documentos" :key="i" class="ret__doc-fila">
              <input v-model="d.num_doc_relacionado" placeholder="F001-123" class="ret__col-doc" />
              <input v-model="d.fecha_pago" type="date" title="Fecha de pago" />
              <input v-model.number="d.importe_pagado" type="number" min="0" step="0.01" placeholder="Pagado" />
              <span class="ret__retenido">{{ moneda(montoRetenidoFila(d)) }}</span>
              <button class="ret__quitar" @click="quitarFila(i)"><Trash2 :size="15" /></button>
            </div>
          </div>

          <textarea v-model="observaciones" placeholder="Observaciones (opcional)" rows="2"></textarea>

          <div class="ret__totales">
            <div><span>Total pagado</span><strong>{{ moneda(totalPagado) }}</strong></div>
            <div class="ret__total-ret"><span>Total retenido</span><strong>{{ moneda(totalRetenido) }}</strong></div>
          </div>
        </div>
        <div class="ret__modal-foot">
          <BaseButton variant="secondary" @click="modal = false">Cancelar</BaseButton>
          <BaseButton :cargando="emitiendo" @click="emitir">Emitir a SUNAT</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ret__top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
.ret__top h1 { margin: 0; font-size: 1.4rem; }
.ret__tabla-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
.ret__tabla { width: 100%; border-collapse: collapse; }
.ret__tabla th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; padding: .7rem .9rem; background: #f8fafc; white-space: nowrap; }
.ret__tabla th.d, .ret__tabla td.d { text-align: right; }
.ret__tabla td { padding: .7rem .9rem; border-top: 1px solid #f1f5f9; }
.ret__vacio { text-align: center; color: #94a3b8; padding: 2rem; }
.ret__link { background: none; border: none; color: #6366f1; cursor: pointer; display: inline-flex; align-items: center; gap: .25rem; font-size: .8rem; margin-left: .6rem; }
.badge { padding: .15rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 600; }
.b-verde { background: #dcfce7; color: #16a34a; }

.ret__modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: grid; place-items: center; z-index: 50; padding: 1rem; }
.ret__modal { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; }
.ret__modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; }
.ret__modal-head h2 { margin: 0; font-size: 1.1rem; }
.ret__modal-head button { background: none; border: none; cursor: pointer; color: #64748b; }
.ret__form { padding: 1.25rem; display: flex; flex-direction: column; gap: .7rem; }
.ret__form input, .ret__form textarea { padding: .5rem .6rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.ret__grid3 { display: grid; grid-template-columns: 90px 1fr 1.4fr; gap: .6rem; align-items: end; }
.ret__grid3 label { display: flex; flex-direction: column; font-size: .8rem; color: #475569; gap: .25rem; }
.ret__docs-head { display: flex; justify-content: space-between; align-items: center; font-size: .82rem; color: #475569; font-weight: 600; margin-top: .3rem; }
.ret__mini { display: inline-flex; align-items: center; gap: .2rem; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; padding: .25rem .5rem; cursor: pointer; font-size: .78rem; }
.ret__docs { display: flex; flex-direction: column; gap: .4rem; }
.ret__doc-fila { display: grid; grid-template-columns: 1.3fr 1fr .9fr .9fr auto; gap: .4rem; align-items: center; }
.ret__col-doc { min-width: 0; }
.ret__retenido { font-size: .85rem; color: #16a34a; font-weight: 600; text-align: right; }
.ret__quitar { color: #ef4444; background: none; border: none; cursor: pointer; }
.ret__totales { display: flex; justify-content: flex-end; gap: 1.5rem; border-top: 2px dashed #e2e8f0; padding-top: .6rem; }
.ret__totales div { display: flex; flex-direction: column; align-items: flex-end; font-size: .8rem; color: #64748b; }
.ret__totales strong { font-size: 1.1rem; color: #0f172a; }
.ret__total-ret strong { color: #16a34a; font-size: 1.35rem; }
.ret__modal-foot { display: flex; justify-content: flex-end; gap: .6rem; padding: 1rem 1.25rem; border-top: 1px solid #f1f5f9; }
</style>
