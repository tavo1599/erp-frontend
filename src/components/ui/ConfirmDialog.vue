<!-- src/components/ui/ConfirmDialog.vue -->
<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';
import { useConfirm } from '../../composables/useConfirm';
import BaseButton from './BaseButton.vue';

const { visible, opciones, aceptar, cancelar } = useConfirm();
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="confirm-overlay" @click.self="cancelar">
        <div class="confirm">
          <div class="confirm__icono" :class="{ 'confirm__icono--peligro': opciones.peligro }">
            <AlertTriangle :size="28" />
          </div>
          <h3 class="confirm__titulo">{{ opciones.titulo }}</h3>
          <p class="confirm__mensaje">{{ opciones.mensaje }}</p>
          <div class="confirm__acciones">
            <BaseButton variant="secondary" @click="cancelar">
              {{ opciones.textoCancelar || 'Cancelar' }}
            </BaseButton>
            <BaseButton :variant="opciones.peligro ? 'danger' : 'primary'" @click="aceptar">
              {{ opciones.textoConfirmar || 'Confirmar' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(45, 42, 38, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  padding: var(--space-lg);
  backdrop-filter: blur(2px);
}
.confirm {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-xl);
  width: 100%;
  max-width: 380px;
  text-align: center;
}
.confirm__icono {
  width: 56px;
  height: 56px;
  margin: 0 auto var(--space-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--warning-soft);
  color: var(--warning);
  border-radius: 50%;
}
.confirm__icono--peligro {
  background: var(--danger-soft);
  color: var(--danger);
}
.confirm__titulo {
  font-size: var(--text-lg);
  margin-bottom: var(--space-sm);
}
.confirm__mensaje {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-lg);
}
.confirm__acciones {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .confirm { transition: transform 0.25s ease; }
.modal-enter-from .confirm { transform: scale(0.95); }
</style>