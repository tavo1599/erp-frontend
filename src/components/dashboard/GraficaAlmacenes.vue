<!-- src/components/dashboard/GraficaAlmacenes.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { VentaPorAlmacen } from '../../services/dashboard.service';

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

const props = defineProps<{ datos: VentaPorAlmacen[] }>();

const PALETA = ['#c2643f', '#3f7cc2', '#4caf7d', '#e0a34c', '#8b5cf6', '#ef5b7b', '#64748b'];

const opciones = computed(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: '#2d2a26',
    textStyle: { color: '#f5f1ec' },
    formatter: (p: any) => `${p.name}<br/>S/ ${Number(p.value).toFixed(2)} (${p.percent}%)`,
  },
  legend: {
    bottom: 0,
    textStyle: { color: '#6b635a', fontSize: 11 },
  },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: props.datos.map((d, i) => ({
        name: d.almacen,
        value: d.total,
        itemStyle: { color: PALETA[i % PALETA.length] },
      })),
    },
  ],
}));
</script>

<template>
  <div class="grafica">
    <h3 class="grafica__titulo">Ventas por almacén (mes actual)</h3>
    <VChart v-if="datos.length > 0" class="grafica__chart" :option="opciones" autoresize />
    <p v-else class="grafica__vacio">Aún no hay ventas este mes</p>
  </div>
</template>

<style scoped>
.grafica {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.grafica__titulo {
  font-size: var(--text-base);
  margin-bottom: var(--space-md);
}
.grafica__chart {
  height: 280px;
  width: 100%;
}
.grafica__vacio {
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
