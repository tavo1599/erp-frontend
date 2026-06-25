<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import { LayoutDashboard } from 'lucide-vue-next';
import { useToast } from '../composables/useToast';

const toast = useToast();

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const cargando = ref(false);

async function iniciarSesion() {
  error.value = '';

  if (!email.value || !password.value) {
    error.value = 'Ingresa tu correo y contraseña';
    return;
  }

  cargando.value = true;
  try {
    const respuesta = await authService.login(email.value, password.value);

    localStorage.setItem('empresas_disponibles_cache', JSON.stringify(respuesta.empresas));


    if (respuesta.requiere_seleccion) {
  // VARIAS empresas: token temporal va al STORE (para que el interceptor lo use)
  auth.token = respuesta.access_token;
  localStorage.setItem('token', respuesta.access_token);
  localStorage.setItem('empresas_disponibles', JSON.stringify(respuesta.empresas));
  localStorage.setItem('empresas_disponibles_cache', JSON.stringify(respuesta.empresas));
  router.push('/seleccionar-empresa');
} else {
      // UNA sola empresa: flujo normal con tu store
      const empresa = respuesta.empresas[0] || undefined;
      auth.establecerSesion(respuesta.access_token, respuesta.usuario as any, empresa);
      await auth.cargarMisPermisos();
      if (respuesta.refresh_token) {
        localStorage.setItem('refresh_token', respuesta.refresh_token);
      }
      router.push('/');
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Credenciales incorrectas';
    toast.error('No se pudo iniciar sesión');
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <div class="login">
    <div class="login__card">
      <div class="login__header">
        <div class="login__logo">
  <LayoutDashboard :size="48" :stroke-width="1.5" />
</div>
        <h1 class="login__titulo">Mi ERP</h1>
        <p class="login__subtitulo">Sistema de gestión empresarial</p>
      </div>

      <form class="login__form" @submit.prevent="iniciarSesion">
        <BaseInput
          v-model="email"
          label="Correo electrónico"
          tipo="email"
          placeholder="tu@empresa.com"
          icono="✉️"
        />
        <BaseInput
          v-model="password"
          label="Contraseña"
          tipo="password"
          placeholder="••••••••"
          icono="🔒"
        />

        <p v-if="error" class="login__error">{{ error }}</p>

        <BaseButton tipo="submit" :cargando="cargando" bloque>
          
          Iniciar sesión
        </BaseButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-app) 0%, var(--accent-soft) 100%);
  padding: var(--space-md);
}
.login__card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-xl);
}
.login__header {
  text-align: center;
  margin-bottom: var(--space-xl);
}
.login__logo {
  font-size: 3rem;
  margin-bottom: var(--space-sm);
}
.login__titulo {
  font-size: var(--text-2xl);
  color: var(--text-primary);
}
.login__subtitulo {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
}
.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.login__error {
  background: var(--danger-soft);
  color: var(--danger);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  text-align: center;
}
</style>