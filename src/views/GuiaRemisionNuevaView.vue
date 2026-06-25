<!-- src/views/GuiaRemisionNuevaView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowLeft, Save, Plus, Trash2, Search, MapPin, Truck, Car, User,
  Package, FileText, Send, AlertCircle, CheckCircle2, ArrowUpFromLine,
  ArrowDownToLine, Weight, Calendar,
} from 'lucide-vue-next';
import {
  guiasRemisionService,
  type CrearGuia,
  type DetalleGuia,
} from '../services/guias-remision.service';
import { transportistasService, type Transportista } from '../services/transportistas.service';
import { vehiculosService, type Vehiculo } from '../services/vehiculos.service';
import { conductoresService, type Conductor } from '../services/conductores.service';
import {
  direccionesTrasladoService,
  type DireccionTraslado,
} from '../services/direcciones-traslado.service';
import { clientesService, type Cliente } from '../services/clientes.service';
import { productosService, type Producto } from '../services/productos.service';
import { ventasService } from '../services/ventas.service';
import { sunatService } from '../services/sunat.service';
import { useToast } from '../composables/useToast';
import { useFrases } from '../composables/useFrases';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSelect from '../components/ui/BaseSelect.vue';
import BaseSpinner from '../components/ui/BaseSpinner.vue';

const router = useRouter();
const toast = useToast();
const { frase } = useFrases();

// ============== ESTADO ==============
const emitiendo = ref(false);
const cargando = ref(true);
const textoCarga = ref(frase('configuracion'));
const consultandoRuc = ref(false);

// Resultado tras emitir
const resultado = ref<any>(null);

// ============== CATÁLOGOS ==============
const transportistas = ref<Transportista[]>([]);
const vehiculos = ref<Vehiculo[]>([]);
const conductores = ref<Conductor[]>([]);
const direcciones = ref<DireccionTraslado[]>([]);
const clientes = ref<Cliente[]>([]);
const productos = ref<Producto[]>([]);

// ============== FORMULARIO ==============
const form = ref({
  // Identificación
  tipo_guia: '09', // 09=Remitente, 31=Transportista
  serie: 'T001',
  fecha_inicio_traslado: new Date().toISOString().split('T')[0],

  // Vinculación con venta (opcional)
  doc_relacionado_tipo: '',
  doc_relacionado_numero: '',

  // Motivo
  motivo_traslado: '01', // 01=Venta por defecto
  descripcion_motivo: 'Venta',

  // Modalidad
  modalidad_transporte: '02', // 02=Privada por defecto

  // Destinatario
  destinatario_modo: 'cliente' as 'cliente' | 'manual',
  cliente_id: '',
  destinatario_tipo_documento: '6',
  destinatario_numero_documento: '',
  destinatario_razon_social: '',

  // Origen
  partida_modo: 'guardada' as 'guardada' | 'manual',
  partida_direccion_id: '',
  partida_ubigeo: '',
  partida_direccion: '',
  partida_departamento: '',
  partida_provincia: '',
  partida_distrito: '',

  // Destino (al traslado)
  llegada_modo: 'manual' as 'guardada' | 'manual',
  llegada_direccion_id: '',
  llegada_ubigeo: '',
  llegada_direccion: '',

  // Transporte
  transportista_id: '',
  vehiculo_id: '',
  numero_placa: '',
  conductor_id: '',

  // Observaciones
  observaciones: '',
});

// Items a trasladar
const items = ref<DetalleGuia[]>([]);
const productoSeleccionado = ref('');
const cantidadNueva = ref(1);

// ============== CATÁLOGOS SUNAT ==============
const tiposGuia = [
  { valor: '09', texto: 'Guía de Remisión Remitente (GRR)' },
  { valor: '31', texto: 'Guía de Remisión Transportista (GRT)' },
];

