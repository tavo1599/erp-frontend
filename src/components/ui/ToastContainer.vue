<!-- src/components/ui/ToastContainer.vue -->
<script setup lang="ts">
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-vue-next';
import { useToast } from '../../composables/useToast';

const { toasts, cerrar } = useToast();

const iconos = {
  exito: CheckCircle,
  error: XCircle,
  info: Info,
  advertencia: AlertTriangle,
};
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast--${t.tipo}`"
        >
          <component :is="iconos[t.tipo]" :size="20" class="toast__icono" />
          <span class="toast__mensaje">{{ t.mensaje }}</span>
          <button class="toast__cerrar" @click="cerrar(t.id)">
            <X :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 280px;
  max-width: 380px;
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid var(--text-muted);
  pointer-events: auto;
}
.toast--exito { border-left-color: var(--success); }
.toast--exito .toast__icono { color: var(--success); }
.toast--error { border-left-color: var(--danger); }
.toast--error .toast__icono { color: var(--danger); }
.toast--info { border-left-color: var(--info); }
.toast--info .toast__icono { color: var(--info); }
.toast--advertencia { border-left-color: var(--warning); }
.toast--advertencia .toast__icono { color: var(--warning); }

.toast__icono { flex-shrink: 0; }
.toast__mensaje {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--text-primary);
}
.toast__cerrar {
  background: none;
  border: none;
  color: var(--text-muted);
  display: flex;
  padding: 2px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.toast__cerrar:hover { background: var(--bg-surface-2); }

/* Animación de entrada/salida */
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.3s ease; position: absolute; }
.toast-enter-from { opacity: 0; transform: translateX(100%); }
.toast-leave-to { opacity: 0; transform: translateX(100%); }
.toast-move { transition: transform 0.3s ease; }
</style>