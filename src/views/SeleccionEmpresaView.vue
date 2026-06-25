<!-- src/views/SeleccionEmpresaView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { Building2, LogOut, CheckCircle2, ChevronRight, Briefcase } from 'lucide-vue-next';
import { authService, type EmpresaUsuario } from '../services/auth.service';
import { useToast } from '../composables/useToast';
import { useFrases } from '../composables/useFrases';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseSpinner from '../components/ui/BaseSpinner.vue';

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();
const { frase } = useFrases();

const empresas = ref<EmpresaUsuario[]>([]);
const empresaSeleccionada = ref<string | null>(null);
const cargando = ref(false);
const textoCarga = ref(frase('general'));

function logout() {
  auth.cerrarSesion();
  router.push('/login');
}

async function elegir(empresa: EmpresaUsuario) {
  empresaSeleccionada.value = empresa.id;
  cargando.value = true;

  try {
    const respuesta = await authService.seleccionarEmpresa(empresa.id);

    // Usar el store
    auth.establecerSesion(
      respuesta.access_token,
      respuesta.usuario as any,
      respuesta.empresa,
    );
    localStorage.setItem('refresh_token', respuesta.refresh_token);
    localStorage.removeItem('empresas_disponibles');
    await auth.cargarMisPermisos(); 

    toast.exito(`Entrando a ${respuesta.empresa.razon_social}`);
    setTimeout(() => router.push('/'), 500);
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'No se pudo seleccionar la empresa');
    empresaSeleccionada.value = null;
    cargando.value = false;
  }
}

onMounted(() => {
  // Leer las empresas del localStorage (guardadas tras login)
  const data = localStorage.getItem('empresas_disponibles');
  if (!data) {
    toast.error('No hay empresas para seleccionar');
    router.push('/login');
    return;
  }
  empresas.value = JSON.parse(data);
});
</script>

<template>
  <div class="pantalla-seleccion">
    <div class="seleccion-card">
      <div class="seleccion-header">
        <div class="seleccion-header__icon">
          <Briefcase :size="32" />
        </div>
        <h1>Selecciona tu empresa</h1>
        <p>Tienes acceso a varias empresas. Elige con cuál quieres trabajar.</p>
      </div>

      <div class="empresas-lista">
        <button
          v-for="empresa in empresas"
          :key="empresa.id"
          class="empresa-item"
          :class="{
            'empresa-item--seleccionada': empresaSeleccionada === empresa.id,
            'empresa-item--cargando': cargando && empresaSeleccionada !== empresa.id,
          }"
          :disabled="cargando"
          @click="elegir(empresa)"
        >
          <div class="empresa-item__avatar">
            <Building2 :size="22" />
          </div>
          <div class="empresa-item__info">
            <strong>{{ empresa.razon_social }}</strong>
            <div class="empresa-item__meta">
              <span class="meta-ruc">RUC {{ empresa.ruc }}</span>
              <span class="meta-rol">{{ empresa.rol }}</span>
              <span
                class="meta-ambiente"
                :class="`meta-ambiente--${empresa.ambiente}`"
              >
                {{ empresa.ambiente === 'produccion' ? '● Producción' : '● Beta' }}
              </span>
            </div>
          </div>
          <div class="empresa-item__action">
            <BaseSpinner v-if="empresaSeleccionada === empresa.id" small />
            <ChevronRight v-else :size="20" />
          </div>
        </button>
      </div>

      <div class="seleccion-footer">
        <button class="btn-logout" @click="logout" :disabled="cargando">
          <LogOut :size="16" /> Cerrar sesión
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pantalla-seleccion {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: linear-gradient(
    135deg,
    var(--bg-base) 0%,
    var(--accent-soft) 100%
  );
}

.seleccion-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  width: 100%;
  max-width: 540px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
}

.seleccion-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}
.seleccion-header__icon {
  width: 64px;
  height: 64px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-md);
}
.seleccion-header h1 {
  font-size: var(--text-xl);
  margin-bottom: 4px;
  color: var(--text-primary);
}
.seleccion-header p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.empresas-lista {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.empresa-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-md);
  background: var(--bg-surface-2);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
  text-align: left;
}
.empresa-item:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-1px);
}
.empresa-item:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.empresa-item--seleccionada {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.empresa-item--cargando {
  opacity: 0.4;
}

.empresa-item__avatar {
  width: 44px;
  height: 44px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

.empresa-item__info {
  flex: 1;
  min-width: 0;
}
.empresa-item__info strong {
  display: block;
  font-size: var(--text-base);
  color: var(--text-primary);
  margin-bottom: 4px;
}
.empresa-item__meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.meta-ruc, .meta-rol, .meta-ambiente {
  font-size: var(--text-xs);
  font-weight: 500;
}
.meta-ruc {
  color: var(--text-secondary);
  font-family: monospace;
}
.meta-rol {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.meta-ambiente--produccion {
  color: var(--success);
  font-weight: 600;
}
.meta-ambiente--beta {
  color: var(--warning);
  font-weight: 600;
}

.empresa-item__action {
  color: var(--text-muted);
  flex-shrink: 0;
}
.empresa-item:hover .empresa-item__action {
  color: var(--accent);
}

.seleccion-footer {
  text-align: center;
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
}
.btn-logout {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 8px;
}
.btn-logout:hover:not(:disabled) {
  color: var(--danger);
}

@media (max-width: 540px) {
  .empresa-item__meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>