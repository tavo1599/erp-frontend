<!-- src/views/ConfiguracionView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Building2, Save, Shield, Search } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { empresaService, type Empresa } from '../services/empresa.service';
import { useToast } from '../composables/useToast';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSpinner from '../components/ui/BaseSpinner.vue';
import { sunatService } from '../services/sunat.service';
import { useFrases } from '../composables/useFrases';
import { useAuthStore } from '../stores/auth.store';


const { frase } = useFrases();
const textoCarga = ref(frase('configuracion'));

const toast = useToast();
const router = useRouter();
const auth = useAuthStore();

const empresa = ref<Empresa | null>(null);
const cargando = ref(true);
const guardando = ref(false);

const consultandoSunat = ref(false);

async function consultarMiRuc() {
  if (!empresa.value?.ruc) return;
  consultandoSunat.value = true;
  try {
    const data = await sunatService.consultarRuc(empresa.value.ruc);
    empresa.value.razon_social = data.razon_social;
    if (data.nombre_comercial) empresa.value.nombre_comercial = data.nombre_comercial;
    if (data.direccion) empresa.value.direccion = data.direccion;
    if (data.departamento) empresa.value.departamento = data.departamento;
    if (data.provincia) empresa.value.provincia = data.provincia;
    if (data.distrito) empresa.value.distrito = data.distrito;
    if (data.ubigeo) empresa.value.ubigeo = data.ubigeo;
    toast.exito('Datos actualizados desde SUNAT');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo consultar SUNAT');
  } finally {
    consultandoSunat.value = false;
  }
}

async function cargar() {
  cargando.value = true;
  try {
    empresa.value = await empresaService.obtener();
  } catch {
    toast.error('No se pudieron cargar los datos de la empresa');
  } finally {
    cargando.value = false;
  }
}

async function guardar() {
  if (!empresa.value) return;
  if (!empresa.value.razon_social) {
    toast.advertencia('La razón social es obligatoria');
    return;
  }
  guardando.value = true;
  try {
    await empresaService.actualizar({
      razon_social: empresa.value.razon_social,
      nombre_comercial: empresa.value.nombre_comercial,
      direccion: empresa.value.direccion,
      ubigeo: empresa.value.ubigeo,
      departamento: empresa.value.departamento,
      provincia: empresa.value.provincia,
      distrito: empresa.value.distrito,
    });
    toast.exito('Datos de la empresa actualizados');
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Error al guardar');
  } finally {
    guardando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="config-header">
      <div class="config-header__icono"><Building2 :size="24" /></div>
      <div>
        <h1>Configuración de la empresa</h1>
        <p class="pagina-subtitulo">Datos fiscales y de contacto</p>
      </div>
    </div>

    <BaseSpinner v-if="cargando" :texto="textoCarga" />

    <div v-else-if="empresa" class="config-form">
      <div class="config-grid-paneles">
        <!-- Identificación -->
        <div class="config-panel">
          <h3 class="config-panel__titulo">Identificación</h3>
          <div class="campo-readonly">
            <span class="campo-readonly__label">RUC</span>
            <span class="campo-readonly__valor">{{ empresa.ruc }}</span>
            <span class="campo-readonly__nota">El RUC no se puede modificar</span>
          </div>
          <button
  v-if="auth.tienePermiso('editar_empresa')"
  class="btn-actualizar"
  :disabled="consultandoSunat"
  @click="consultarMiRuc"
  title="Actualizar datos desde SUNAT"
>
  <Search :size="16" :class="{ 'spin': consultandoSunat }" />
  {{ consultandoSunat ? 'Consultando...' : 'Actualizar desde SUNAT' }}
</button>
        </div>

        <!-- Acceso a Seguridad SUNAT -->
        <!-- Acceso a Seguridad SUNAT (solo si tiene permiso) -->
<div 
  v-if="auth.tienePermiso('editar_credenciales_sunat')"
  class="config-panel config-panel--enlace" 
  @click="router.push('/seguridad')"
>
  <div class="enlace-seg">
    <Shield :size="22" class="enlace-seg__icono" />
    <div class="enlace-seg__texto">
      <h3 class="config-panel__titulo">Seguridad SUNAT</h3>
      <p class="config-nota">Certificado digital, credenciales SOL y ambiente de emisión.</p>
    </div>
  </div>
</div>

        <!-- Datos generales (ocupa las dos columnas) -->
        <div class="config-panel" style="grid-column: 1 / -1;">
          <h3 class="config-panel__titulo">Datos generales</h3>
          <div class="config-grid">
            <BaseInput 
  v-model="empresa.razon_social" 
  label="Razón social" 
  :disabled="!auth.tienePermiso('editar_empresa')"
/>
<BaseInput 
  v-model="empresa.nombre_comercial" 
  label="Nombre comercial" 
  :disabled="!auth.tienePermiso('editar_empresa')"
/>
          </div>
          <BaseInput v-model="empresa.direccion" label="Dirección fiscal" />
        </div>

        <!-- Ubicación (ocupa las dos columnas) -->
        <div class="config-panel" style="grid-column: 1 / -1;">
          <h3 class="config-panel__titulo">Ubicación</h3>
          <div class="config-grid-4">
            <BaseInput v-model="empresa.departamento" label="Departamento" />
            <BaseInput v-model="empresa.provincia" label="Provincia" />
            <BaseInput v-model="empresa.distrito" label="Distrito" />
            <BaseInput v-model="empresa.ubigeo" label="Ubigeo" />
          </div>
        </div>
      </div>

      <div v-if="auth.tienePermiso('editar_empresa')" class="config-acciones">
  <BaseButton :cargando="guardando" @click="guardar">
    <Save :size="18" /> Guardar cambios
  </BaseButton>
</div>
    </div>
  </div>
</template>

<style scoped>
.config-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
.config-header__icono {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent);
  border-radius: var(--radius-md);
}
.pagina-subtitulo { color: var(--text-secondary); margin-top: 2px; }
.config-form {
  max-width: 1100px;
  margin: 0 auto;
}
.config-grid-paneles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  align-items: start;
}
.config-acciones {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-md);
}
.config-panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.config-panel--enlace {
  cursor: pointer;
  transition: var(--transition);
}
.config-panel--enlace:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.enlace-seg {
  display: flex; align-items: flex-start; gap: var(--space-md);
}
.enlace-seg__icono { color: var(--accent); flex-shrink: 0; margin-top: 4px; }
.enlace-seg__texto { flex: 1; }
.config-panel__titulo {
  font-size: var(--text-base);
  margin-bottom: var(--space-md);
}
.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}
.campo-readonly {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.campo-readonly__label { font-size: var(--text-sm); color: var(--text-secondary); font-weight: 500; }
.campo-readonly__valor { font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); }
.campo-readonly__nota { font-size: var(--text-xs); color: var(--text-muted); margin: 0; }
.config-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}
@media (max-width: 768px) {
  .config-grid-paneles { grid-template-columns: 1fr; }
  .config-grid-4 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .config-grid { grid-template-columns: 1fr; }
}
.btn-actualizar {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent-soft); color: var(--accent);
  border: 1px solid var(--accent);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm); font-weight: 600;
  margin-top: var(--space-md);
  transition: var(--transition);
}
.btn-actualizar:hover:not(:disabled) {
  background: var(--accent); color: white;
}
.btn-actualizar:disabled { opacity: 0.6; cursor: wait; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
</style>