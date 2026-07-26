<!-- src/views/PercepcionesView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Trash2, X, FileCode2, FileCheck2 } from 'lucide-vue-next';
import { percepcionesService, type PercepcionLista } from '../services/percepciones.service';
import { clientesService, type Cliente } from '../services/clientes.service';
import { useFormato } from '../composables/useFormato';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';

const { moneda } = useFormato();
const toast = useToast();

const percepciones = ref<PercepcionLista[]>([]);
const clientes = ref<Cliente[]>([]);
const cargando = ref(true);

const modal = ref(false);
const serie = ref('P001');
const regimen = ref('01');
const clienteId = ref('');
const observaciones = ref('');
const emitiendo = ref(false);

interface FilaDoc {
  num_doc_relacionado: string;
  fecha_doc: string;
  importe_doc: number;
  fecha_cobro: string;
  importe_cobrado: number;
}
const documentos = ref<FilaDoc[]>([]);

const regimenes = [
  { valor: '01', texto: 'Venta interna (2%)' },
  { valor: '02', texto: 'Combustible (1%)' },
  { valor: '03', texto: 'Tasa especial (0.5%)' },
];
const opcionesClientes = computed(() =>
  clientes.value.map((c) => ({ valor: c.id, texto: `${c.razon_social} (${c.numero_documento})` })),
);

const tasa = computed(() => (regimen.value === '02' ? 1 : regimen.value === '03' ? 0.5 : 2));
const totalCobrado = computed(() =>
  documentos.value.reduce((s, d) => s + Number(d.importe_cobrado || 0), 0),
);
const totalPercibido = computed(() =>
  Math.round(totalCobrado.value * (tasa.value / 100) * 100) / 100,
);
function montoPercibidoFila(d: FilaDoc) {
  return Math.round(Number(d.importe_cobrado || 0) * (tasa.value / 100) * 100) / 100;
}

async function cargar() {
  cargando.value = true;
  try {
    percepciones.value = await percepcionesService.listar();
  } catch {
    toast.error('Error al cargar percepciones');
  } finally {
    cargando.value = false;
  }
}

function abrir() {
  serie.value = 'P001';
  regimen.value = '01';
  clienteId.value = '';
  observaciones.value = '';
  documentos.value = [];
  agregarFila();
  modal.value = true;
}
function agregarFila() {
  const hoy = new Date().toISOString().split('T')[0];
  documentos.value.push({ num_doc_relacionado: '', fecha_doc: hoy, importe_doc: 0, fecha_cobro: hoy, importe_cobrado: 0 });
}
function quitarFila(i: number) {
  documentos.value.splice(i, 1);
}

async function emitir() {
  const cli = clientes.value.find((c) => c.id === clienteId.value);
  if (!cli) {
    toast.advertencia('Selecciona un cliente');
    return;
  }
  const docsValidos = documentos.value.filter(
    (d) => d.num_doc_relacionado.trim() && Number(d.importe_cobrado) > 0,
  );
  if (docsValidos.length === 0) {
    toast.advertencia('Agrega al menos un documento cobrado');
    return;
  }
  emitiendo.value = true;
  try {
    const res = await percepcionesService.emitir({
      serie: serie.value,
      regimen: regimen.value,
      cliente_numero_documento: cli.numero_documento,
      cliente_razon_social: cli.razon_social,
      cliente_direccion: (cli as any).direccion || undefined,
      observaciones: observaciones.value.trim() || undefined,
      detalles: docsValidos.map((d) => ({
        num_doc_relacionado: d.num_doc_relacionado.trim(),
        fecha_doc: d.fecha_doc,
        importe_doc: Number(d.importe_doc),
        fecha_cobro: d.fecha_cobro,
        importe_cobrado: Number(d.importe_cobrado),
      })),
    });
    toast.exito(`Percepción ${res.comprobante} aceptada por SUNAT`);
    modal.value = false;
    await cargar();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al emitir la percepción');
  } finally {
    emitiendo.value = false;
  }
}

async function bajarXml(p: PercepcionLista) {
  try { await percepcionesService.descargarXml(p.id, p.comprobante); } catch { toast.error('No se pudo descargar el XML'); }
}
async function bajarCdr(p: PercepcionLista) {
  try { await percepcionesService.descargarCdr(p.id, p.comprobante); } catch { toast.error('No se pudo descargar el CDR'); }
}

