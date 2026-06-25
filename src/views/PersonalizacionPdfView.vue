<!-- src/views/PersonalizacionPdfView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Palette, Image, Trash2, Upload, FileText, CreditCard,
  Save, Eye, Check,RefreshCw,
} from 'lucide-vue-next';
import { empresaService } from '../services/empresa.service';
import { useToast } from '../composables/useToast';
import { useFrases } from '../composables/useFrases';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseSpinner from '../components/ui/BaseSpinner.vue';
import { watch } from 'vue';



const toast = useToast();
const { frase } = useFrases();

const cargando = ref(true);
const guardando = ref(false);
const subiendoLogo = ref(false);
const textoCarga = ref(frase('configuracion'));

// Estado del formulario
const empresa = ref<any>(null);
const colorPdf = ref('#c2643f');
const frasePiePdf = ref('');
const cuentasBancarias = ref('');
const logoUrl = ref<string | null>(null);

// Input file
const inputLogo = ref<HTMLInputElement | null>(null);

// Vista previa PDF
const pdfUrl = ref<string | null>(null);
const generandoPreview = ref(false);
let timeoutPreview: any = null;

// Genera la vista previa con un debounce de 1 segundo
function programarPreview() {
  if (timeoutPreview) clearTimeout(timeoutPreview);
  timeoutPreview = setTimeout(generarPreview, 1000);
}

watch([colorPdf, frasePiePdf, cuentasBancarias], () => {
  programarPreview();
});

watch(logoUrl, () => {
  programarPreview();
});

async function generarPreview() {
  generandoPreview.value = true;
  try {
    // Liberar URL anterior si existía
    if (pdfUrl.value) {
      URL.revokeObjectURL(pdfUrl.value);
    }
    pdfUrl.value = await empresaService.previewPdf({
      color_pdf: colorPdf.value,
      frase_pie_pdf: frasePiePdf.value || undefined,
      cuentas_bancarias: cuentasBancarias.value || undefined,
    });
  } catch (e: any) {
    toast.error('No se pudo generar la vista previa');
  } finally {
    generandoPreview.value = false;
  }
}

// Colores sugeridos
const coloresSugeridos = [
  { nombre: 'Naranja', hex: '#c2643f' },
  { nombre: 'Azul', hex: '#1e88e5' },
  { nombre: 'Verde', hex: '#43a047' },
  { nombre: 'Rojo', hex: '#e53935' },
  { nombre: 'Morado', hex: '#8e24aa' },
  { nombre: 'Negro', hex: '#212121' },
  { nombre: 'Turquesa', hex: '#00897b' },
  { nombre: 'Marrón', hex: '#6d4c41' },
];

// URL completa del logo para el preview
const logoUrlCompleta = computed(() => {
  if (!logoUrl.value) return null;
  // El backend devuelve algo como /uploads/logos/uuid.png
  // Le concatenamos la URL base del backend
  return `http://localhost:3000${logoUrl.value}?t=${Date.now()}`;
});

async function cargar() {
  cargando.value = true;
  try {
    const data = await empresaService.miEmpresa();
    empresa.value = data;
    colorPdf.value = data.color_pdf || '#c2643f';
    frasePiePdf.value = data.frase_pie_pdf || '';
    cuentasBancarias.value = data.cuentas_bancarias || '';
    logoUrl.value = data.logo_url;
  } catch {
    toast.error('No se pudo cargar la empresa');
  } finally {
    cargando.value = false;
  }
}

function abrirSelectorArchivo() {
  inputLogo.value?.click();
}

async function onArchivoSeleccionado(event: Event) {
  const input = event.target as HTMLInputElement;
  const archivo = input.files?.[0];
  if (!archivo) return;

  // Validaciones del lado cliente
  if (!archivo.type.match(/^image\/(png|jpg|jpeg)$/)) {
    toast.error('Solo se permiten imágenes PNG o JPG');
    return;
  }
  if (archivo.size > 2 * 1024 * 1024) {
    toast.error('La imagen no puede pesar más de 2MB');
    return;
  }

  subiendoLogo.value = true;
  try {
    const respuesta = await empresaService.subirLogo(archivo);
    logoUrl.value = respuesta.logo_url;
    toast.exito('Logo subido correctamente');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo subir el logo');
  } finally {
    subiendoLogo.value = false;
    if (inputLogo.value) inputLogo.value.value = '';
  }
}

async function eliminarLogo() {
  if (!confirm('¿Eliminar el logo actual?')) return;
  try {
    await empresaService.eliminarLogo();
    logoUrl.value = null;
    toast.exito('Logo eliminado');
  } catch {
    toast.error('No se pudo eliminar el logo');
  }
}

async function guardar() {
  guardando.value = true;
  try {
    await empresaService.actualizarPersonalizacion({
      color_pdf: colorPdf.value,
      frase_pie_pdf: frasePiePdf.value || undefined,
      cuentas_bancarias: cuentasBancarias.value || undefined,
    });
    toast.exito('Personalización guardada');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo guardar');
  } finally {
    guardando.value = false;
  }
}

function elegirColorSugerido(hex: string) {
  colorPdf.value = hex;
}