const motivosTraslado = [
  { valor: '01', texto: '01 - Venta' },
  { valor: '02', texto: '02 - Compra' },
  { valor: '04', texto: '04 - Traslado entre establecimientos de la misma empresa' },
  { valor: '08', texto: '08 - Importación' },
  { valor: '09', texto: '09 - Exportación' },
  { valor: '13', texto: '13 - Otros' },
  { valor: '14', texto: '14 - Venta sujeta a confirmación' },
  { valor: '18', texto: '18 - Traslado para transformación' },
];

const modalidadesTransporte = [
  { valor: '01', texto: 'Pública (transportista)' },
  { valor: '02', texto: 'Privada (mi propio vehículo)' },
];

const tiposDocumento = [
  { valor: '6', texto: 'RUC' },
  { valor: '1', texto: 'DNI' },
];

// ============== COMPUTADOS ==============
// Vehículos según modalidad: si pública, los del transportista; si privada, los propios
const vehiculosFiltrados = computed(() => {
  if (form.value.modalidad_transporte === '01') {
    // Pública: vehículos del transportista seleccionado
    if (!form.value.transportista_id) return [];
    return vehiculos.value.filter((v) => v.transportista_id === form.value.transportista_id);
  } else {
    // Privada: solo vehículos propios
    return vehiculos.value.filter((v) => v.es_propio);
  }
});

const conductoresFiltrados = computed(() => {
  if (form.value.modalidad_transporte === '01') {
    if (!form.value.transportista_id) return [];
    return conductores.value.filter((c) => c.transportista_id === form.value.transportista_id);
  } else {
    // Privada: conductores internos (sin transportista)
    return conductores.value.filter((c) => !c.transportista_id);
  }
});

// Direcciones según tipo
const direccionesPartida = computed(() =>
  direcciones.value.filter((d) => d.tipo === 'PARTIDA' || d.tipo === 'AMBOS'),
);
const direccionesLlegada = computed(() =>
  direcciones.value.filter((d) => d.tipo === 'LLEGADA' || d.tipo === 'AMBOS'),
);

// Peso total auto-calculado
const pesoTotal = computed(() => {
  return items.value.reduce((suma, item) => {
    return suma + (Number(item.cantidad) * Number(item.peso_unitario || 0));
  }, 0);
});

// ¿Es modalidad pública?
const esPublica = computed(() => form.value.modalidad_transporte === '01');

// ¿Está completo para emitir?
const formularioValido = computed(() => {
  if (!form.value.serie || !form.value.motivo_traslado) return false;
  if (!form.value.destinatario_numero_documento || !form.value.destinatario_razon_social) return false;
  if (!form.value.partida_direccion || !form.value.partida_ubigeo) return false;
  if (!form.value.llegada_direccion || !form.value.llegada_ubigeo) return false;
  if (items.value.length === 0) return false;
  if (pesoTotal.value <= 0) return false;

  if (esPublica.value) {
    if (!form.value.transportista_id) return false;
  } else {
    if (!form.value.vehiculo_id && !form.value.numero_placa) return false;
    if (!form.value.conductor_id) return false;
  }

  return true;
});

// ============== CARGAR CATÁLOGOS ==============
async function cargarCatalogos() {
  cargando.value = true;
  try {
    const [trans, vehs, conds, dirs, clis, prods] = await Promise.all([
      transportistasService.listar(),
      vehiculosService.listar(),
      conductoresService.listar(),
      direccionesTrasladoService.listar(),
      clientesService.listar(),
      productosService.listar(),
    ]);
    transportistas.value = trans;
    vehiculos.value = vehs;
    conductores.value = conds;
    direcciones.value = dirs;
    clientes.value = clis;
    productos.value = prods;

    // Pre-cargar dirección predeterminada en origen
    const predet = direcciones.value.find((d) => d.es_predeterminada);
    if (predet) {
      form.value.partida_modo = 'guardada';
      form.value.partida_direccion_id = predet.id;
      cargarDireccionPartida(predet.id);
    }
  } catch {
    toast.error('No se pudieron cargar los catálogos');
  } finally {
    cargando.value = false;
  }
}

