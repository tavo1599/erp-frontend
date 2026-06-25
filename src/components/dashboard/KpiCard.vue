<!-- src/components/dashboard/KpiCard.vue -->
<script setup lang="ts">
import { TrendingUp, TrendingDown, Minus } from 'lucide-vue-next';
import type { Component } from 'vue';

defineProps<{
  titulo: string;
  valor: string;
  icono: Component;
  comparacion?: { porcentaje: number; tendencia: string };
  subtitulo?: string;
}>();
</script>

<template>
  <div class="kpi card-hover">
    <div class="kpi__header">
      <span class="kpi__titulo">{{ titulo }}</span>
      <div class="kpi__icono">
        <component :is="icono" :size="20" :stroke-width="2" />
      </div>
    </div>

    <div class="kpi__valor">{{ valor }}</div>

    <div v-if="comparacion" class="kpi__comparacion">
      <span
        class="kpi__tendencia"
        :class="{
          'kpi__tendencia--sube': comparacion.tendencia === 'sube',
          'kpi__tendencia--baja': comparacion.tendencia === 'baja',
        }"
      >
        <TrendingUp v-if="comparacion.tendencia === 'sube'" :size="14" />
        <TrendingDown v-else-if="comparacion.tendencia === 'baja'" :size="14" />
        <Minus v-else :size="14" />
        {{ Math.abs(comparacion.porcentaje) }}%
      </span>
      <span class="kpi__comparacion-texto">{{ subtitulo }}</span>
    </div>
  </div>
</template>

<style scoped>
.kpi {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}
.kpi__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}
.kpi__titulo {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}
.kpi__icono {
  width: 40px; height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--radius-md);
}
.kpi__valor {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}
.kpi__comparacion {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}
.kpi__tendencia {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-2);
  color: var(--text-muted);
}
.kpi__tendencia--sube { background: var(--success-soft); color: var(--success); }
.kpi__tendencia--baja { background: var(--danger-soft); color: var(--danger); }
.kpi__comparacion-texto {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>