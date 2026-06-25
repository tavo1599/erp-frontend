<!-- src/components/ui/BaseButton.vue -->
<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  tipo?: 'button' | 'submit';
  cargando?: boolean;
  bloque?: boolean; // ocupa todo el ancho
}>();
</script>

<template>
  <button
    :type="tipo || 'button'"
    class="btn"
    :class="[`btn--${variant || 'primary'}`, { 'btn--bloque': bloque }]"
    :disabled="cargando"
  >
    <span v-if="cargando" class="btn__spinner"></span>
    <slot v-else />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 10px 18px;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  transition: var(--transition);
  white-space: nowrap;
  position: relative;
  transform: translateY(0);
}
/* Efecto al pasar el mouse: se eleva sutilmente */
.btn--primary:hover:not(:disabled),
.btn--danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Efecto al presionar: se "hunde" */
.btn:active:not(:disabled) {
  transform: translateY(1px);
}

.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn--bloque { width: 100%; }

.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: var(--accent-hover); }

.btn--secondary { background: var(--bg-surface-2); color: var(--text-primary); }
.btn--secondary:hover:not(:disabled) { background: var(--border); }

.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { opacity: 0.9; }

.btn--ghost { background: transparent; color: var(--text-secondary); }
.btn--ghost:hover:not(:disabled) { background: var(--bg-surface-2); }

.btn__spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>