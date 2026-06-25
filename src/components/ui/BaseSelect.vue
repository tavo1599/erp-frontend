<!-- src/components/ui/BaseSelect.vue -->
<script setup lang="ts">
interface Opcion {
  valor: string;
  texto: string;
}

defineProps<{
  modelValue: string;
  label?: string;
  opciones: Opcion[];
  placeholder?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="campo">
    <label v-if="label" class="campo__label">{{ label }}</label>
    <div class="campo__wrapper">
      <select
        :value="modelValue"
        class="campo__select"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="op in opciones" :key="op.valor" :value="op.valor">
          {{ op.texto }}
        </option>
      </select>
    </div>
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
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: var(--transition);
}
.campo__wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.campo__select {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding: 11px 12px;
  color: var(--text-primary);
  cursor: pointer;
}
</style>