const fechaFmt = (f: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');

onMounted(async () => {
  clientes.value = await clientesService.listar();
  await cargar();
});
</script>

<template>
  <div>
    <div class="per__top">
      <h1>Comprobantes de Percepción</h1>
      <BaseButton @click="abrir"><Plus :size="18" /> Nueva percepción</BaseButton>
    </div>

    <div class="per__tabla-wrap">
      <table class="per__tabla">
        <thead>
          <tr>
            <th>Comprobante</th><th>Fecha</th><th>Cliente</th>
            <th class="d">Cobrado</th><th class="d">Percibido</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando"><td colspan="7" class="per__vacio">Cargando…</td></tr>
          <tr v-else-if="percepciones.length === 0"><td colspan="7" class="per__vacio">Sin percepciones</td></tr>
          <tr v-for="p in percepciones" :key="p.id">
            <td><strong>{{ p.comprobante }}</strong></td>
            <td>{{ fechaFmt(p.fecha_emision) }}</td>
            <td>{{ p.cliente }}</td>
            <td class="d">{{ moneda(p.total_cobrado) }}</td>
            <td class="d"><strong>{{ moneda(p.total_percibido) }}</strong></td>
            <td><span class="badge b-verde">{{ p.estado_sunat }}</span></td>
            <td class="d">
              <button v-if="p.tiene_xml" class="per__link" @click="bajarXml(p)"><FileCode2 :size="15" /> XML</button>
              <button v-if="p.tiene_cdr" class="per__link" @click="bajarCdr(p)"><FileCheck2 :size="15" /> CDR</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal emitir -->
    <div v-if="modal" class="per__modal-bg" @click.self="modal = false">
      <div class="per__modal">
        <div class="per__modal-head">
          <h2>Nueva percepción</h2>
          <button @click="modal = false"><X :size="20" /></button>
        </div>
        <div class="per__form">
          <div class="per__grid3">
            <label>Serie <input v-model="serie" maxlength="4" /></label>
            <BaseSelect v-model="regimen" label="Régimen" :opciones="regimenes" />
            <BaseSelect v-model="clienteId" label="Cliente" :opciones="opcionesClientes" placeholder="Selecciona" />
          </div>

          <div class="per__docs-head">
            <span>Documentos cobrados (tasa {{ tasa }}%)</span>
            <button class="per__mini" @click="agregarFila"><Plus :size="14" /> Fila</button>
          </div>

          <div class="per__docs">
            <div v-for="(d, i) in documentos" :key="i" class="per__doc-fila">
              <input v-model="d.num_doc_relacionado" placeholder="F001-123" class="per__col-doc" />
              <input v-model="d.fecha_cobro" type="date" title="Fecha de cobro" />
              <input v-model.number="d.importe_cobrado" type="number" min="0" step="0.01" placeholder="Cobrado" />
              <span class="per__percibido">{{ moneda(montoPercibidoFila(d)) }}</span>
              <button class="per__quitar" @click="quitarFila(i)"><Trash2 :size="15" /></button>
            </div>
          </div>

          <textarea v-model="observaciones" placeholder="Observaciones (opcional)" rows="2"></textarea>

          <div class="per__totales">
            <div><span>Total cobrado</span><strong>{{ moneda(totalCobrado) }}</strong></div>
            <div class="per__total-per"><span>Total percibido</span><strong>{{ moneda(totalPercibido) }}</strong></div>
          </div>
        </div>
        <div class="per__modal-foot">
          <BaseButton variant="secondary" @click="modal = false">Cancelar</BaseButton>
          <BaseButton :cargando="emitiendo" @click="emitir">Emitir a SUNAT</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.per__top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
.per__top h1 { margin: 0; font-size: 1.4rem; }
.per__tabla-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
.per__tabla { width: 100%; border-collapse: collapse; }
.per__tabla th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; color: #64748b; padding: .7rem .9rem; background: #f8fafc; white-space: nowrap; }
.per__tabla th.d, .per__tabla td.d { text-align: right; }
.per__tabla td { padding: .7rem .9rem; border-top: 1px solid #f1f5f9; }
.per__vacio { text-align: center; color: #94a3b8; padding: 2rem; }
.per__link { background: none; border: none; color: #6366f1; cursor: pointer; display: inline-flex; align-items: center; gap: .25rem; font-size: .8rem; margin-left: .6rem; }
.badge { padding: .15rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 600; }
.b-verde { background: #dcfce7; color: #16a34a; }

.per__modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: grid; place-items: center; z-index: 50; padding: 1rem; }
.per__modal { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; }
.per__modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; }
.per__modal-head h2 { margin: 0; font-size: 1.1rem; }
.per__modal-head button { background: none; border: none; cursor: pointer; color: #64748b; }
.per__form { padding: 1.25rem; display: flex; flex-direction: column; gap: .7rem; }
.per__form input, .per__form textarea { padding: .5rem .6rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.per__grid3 { display: grid; grid-template-columns: 90px 1fr 1.4fr; gap: .6rem; align-items: end; }
.per__grid3 label { display: flex; flex-direction: column; font-size: .8rem; color: #475569; gap: .25rem; }
.per__docs-head { display: flex; justify-content: space-between; align-items: center; font-size: .82rem; color: #475569; font-weight: 600; margin-top: .3rem; }
.per__mini { display: inline-flex; align-items: center; gap: .2rem; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; padding: .25rem .5rem; cursor: pointer; font-size: .78rem; }
.per__docs { display: flex; flex-direction: column; gap: .4rem; }
.per__doc-fila { display: grid; grid-template-columns: 1.3fr 1fr .9fr .9fr auto; gap: .4rem; align-items: center; }
.per__col-doc { min-width: 0; }
.per__percibido { font-size: .85rem; color: #16a34a; font-weight: 600; text-align: right; }
.per__quitar { color: #ef4444; background: none; border: none; cursor: pointer; }
.per__totales { display: flex; justify-content: flex-end; gap: 1.5rem; border-top: 2px dashed #e2e8f0; padding-top: .6rem; }
.per__totales div { display: flex; flex-direction: column; align-items: flex-end; font-size: .8rem; color: #64748b; }
.per__totales strong { font-size: 1.1rem; color: #0f172a; }
.per__total-per strong { color: #16a34a; font-size: 1.35rem; }
.per__modal-foot { display: flex; justify-content: flex-end; gap: .6rem; padding: 1rem 1.25rem; border-top: 1px solid #f1f5f9; }
</style>
