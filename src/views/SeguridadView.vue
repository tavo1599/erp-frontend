<!-- src/views/SeguridadView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Shield, KeyRound, FileCheck2, AlertTriangle } from 'lucide-vue-next';
import { empresaService, type Empresa } from '../services/empresa.service';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSpinner from '../components/ui/BaseSpinner.vue';import { useFrases } from '../composables/useFrases';

const { frase } = useFrases();
const textoCarga = ref(frase('seguridad'));

const toast = useToast();
const { confirmar } = useConfirm();

const empresa = ref<Empresa | null>(null);
const cargando = ref(true);

// Credenciales SOL
const solUsuario = ref('');
const solClave = ref('');
const guardandoSol = ref(false);
const mostrarClaveSol = ref(false);

// Certificado
const archivoCertificado = ref<File | null>(null);
const passwordCert = ref('');
const subiendoCert = ref(false);

// Ambiente
const guardandoAmbiente = ref(false);

async function cargar() {
  cargando.value = true;
  try {
    empresa.value = await empresaService.obtener();
    solUsuario.value = empresa.value.sol_usuario || '';
    // No precargamos la clave por seguridad
  } catch {
    toast.error('No se pudieron cargar los datos');
  } finally {
    cargando.value = false;
  }
}

async function guardarCredencialesSol() {
  if (!solUsuario.value || !solClave.value) {
    toast.advertencia('Ingresa el usuario y la clave SOL');
    return;
  }
  guardandoSol.value = true;
  try {
    await empresaService.actualizarCredencialesSol(solUsuario.value, solClave.value);
    toast.exito('Credenciales SOL actualizadas');
    solClave.value = ''; // limpiar la clave del formulario
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al actualizar credenciales');
  } finally {
    guardandoSol.value = false;
  }
}

function archivoSeleccionado(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    archivoCertificado.value = input.files[0];
  }
}

async function subirCertificado() {
  if (!archivoCertificado.value) {
    toast.advertencia('Selecciona el archivo .pfx');
    return;
  }
  if (!passwordCert.value) {
    toast.advertencia('Ingresa la contraseña del certificado');
    return;
  }

  const ok = await confirmar({
    titulo: '¿Reemplazar el certificado?',
    mensaje: 'Esto reemplazará el certificado actual de la empresa. Asegúrate de que el nuevo certificado contiene el RUC correcto. ¿Continuar?',
    textoConfirmar: 'Reemplazar',
    peligro: true,
  });
  if (!ok) return;

  subiendoCert.value = true;
  try {
    await empresaService.actualizarCertificado(archivoCertificado.value, passwordCert.value);
    toast.exito('Certificado actualizado correctamente');
    archivoCertificado.value = null;
    passwordCert.value = '';
    // limpiar el input file
    const input = document.getElementById('cert-input') as HTMLInputElement;
    if (input) input.value = '';
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al subir el certificado');
  } finally {
    subiendoCert.value = false;
  }
}

