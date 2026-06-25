<!-- src/components/ui/BaseModal.vue -->
<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineProps<{
  modelValue: boolean;
  titulo: string;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__titulo">{{ titulo }}</h3>
            <button class="modal__cerrar" @click="$emit('update:modelValue', false)">
              <X :size="20" />
            </button>
          </div>
          <div class="modal__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(45, 42, 38, 0.25);   /* ← más suave (era 0.45) */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-lg);
  backdrop-filter: blur(1.5px);          /* ← menos blur (era 3px) */
  overflow-y: auto;
}
.modal {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - var(--space-lg) * 2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: auto;
}
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal__titulo { font-size: var(--text-lg); }
.modal__cerrar {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
}
.modal__cerrar:hover { background: var(--bg-surface-2); color: var(--text-primary); }
.modal__body {
  padding: var(--space-lg);
  overflow-y: auto;
}
.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

/* Animación */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal { transition: transform 0.25s ease; }
.modal-enter-from .modal { transform: scale(0.96) translateY(10px); }
</style>