onMounted(async () => {
  await cargar();
  generarPreview(); // Genera la primera vista previa al cargar
});
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1><Palette :size="22" /> Personalización del PDF</h1>
        <p class="pagina-subtitulo">
          Personaliza el logo, color y mensajes de tus comprobantes electrónicos
        </p>
      </div>
      <BaseButton :cargando="guardando" @click="guardar">
        <Save :size="18" /> Guardar cambios
      </BaseButton>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" class="cargando-completo">
      <BaseSpinner :texto="textoCarga" />
    </div>

    <div v-else class="contenido-grid">
      <!-- COLUMNA IZQUIERDA: configuración -->
      <div class="columna-config">
        <!-- LOGO -->
        <section class="seccion">
          <h2 class="seccion__titulo">
            <Image :size="18" /> Logo de la empresa
          </h2>

          <div v-if="logoUrlCompleta" class="logo-preview">
            <img :src="logoUrlCompleta" alt="Logo" />
            <div class="logo-acciones">
              <button class="btn-icono" @click="abrirSelectorArchivo" :disabled="subiendoLogo">
                <Upload :size="16" /> Reemplazar
              </button>
              <button class="btn-icono btn-icono--danger" @click="eliminarLogo">
                <Trash2 :size="16" /> Eliminar
              </button>
            </div>
          </div>

          <div v-else class="logo-vacio" @click="abrirSelectorArchivo">
            <Upload :size="32" />
            <p>Click aquí para subir tu logo</p>
            <small>PNG o JPG. Máximo 2 MB. Recomendado: 200x200px</small>
          </div>

          <input
            ref="inputLogo"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            @change="onArchivoSeleccionado"
            style="display: none"
          />
        </section>

        <!-- COLOR -->
        <section class="seccion">
          <h2 class="seccion__titulo">
            <Palette :size="18" /> Color principal
          </h2>
          <p class="seccion__descripcion">
            Se aplica en títulos, tabla de productos y total del comprobante.
          </p>

          <div class="color-picker">
            <input
              type="color"
              v-model="colorPdf"
              class="color-picker__input"
            />
            <BaseInput
              v-model="colorPdf"
              label="Código hexadecimal"
              placeholder="#c2643f"
            />
          </div>

          <p class="colores-sugeridos__label">O elige uno sugerido:</p>
          <div class="colores-sugeridos">
            <button
              v-for="color in coloresSugeridos"
              :key="color.hex"
              :title="color.nombre"
              class="color-circulo"
              :class="{ 'color-circulo--activo': colorPdf === color.hex }"
              :style="{ background: color.hex }"
              @click="elegirColorSugerido(color.hex)"
            >
              <Check v-if="colorPdf === color.hex" :size="16" :color="'white'" />
            </button>
          </div>
        </section>

        <!-- FRASE AL PIE -->
        <section class="seccion">
          <h2 class="seccion__titulo">
            <FileText :size="18" /> Frase al pie
          </h2>
          <p class="seccion__descripcion">
            Aparecerá centrada antes del QR. Ej: "Gracias por su preferencia".
          </p>
          <BaseInput
            v-model="frasePiePdf"
            label="Frase (opcional)"
            placeholder="Gracias por su preferencia. Contacto: 999 999 999"
          />
        </section>

        <!-- CUENTAS BANCARIAS -->
        <section class="seccion">
          <h2 class="seccion__titulo">
            <CreditCard :size="18" /> Cuentas bancarias
          </h2>
          <p class="seccion__descripcion">
            Texto libre. Aparecerá en una sección destacada al pie del PDF.
          </p>
          <textarea
            v-model="cuentasBancarias"
            class="textarea"
            rows="5"
            placeholder="BCP Soles: 194-1234567890-0-00
Interbank Soles: 003-3001234567890
Yape: 999 999 999
CCI: 00219400123456789000"
          ></textarea>
        </section>
      </div>

      <!-- COLUMNA DERECHA: vista previa -->
      <!-- COLUMNA DERECHA: vista previa REAL del PDF -->
<div class="columna-preview">
  <div class="preview-pegajoso">
    <div class="preview-header">
      <h3 class="preview-titulo">
        <Eye :size="16" /> Vista previa del PDF
      </h3>
      <button
        class="btn-actualizar"
        @click="generarPreview"
        :disabled="generandoPreview"
      >
        <RefreshCw :size="14" :class="{ 'spin': generandoPreview }" />
        {{ generandoPreview ? 'Generando...' : 'Actualizar' }}
      </button>
    </div>

    <div class="preview-pdf-container">
      <div v-if="generandoPreview && !pdfUrl" class="preview-cargando">
        <BaseSpinner texto="Generando vista previa..." />
      </div>
      <iframe
        v-else-if="pdfUrl"
        :src="pdfUrl"
        class="preview-iframe"
        title="Vista previa PDF"
      ></iframe>
      <div v-else class="preview-vacio">
        <FileText :size="48" />
        <p>Haz click en "Actualizar" para generar la vista previa</p>
      </div>
    </div>

    <p class="preview-nota">
      💡 El PDF muestra datos de ejemplo. Al emitir una factura real, los datos
      serán los del cliente y productos seleccionados.
    </p>
  </div>
