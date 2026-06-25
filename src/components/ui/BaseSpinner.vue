<!-- src/components/ui/BaseSpinner.vue -->
<script setup lang="ts">
defineProps<{
  tamano?: 'sm' | 'md' | 'lg';
  texto?: string;
}>();
</script>

<template>
  <div class="cargando">
    <div class="spinner" :class="tamano ? `spinner--${tamano}` : ''"></div>
    <span v-if="texto" class="cargando__texto">{{ texto }}</span>
  </div>
</template>

<style scoped>
.cargando {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-xl);
}
.cargando__texto {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}
</style>