// ============== HANDLERS DE FORMULARIO ==============
// Al elegir cliente, autocompletar destinatario
function onClienteSeleccionado(clienteId: string) {
  const cliente = clientes.value.find((c) => c.id === clienteId);
  if (cliente) {
    form.value.destinatario_tipo_documento = cliente.tipo_documento || '6';
    form.value.destinatario_numero_documento = cliente.numero_documento;
    form.value.destinatario_razon_social = cliente.razon_social;
  }
}

// Consulta SUNAT/RENIEC para destinatario manual
async function consultarDestinatario() {
  if (!form.value.destinatario_numero_documento) {
    toast.advertencia('Ingresa el documento primero');
    return;
  }
  consultandoRuc.value = true;
  try {
    if (form.value.destinatario_tipo_documento === '6') {
      if (form.value.destinatario_numero_documento.length !== 11) {
        toast.advertencia('El RUC debe tener 11 dígitos');
        return;
      }
      const data = await sunatService.consultarRuc(form.value.destinatario_numero_documento);
      form.value.destinatario_razon_social = data.razon_social;
    } else {
      if (form.value.destinatario_numero_documento.length !== 8) {
        toast.advertencia('El DNI debe tener 8 dígitos');
        return;
      }
      const data = await sunatService.consultarDni(form.value.destinatario_numero_documento);
      form.value.destinatario_razon_social =
        `${data.nombres} ${data.apellido_paterno} ${data.apellido_materno}`.trim();
    }
    toast.exito(`Destinatario: ${form.value.destinatario_razon_social}`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo consultar');
  } finally {
    consultandoRuc.value = false;
  }
}

// Cargar dirección de partida desde catálogo
function cargarDireccionPartida(id: string) {
  const dir = direcciones.value.find((d) => d.id === id);
  if (!dir) return;
  form.value.partida_ubigeo = dir.ubigeo;
  form.value.partida_direccion = dir.direccion;
  form.value.partida_departamento = dir.departamento;
  form.value.partida_provincia = dir.provincia;
  form.value.partida_distrito = dir.distrito;
}

function cargarDireccionLlegada(id: string) {
  const dir = direcciones.value.find((d) => d.id === id);
  if (!dir) return;
  form.value.llegada_ubigeo = dir.ubigeo;
  form.value.llegada_direccion = dir.direccion;
}

// Cuando cambia el motivo, sugerir descripción
watch(() => form.value.motivo_traslado, (nuevo) => {
  const motivo = motivosTraslado.find((m) => m.valor === nuevo);
  if (motivo) {
    form.value.descripcion_motivo = motivo.texto.split(' - ')[1] || '';
  }
});

// Cuando cambia la modalidad, limpiar campos relacionados
watch(() => form.value.modalidad_transporte, () => {
  form.value.transportista_id = '';
  form.value.vehiculo_id = '';
  form.value.numero_placa = '';
  form.value.conductor_id = '';
});

// Cuando cambia el transportista, limpiar vehículo y conductor (filtros se actualizan)
watch(() => form.value.transportista_id, () => {
  form.value.vehiculo_id = '';
  form.value.numero_placa = '';
  form.value.conductor_id = '';
});

// Cuando cambia el vehículo, copiar la placa
watch(() => form.value.vehiculo_id, (id) => {
  if (id) {
    const v = vehiculos.value.find((veh) => veh.id === id);
    if (v) form.value.numero_placa = v.placa;
  } else {
    form.value.numero_placa = '';
  }
});

// ============== ITEMS ==============
function agregarItem() {
  if (!productoSeleccionado.value) {
    toast.advertencia('Selecciona un producto');
    return;
  }
  if (cantidadNueva.value <= 0) {
    toast.advertencia('La cantidad debe ser mayor a 0');
    return;
  }

  const producto = productos.value.find((p) => p.id === productoSeleccionado.value);
  if (!producto) return;

  // Si el producto ya existe en la lista, sumar cantidad
  const existente = items.value.find((it) => it.producto_id === producto.id);
  if (existente) {
    existente.cantidad = Number(existente.cantidad) + cantidadNueva.value;
    toast.info(`Cantidad actualizada: ${existente.cantidad}`);
  } else {
    const pesoUnitario = Number((producto as Producto & { peso_unitario?: number }).peso_unitario || 0);
    items.value.push({
      producto_id: producto.id,
      codigo_producto: producto.codigo_sunat || '',
      descripcion: producto.nombre,
      unidad_medida: producto.unidad_medida || 'NIU',
      cantidad: cantidadNueva.value,
      peso_unitario: pesoUnitario,
    });
  }

  productoSeleccionado.value = '';
  cantidadNueva.value = 1;
}

function quitarItem(index: number) {
  items.value.splice(index, 1);
}

// ============== EMITIR ==============
async function emitir() {
  if (!formularioValido.value) {
    toast.advertencia('Completa todos los campos requeridos');
    return;
  }

  emitiendo.value = true;
  try {
    const payload: CrearGuia = {
      tipo_guia: form.value.tipo_guia,
      serie: form.value.serie,
      fecha_inicio_traslado: form.value.fecha_inicio_traslado,
      doc_relacionado_tipo: form.value.doc_relacionado_tipo || undefined,
      doc_relacionado_numero: form.value.doc_relacionado_numero || undefined,
      motivo_traslado: form.value.motivo_traslado,
      descripcion_motivo: form.value.descripcion_motivo,
      modalidad_transporte: form.value.modalidad_transporte,
      peso_bruto_total: pesoTotal.value,
      unidad_peso: 'KGM',
      destinatario_tipo_documento: form.value.destinatario_tipo_documento,
      destinatario_numero_documento: form.value.destinatario_numero_documento,
      destinatario_razon_social: form.value.destinatario_razon_social,
      partida_ubigeo: form.value.partida_ubigeo,
      partida_direccion: form.value.partida_direccion,
      llegada_ubigeo: form.value.llegada_ubigeo,
      llegada_direccion: form.value.llegada_direccion,
      transportista_id: form.value.transportista_id || undefined,
      vehiculo_id: form.value.vehiculo_id || undefined,
      numero_placa: form.value.numero_placa || undefined,
      conductor_id: form.value.conductor_id || undefined,
      detalles: items.value,
      observaciones: form.value.observaciones || undefined,
    };

    const res = await guiasRemisionService.emitir(payload);
    resultado.value = res;

    if (res.estado === 'ACEPTADO') {
      toast.exito('Guía aceptada por SUNAT');
    } else {
      toast.error('Guía rechazada por SUNAT');
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo emitir');
  } finally {
    emitiendo.value = false;
  }
}

function nuevaGuia() {
  router.go(0); // Recargar la página
}

function irALista() {
  router.push('/guias-remision');
}

onMounted(cargarCatalogos);
</script>

<template>
  <div class="anim-entrada">
    <!-- Encabezado -->
    <div class="pagina-header">
      <button class="btn-volver" @click="irALista">
        <ArrowLeft :size="20" />
      </button>
      <div>
        <h1>Nueva guía de remisión</h1>
        <p class="pagina-subtitulo">
          Documento que acompaña el traslado físico de mercadería
        </p>
      </div>
    </div>

    <!-- Cargando catálogos -->
    <div v-if="cargando" class="cargando-completo">
      <BaseSpinner :texto="textoCarga" />
    </div>

    <!-- Resultado tras emitir -->
    <div v-else-if="resultado" class="resultado">
      <div class="resultado__icono" :class="{
        'resultado__icono--ok': resultado.estado === 'ACEPTADO',
        'resultado__icono--error': resultado.estado === 'RECHAZADO',
      }">
        <CheckCircle2 v-if="resultado.estado === 'ACEPTADO'" :size="48" />
        <AlertCircle v-else :size="48" />
      </div>
      <h2>{{ resultado.mensaje }}</h2>
      <p class="resultado__numero">{{ resultado.guia }}</p>
      <p v-if="resultado.sunat_descripcion" class="resultado__detalle">
        {{ resultado.sunat_descripcion }}
      </p>
      <p v-if="resultado.error_sunat" class="resultado__error">
        {{ resultado.error_sunat }}
      </p>
      <div class="resultado__acciones">
        <BaseButton variant="secondary" @click="irALista">Ir a lista de guías</BaseButton>
        <BaseButton @click="nuevaGuia">Emitir otra guía</BaseButton>
      </div>
    </div>

    <!-- Formulario -->
    <div v-else class="formulario">
      <!-- SECCIÓN 1: Identificación -->
      <section class="seccion">
        <h2 class="seccion__titulo">
          <FileText :size="18" /> Identificación
        </h2>
        <div class="grid-3">
          <BaseSelect v-model="form.tipo_guia" label="Tipo de guía" :opciones="tiposGuia" />
          <BaseInput v-model="form.serie" label="Serie" placeholder="T001" />
          <BaseInput
            v-model="form.fecha_inicio_traslado"
            label="Fecha inicio traslado"
            tipo="date"
          />
        </div>
      </section>

      <!-- SECCIÓN 2: Motivo -->
      <section class="seccion">
        <h2 class="seccion__titulo">
          <Truck :size="18" /> Motivo del traslado
        </h2>
        <div class="grid-2">
          <BaseSelect
            v-model="form.motivo_traslado"
            label="Motivo (Catálogo 20 SUNAT)"
            :opciones="motivosTraslado"
          />
          <BaseInput v-model="form.descripcion_motivo" label="Descripción" />
        </div>

        <!-- Documento relacionado opcional -->
        <details class="vinculo-venta">
          <summary>¿Vincular con una venta? (opcional)</summary>
          <div class="grid-2 mt-md">
            <BaseSelect
              v-model="form.doc_relacionado_tipo"
              label="Tipo"
              :opciones="[
                { valor: '', texto: 'Sin vincular' },
                { valor: '01', texto: 'Factura' },
                { valor: '03', texto: 'Boleta' },
              ]"
            />
            <BaseInput
              v-if="form.doc_relacionado_tipo"
              v-model="form.doc_relacionado_numero"
              label="Número (ej: F001-00000012)"
            />
          </div>
        </details>
      </section>

      <!-- SECCIÓN 3: Destinatario -->
      <section class="seccion">
        <h2 class="seccion__titulo">
          <User :size="18" /> Destinatario
        </h2>

        <!-- Tabs cliente / manual -->
        <div class="modo-tabs">
          <button
            class="modo-tab"
            :class="{ 'modo-tab--activo': form.destinatario_modo === 'cliente' }"
            @click="form.destinatario_modo = 'cliente'"
          >
            Cliente guardado
          </button>
          <button
            class="modo-tab"
            :class="{ 'modo-tab--activo': form.destinatario_modo === 'manual' }"
            @click="form.destinatario_modo = 'manual'"
          >
            Ingreso manual
          </button>
        </div>

        <!-- Modo: cliente -->
        <div v-if="form.destinatario_modo === 'cliente'" class="grid-1">
          <BaseSelect
            v-model="form.cliente_id"
            label="Selecciona un cliente"
            :opciones="[
              { valor: '', texto: '— Seleccionar —' },
              ...clientes.map((c) => ({
                valor: c.id,
                texto: `${c.numero_documento} - ${c.razon_social}`,
              })),
            ]"
            @update:modelValue="onClienteSeleccionado"
          />
          <div v-if="form.destinatario_razon_social" class="info-confirmacion">
            <strong>{{ form.destinatario_razon_social }}</strong>
            <span>{{ form.destinatario_numero_documento }}</span>
          </div>
        </div>

        <!-- Modo: manual -->
        <div v-else class="grid-2">
          <BaseSelect
            v-model="form.destinatario_tipo_documento"
            label="Tipo doc."
            :opciones="tiposDocumento"
          />
          <div class="campo-con-boton">
            <BaseInput
              v-model="form.destinatario_numero_documento"
              label="Número"
              :placeholder="form.destinatario_tipo_documento === '6' ? '20XXXXXXXXX' : '12345678'"
            />
            <button
              type="button"
              class="btn-consultar"
              :disabled="consultandoRuc"
              @click="consultarDestinatario"
            >
              <Search :size="16" :class="{ 'spin': consultandoRuc }" />
            </button>
          </div>
          <BaseInput
            class="span-2"
            v-model="form.destinatario_razon_social"
            label="Razón social"
          />
        </div>
      </section>

      <!-- SECCIÓN 4: Origen -->
      <section class="seccion">
        <h2 class="seccion__titulo">
          <ArrowUpFromLine :size="18" /> Origen (punto de partida)
        </h2>

        <div class="modo-tabs">
          <button
            class="modo-tab"
            :class="{ 'modo-tab--activo': form.partida_modo === 'guardada' }"
            @click="form.partida_modo = 'guardada'"
          >
            Dirección guardada
          </button>
          <button
            class="modo-tab"
            :class="{ 'modo-tab--activo': form.partida_modo === 'manual' }"
            @click="form.partida_modo = 'manual'"
          >
            Ingreso manual
          </button>
        </div>

        <div v-if="form.partida_modo === 'guardada'">
          <BaseSelect
            v-model="form.partida_direccion_id"
            label="Selecciona origen"
            :opciones="[
              { valor: '', texto: '— Seleccionar —' },
              ...direccionesPartida.map((d) => ({
                valor: d.id,
                texto: d.es_predeterminada ? `⭐ ${d.nombre}` : d.nombre,
              })),
            ]"
            @update:modelValue="cargarDireccionPartida"
          />
          <div v-if="form.partida_direccion" class="info-confirmacion">
            <strong>{{ form.partida_direccion }}</strong>
            <span>{{ form.partida_distrito }} - {{ form.partida_provincia }}</span>
          </div>
        </div>

        <div v-else class="grid-2">
          <BaseInput v-model="form.partida_ubigeo" label="Ubigeo (6 dígitos)" placeholder="150101" />
          <BaseInput class="span-2" v-model="form.partida_direccion" label="Dirección completa" />
        </div>
      </section>

      <!-- SECCIÓN 5: Destino -->
      <section class="seccion">
        <h2 class="seccion__titulo">
          <ArrowDownToLine :size="18" /> Destino (punto de llegada)
        </h2>

        <div class="modo-tabs">
          <button
            class="modo-tab"
            :class="{ 'modo-tab--activo': form.llegada_modo === 'guardada' }"
            @click="form.llegada_modo = 'guardada'"
          >
            Dirección guardada
          </button>
          <button
            class="modo-tab"
            :class="{ 'modo-tab--activo': form.llegada_modo === 'manual' }"
            @click="form.llegada_modo = 'manual'"
          >
            Ingreso manual
          </button>
        </div>

        <div v-if="form.llegada_modo === 'guardada'">
          <BaseSelect
            v-model="form.llegada_direccion_id"
            label="Selecciona destino"
            :opciones="[
              { valor: '', texto: '— Seleccionar —' },
              ...direccionesLlegada.map((d) => ({ valor: d.id, texto: d.nombre })),
            ]"
            @update:modelValue="cargarDireccionLlegada"
          />
          <div v-if="form.llegada_direccion" class="info-confirmacion">
            <strong>{{ form.llegada_direccion }}</strong>
          </div>
        </div>

        <div v-else class="grid-2">
          <BaseInput v-model="form.llegada_ubigeo" label="Ubigeo (6 dígitos)" placeholder="040101" />
          <BaseInput class="span-2" v-model="form.llegada_direccion" label="Dirección completa" />
        </div>
      </section>

      <!-- SECCIÓN 6: Transporte -->
      <section class="seccion">
        <h2 class="seccion__titulo">
          <Car :size="18" /> Transporte
        </h2>

        <BaseSelect
          v-model="form.modalidad_transporte"
          label="Modalidad"
          :opciones="modalidadesTransporte"
        />

        <!-- Modalidad PÚBLICA: transportista -->
        <div v-if="esPublica" class="grid-1 mt-md">
          <BaseSelect
            v-model="form.transportista_id"
            label="Transportista"
            :opciones="[
              { valor: '', texto: '— Seleccionar —' },
              ...transportistas.map((t) => ({
                valor: t.id,
                texto: `${t.numero_documento} - ${t.razon_social}`,
              })),
            ]"
          />
        </div>

        <!-- Vehículo y conductor (ambas modalidades) -->
        <div class="grid-2 mt-md">
          <BaseSelect
            v-model="form.vehiculo_id"
            :label="esPublica ? 'Vehículo del transportista' : 'Mi vehículo'"
            :opciones="[
              { valor: '', texto: '— Seleccionar —' },
              ...vehiculosFiltrados.map((v) => ({
                valor: v.id,
                texto: `${v.placa}${v.marca ? ' - ' + v.marca : ''}`,
              })),
            ]"
          />
          <BaseSelect
            v-model="form.conductor_id"
            label="Conductor"
            :opciones="[
              { valor: '', texto: '— Seleccionar —' },
              ...conductoresFiltrados.map((c) => ({
                valor: c.id,
                texto: `${c.numero_documento} - ${c.nombres} ${c.apellidos || ''}`,
              })),
            ]"
          />
        </div>
      </section>

      <!-- SECCIÓN 7: Productos a trasladar -->
      <section class="seccion">
        <h2 class="seccion__titulo">
          <Package :size="18" /> Productos a trasladar
        </h2>

        <!-- Agregar producto -->
        <div class="agregar-producto">
          <BaseSelect
            v-model="productoSeleccionado"
            label="Producto"
            :opciones="[
              { valor: '', texto: '— Seleccionar —' },
              ...productos.map((p) => ({
                valor: p.id,
                texto: p.nombre,
              })),
            ]"
          />
          <input
            v-model.number="cantidadNueva"
            type="number"
            min="0.001"
            step="0.001"
            class="input-cantidad"
            />
          <button class="btn-agregar" @click="agregarItem">
            <Plus :size="16" /> Agregar
          </button>
        </div>

        <!-- Lista de items -->
        <div v-if="items.length > 0" class="items-tabla">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Unidad</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Peso unit. (KG)</th>
                <th class="text-right">Peso total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in items" :key="i">
                <td>{{ i + 1 }}</td>
                <td>{{ item.descripcion }}</td>
                <td>{{ item.unidad_medida }}</td>
                <td class="text-right">
                  <input
                    v-model.number="item.cantidad"
                    type="number"
                    class="input-mini"
                    min="0.001"
                  />
                </td>
                <td class="text-right">
                  <input
                    v-model.number="item.peso_unitario"
                    type="number"
                    class="input-mini"
                    min="0"
                    step="0.001"
                  />
                </td>
                <td class="text-right">
                  <strong>{{ (Number(item.cantidad) * Number(item.peso_unitario || 0)).toFixed(3) }}</strong>
                </td>
                <td>
                  <button class="btn-quitar" @click="quitarItem(i)">
                    <Trash2 :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="items-vacio">
          Sin productos agregados todavía. Agrega al menos uno arriba.
        </div>

        <!-- Peso total -->
        <div class="peso-total">
          <Weight :size="20" />
          <span>Peso bruto total:</span>
          <strong>{{ pesoTotal.toFixed(3) }} KG</strong>
        </div>
      </section>

      <!-- SECCIÓN 8: Observaciones -->
      <section class="seccion">
        <h2 class="seccion__titulo">Observaciones (opcional)</h2>
        <textarea
          v-model="form.observaciones"
          class="textarea"
          rows="3"
          placeholder="Información adicional para la guía"
        ></textarea>
      </section>

      <!-- BOTÓN EMITIR -->
      <div class="acciones-finales">
        <BaseButton variant="secondary" @click="irALista">Cancelar</BaseButton>
        <BaseButton
          :cargando="emitiendo"
          :disabled="!formularioValido"
          @click="emitir"
        >
          <Send :size="18" /> Emitir guía
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Encabezado */
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
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; }

