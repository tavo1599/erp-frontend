<!-- src/components/ui/BaseTabs.vue -->
<script setup lang="ts">
defineProps<{
  modelValue: string;
  pestanas: { valor: string; texto: string }[];
}>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <div class="tabs">
    <button
      v-for="p in pestanas"
      :key="p.valor"
      class="tabs__item"
      :class="{ 'tabs__item--activo': modelValue === p.valor }"
      @click="$emit('update:modelValue', p.valor)"
    >
      {{ p.texto }}
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-surface-2);
  padding: 4px;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  width: fit-content;
}
.tabs__item {
  padding: 8px 18px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  transition: var(--transition);
}
.tabs__item:hover { color: var(--text-primary); }
.tabs__item--activo {
  background: var(--bg-surface);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}
</style>