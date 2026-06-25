<!-- src/components/ui/BaseInput.vue -->
<script setup lang="ts">
defineProps<{
  modelValue: string | undefined;
  label?: string;
  tipo?: string;
  placeholder?: string;
  icono?: string;
  error?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="campo">
    <label v-if="label" class="campo__label">{{ label }}</label>
    <div class="campo__wrapper" :class="{ 'campo__wrapper--error': error }">
      <span v-if="icono" class="campo__icono">{{ icono }}</span>
      <input
        :type="tipo || 'text'"
        :value="modelValue"
        :placeholder="placeholder"
        class="campo__input"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <span v-if="error" class="campo__error">{{ error }}</span>
  </div>
</template>

<style scoped>
.campo {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}
.campo__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}
.campo__wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0 12px;
  transition: var(--transition);
}
.campo__wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.campo__wrapper--error {
  border-color: var(--danger);
}
.campo__icono {
  font-size: var(--text-lg);
  opacity: 0.6;
}
.campo__input {
  flex: 1;
  min-width: 0;   /* ← AGREGAR */
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding: 11px 0;
  color: var(--text-primary);
}
.campo__input::placeholder { color: var(--text-muted); }
.campo__error {
  font-size: var(--text-xs);
  color: var(--danger);
}
</style>