/* Cargando */
.cargando-completo {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

/* Resultado */
.resultado {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 60px 40px;
  text-align: center;
  max-width: 500px;
  margin: 40px auto;
  border: 1px solid var(--border);
}
.resultado__icono {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-md);
}
.resultado__icono--ok { background: var(--success-soft); color: var(--success); }
.resultado__icono--error { background: var(--danger-soft); color: var(--danger); }
.resultado h2 { margin-bottom: 4px; }
.resultado__numero {
  font-family: monospace;
  font-size: var(--text-xl);
  color: var(--accent);
  margin: var(--space-md) 0;
}
.resultado__detalle, .resultado__error {
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}
.resultado__error { color: var(--danger); }
.resultado__acciones {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  margin-top: var(--space-lg);
}

/* Formulario */
.formulario {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.seccion {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
}
.seccion__titulo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-base);
  color: var(--accent);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border);
}

/* Grids */
.grid-1 { display: grid; grid-template-columns: 1fr; gap: var(--space-md); }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); align-items: start; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md); align-items: start; }
.span-2 { grid-column: span 2; }
.mt-md { margin-top: var(--space-md); }

/* Modo tabs (cliente / manual) */
.modo-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-surface-2);
  padding: 4px;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}
.modo-tab {
  flex: 1;
  background: none;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}