</div>
    </div>
  </div>
</template>

<style scoped>
.pagina-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
  gap: var(--space-md);
}
.pagina-header h1 { display: flex; align-items: center; gap: var(--space-sm); }
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; }

.cargando-completo {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

/* Grid de 2 columnas */
.contenido-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}
.columna-config {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Secciones */
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
.seccion__descripcion {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

/* Logo */
.logo-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface-2);
  border-radius: var(--radius-md);
}
.logo-preview img {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
}
.logo-acciones {
  display: flex;
  gap: var(--space-sm);
}
.btn-icono {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
}
.btn-icono:hover { color: var(--accent); }
.btn-icono--danger:hover { color: var(--danger); }

.logo-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl);
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: var(--transition);
}
.logo-vacio:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.logo-vacio p { font-weight: 600; margin: 0; }
.logo-vacio small { font-size: var(--text-xs); }

/* Color picker */
.color-picker {
  display: flex;
  gap: var(--space-md);
  align-items: flex-end;
  margin-bottom: var(--space-md);
}
.color-picker__input {
  width: 60px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  background: none;
  padding: 2px;
}
.colores-sugeridos__label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
}
.colores-sugeridos {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.color-circulo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}
.color-circulo:hover { transform: scale(1.1); }
.color-circulo--activo {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px white, 0 0 0 4px var(--text-primary);
}

/* Textarea */
.textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface-2);
  font-family: monospace;
  font-size: var(--text-sm);
  resize: vertical;
}
.textarea:focus {
  outline: none;
  border-color: var(--accent);
}

/* Vista previa */
.columna-preview {
  position: relative;
}
.preview-pegajoso {
  position: sticky;
  top: var(--space-md);
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}
.preview-titulo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}
.btn-actualizar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--accent);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}
.btn-actualizar:hover:not(:disabled) { filter: brightness(0.92); }
.btn-actualizar:disabled { opacity: 0.6; cursor: wait; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.preview-pdf-container {
  background: #525659;
  border-radius: var(--radius-md);
  overflow: hidden;
  height: 700px;
  position: relative;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}
.preview-cargando, .preview-vacio {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  color: white;
  text-align: center;
  padding: var(--space-lg);
}
.preview-vacio p { font-size: var(--text-sm); }

.preview-nota {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: center;
  margin-top: var(--space-sm);
  font-style: italic;
}

@media (max-width: 1100px) {
  .contenido-grid { grid-template-columns: 1fr; }
  .preview-pegajoso { position: static; }
  .preview-pdf-container { height: 500px; }
}
.preview-pdf {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  color: #333;
  font-size: 11px;
  box-shadow: var(--shadow-md);
}
.preview-encabezado {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-md);
  align-items: flex-start;
}
.preview-logo img {
  max-width: 70px;
  max-height: 70px;
  object-fit: contain;
}
.preview-datos {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.preview-datos strong { font-size: 13px; }
.preview-datos small { color: #666; font-size: 10px; }
.preview-recuadro {
  border: 1.5px solid;
  padding: 8px 12px;
  text-align: center;
  font-weight: 700;
  font-size: 10px;
  border-radius: 4px;
}
.preview-recuadro div { margin: 2px 0; }

.preview-pdf hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: var(--space-md) 0;
}
.preview-cliente {
  font-size: 10px;
  color: #555;
  margin-bottom: var(--space-md);
}
.preview-tabla {
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: var(--space-sm);
}
.preview-tabla__head, .preview-tabla__row {
  display: grid;
  grid-template-columns: 30px 1fr 50px 80px;
  gap: 4px;
  padding: 6px 8px;
  font-size: 10px;
}
.preview-tabla__head {
  color: white;
  font-weight: 700;
}
.preview-tabla__row {
  border-top: 1px solid #e0e0e0;
}
.preview-total {
  text-align: right;
  margin: var(--space-md) 0;
  font-size: 13px;
}
.preview-cuentas {
  background: #f5f5f5;
  padding: var(--space-sm);
  border-radius: 4px;
  margin: var(--space-md) 0;
}
.preview-cuentas strong {
  display: block;
  font-size: 10px;
  margin-bottom: 4px;
}
.preview-cuentas pre {
  font-family: inherit;
  font-size: 9px;
  margin: 0;
  white-space: pre-wrap;
}
.preview-frase {
  text-align: center;
  font-style: italic;
  font-size: 10px;
  margin: var(--space-md) 0;
}
.preview-qr {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid #e0e0e0;
}
.qr-placeholder {
  width: 60px;
  height: 60px;
  background: repeating-linear-gradient(
    45deg, #ddd, #ddd 4px, #fff 4px, #fff 8px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  border: 1px solid #ccc;
  flex-shrink: 0;
}
.preview-qr small { color: #666; font-size: 9px; }
.preview-nota {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: center;
  margin-top: var(--space-sm);
  font-style: italic;
}

@media (max-width: 1100px) {
  .contenido-grid { grid-template-columns: 1fr; }
  .preview-pegajoso { position: static; }
}
</style>