async function cambiarAmbiente(nuevo: string) {
  if (!empresa.value) return;
  if (nuevo === empresa.value.ambiente) return;

  if (nuevo === 'produccion') {
    const ok = await confirmar({
      titulo: '¿Activar ambiente de PRODUCCIÓN?',
      mensaje: 'En producción, los comprobantes que emitas tienen validez tributaria REAL ante SUNAT y no se pueden borrar (solo anular con baja o nota de crédito). Asegúrate de tener el certificado digital real y las credenciales SOL correctas. ¿Continuar?',
      textoConfirmar: 'Sí, activar producción',
      peligro: true,
    });
    if (!ok) return;
  }

  guardandoAmbiente.value = true;
  try {
    await empresaService.actualizar({ ambiente: nuevo });
    empresa.value.ambiente = nuevo;
    toast.exito(`Ambiente cambiado a ${nuevo === 'produccion' ? 'PRODUCCIÓN' : 'pruebas'}`);
  } catch (e: any) {
    toast.error('No se pudo cambiar el ambiente');
  } finally {
    guardandoAmbiente.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="seg-header">
      <div class="seg-header__icono"><Shield :size="24" /></div>
      <div>
        <h1>Seguridad SUNAT</h1>
        <p class="pagina-subtitulo">Certificado digital, credenciales y ambiente de emisión</p>
      </div>
    </div>

    <!-- Aviso de seguridad -->
    <div class="aviso">
      <AlertTriangle :size="20" class="aviso__icono" />
      <div>
        <strong>Zona sensible.</strong> Los datos de esta sección permiten emitir comprobantes
        en nombre del negocio ante SUNAT. Solo el administrador de la empresa debe gestionarlos.
      </div>
    </div>

    <BaseSpinner v-if="cargando" :texto="textoCarga" />

    <div v-else-if="empresa" class="seg-form">
      <!-- 1. AMBIENTE -->
      <div class="seg-panel">
        <div class="seg-panel__head">
          <h3 class="seg-panel__titulo">Ambiente de emisión</h3>
          <span class="estado-actual" :class="empresa.ambiente === 'produccion' ? 'estado-actual--prod' : 'estado-actual--beta'">
            {{ empresa.ambiente === 'produccion' ? 'PRODUCCIÓN' : 'Pruebas (beta)' }}
          </span>
        </div>
        <p class="seg-panel__desc">
          En <b>pruebas</b> los comprobantes no tienen validez tributaria. En <b>producción</b> sí.
        </p>
        <div class="amb-selector">
          <button
            class="amb-opcion"
            :class="{ 'amb-opcion--activa': empresa.ambiente !== 'produccion' }"
            :disabled="guardandoAmbiente"
            @click="cambiarAmbiente('beta')"
          >
            <span class="amb-opcion__nombre">Pruebas (beta)</span>
            <span class="amb-opcion__desc">Para probar sin afectar tu información tributaria real</span>
          </button>
          <button
            class="amb-opcion"
            :class="{ 'amb-opcion--activa': empresa.ambiente === 'produccion', 'amb-opcion--prod': empresa.ambiente === 'produccion' }"
            :disabled="guardandoAmbiente"
            @click="cambiarAmbiente('produccion')"
          >
            <span class="amb-opcion__nombre">Producción</span>
            <span class="amb-opcion__desc">Comprobantes REALES con validez ante SUNAT</span>
          </button>
        </div>
      </div>

      <!-- 2. CERTIFICADO -->
      <div class="seg-panel">
        <div class="seg-panel__head">
          <FileCheck2 :size="20" class="seg-panel__icono" />
          <h3 class="seg-panel__titulo">Certificado digital (.pfx)</h3>
        </div>
        <p class="seg-panel__desc">
          Sube un nuevo certificado para reemplazar el actual. El RUC del certificado debe coincidir con el de la empresa.
        </p>
        <div class="cert-form">
          <input
            id="cert-input"
            type="file"
            accept=".pfx,.p12"
            class="cert-input"
            @change="archivoSeleccionado"
          />
          <BaseInput
            v-model="passwordCert"
            label="Contraseña del certificado"
            tipo="password"
            placeholder="••••••••"
          />
          <BaseButton :cargando="subiendoCert" @click="subirCertificado">
            <FileCheck2 :size="18" /> Reemplazar certificado
          </BaseButton>
        </div>
      </div>

      <!-- 3. CREDENCIALES SOL -->
      <div class="seg-panel">
        <div class="seg-panel__head">
          <KeyRound :size="20" class="seg-panel__icono" />
          <h3 class="seg-panel__titulo">Credenciales SOL</h3>
        </div>
        <p class="seg-panel__desc">
          Las credenciales que usa SUNAT para validar al emisor. Por seguridad, la clave nunca se muestra.
        </p>
        <div class="form-grid">
          <BaseInput v-model="solUsuario" label="Usuario SOL" placeholder="MODDATOS" />
          <BaseInput
            v-model="solClave"
            label="Nueva clave SOL"
            :tipo="mostrarClaveSol ? 'text' : 'password'"
            placeholder="Solo si vas a cambiarla"
          />
        </div>
        <div class="acciones">
          <BaseButton variant="secondary" @click="mostrarClaveSol = !mostrarClaveSol">
            {{ mostrarClaveSol ? 'Ocultar' : 'Mostrar' }} clave
          </BaseButton>
          <BaseButton :cargando="guardandoSol" @click="guardarCredencialesSol">
            Guardar credenciales
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seg-header {
  display: flex; align-items: center; gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
.seg-header__icono {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent);
  border-radius: var(--radius-md);
}
.pagina-subtitulo { color: var(--text-secondary); margin-top: 2px; }
.aviso {
  display: flex; gap: var(--space-md); align-items: flex-start;
  background: var(--warning-soft); color: var(--text-primary);
  padding: var(--space-md) var(--space-lg);
  border-left: 4px solid var(--warning);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  font-size: var(--text-sm);
  max-width: 900px;
}
.aviso__icono { color: var(--warning); flex-shrink: 0; margin-top: 2px; }
.seg-form { display: flex; flex-direction: column; gap: var(--space-md); max-width: 900px; }
.seg-panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.seg-panel__head {
  display: flex; align-items: center; gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}
.seg-panel__titulo { font-size: var(--text-base); margin: 0; }
.seg-panel__icono { color: var(--accent); }
.seg-panel__desc { font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-md); }
.estado-actual {
  margin-left: auto; padding: 4px 12px; border-radius: var(--radius-sm);
  font-size: var(--text-xs); font-weight: 700;
}
.estado-actual--beta { background: var(--success-soft); color: var(--success); }
.estado-actual--prod { background: var(--danger-soft); color: var(--danger); }
.amb-selector { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
.amb-opcion {
  display: flex; flex-direction: column; gap: 4px;
  padding: var(--space-md);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  text-align: left; transition: var(--transition);
}
.amb-opcion:hover:not(:disabled) { border-color: var(--accent); }
.amb-opcion--activa { border-color: var(--accent); background: var(--accent-soft); }
.amb-opcion--prod.amb-opcion--activa { border-color: var(--danger); background: var(--danger-soft); }
.amb-opcion__nombre { font-weight: 700; font-size: var(--text-base); }
.amb-opcion__desc { font-size: var(--text-xs); color: var(--text-secondary); }
.cert-form { display: flex; flex-direction: column; gap: var(--space-md); }
.cert-input {
  padding: var(--space-sm);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface-2);
  font-size: var(--text-sm);
}
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-md); }
.acciones { display: flex; gap: var(--space-sm); justify-content: flex-end; }
@media (max-width: 700px) {
  .amb-selector, .form-grid { grid-template-columns: 1fr; }
}
</style>