.modo-tab--activo {
  background: var(--bg-surface);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

/* Info de confirmación */
.info-confirmacion {
  display: flex;
  flex-direction: column;
  background: var(--accent-soft);
  border-left: 3px solid var(--accent);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  margin-top: var(--space-sm);
}
.info-confirmacion strong { color: var(--text-primary); }
.info-confirmacion span { font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; }

/* Campo con botón consultar */
.campo-con-boton {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-end;
}
.campo-con-boton > :first-child { flex: 1; }
.btn-consultar {
  background: var(--accent);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-consultar:hover:not(:disabled) { filter: brightness(0.92); }
.btn-consultar:disabled { opacity: 0.6; cursor: wait; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* Vínculo con venta */
.vinculo-venta {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--border);
}
.vinculo-venta summary {
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

/* Agregar producto */
.agregar-producto {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: var(--space-md);
  align-items: flex-end;
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-md);
  border-bottom: 1px dashed var(--border);
}
.btn-agregar {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-agregar:hover { filter: brightness(0.92); }

/* Tabla items */
.items-tabla {
  background: var(--bg-surface-2);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--space-md);
}
.items-tabla table {
  width: 100%;
  border-collapse: collapse;
}
.items-tabla th {
  background: var(--bg-surface);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  text-transform: uppercase;
}
.items-tabla td {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  border-top: 1px solid var(--border);
}
.text-right { text-align: right; }
.input-mini {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  font-size: var(--text-sm);
  text-align: right;
}
.btn-quitar {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  padding: 4px;
}
.btn-quitar:hover { background: var(--danger-soft); border-radius: var(--radius-sm); }

.items-vacio {
  padding: var(--space-lg);
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
  background: var(--bg-surface-2);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

/* Peso total */
.peso-total {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--accent-soft);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
}
.peso-total strong {
  margin-left: auto;
  font-size: var(--text-lg);
  color: var(--accent);
  font-family: monospace;
}

/* Textarea */
.textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface-2);
  font-family: inherit;
  font-size: var(--text-sm);
  resize: vertical;
}
.textarea:focus {
  outline: none;
  border-color: var(--accent);
}

/* Acciones finales */
.acciones-finales {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md) 0;
}

@media (max-width: 900px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .span-2 { grid-column: span 1; }
  .agregar-producto { grid-template-columns: 1fr; }
}
.input-cantidad {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface-2);
  font-size: var(--text-sm);
  height: 40px;
}
</style>