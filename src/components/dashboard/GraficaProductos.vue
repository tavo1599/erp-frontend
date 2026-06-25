<!-- src/components/dashboard/GraficaProductos.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ProductoVendido } from '../../services/dashboard.service';

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps<{ datos: ProductoVendido[] }>();

const opciones = computed(() => ({
  grid: { top: 20, right: 20, bottom: 30, left: 120 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#2d2a26',
    textStyle: { color: '#f5f1ec' },
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: '#9c938a', fontSize: 11 },
    splitLine: { lineStyle: { color: '#e8e1d8' } },
  },
  yAxis: {
    type: 'category',
    data: props.datos.map((d) => d.producto).reverse(),
    axisLabel: { color: '#6b635a', fontSize: 11 },
    axisLine: { lineStyle: { color: '#d4cabd' } },
  },
  series: [
    {
      data: props.datos.map((d) => d.cantidad_vendida).reverse(),
      type: 'bar',
      itemStyle: {
        color: '#c2643f',
        borderRadius: [0, 6, 6, 0],
      },
      barWidth: '60%',
    },
  ],
}));
</script>

<template>
  <div class="grafica">
    <h3 class="grafica__titulo">Productos más vendidos</h3>
    <VChart v-if="datos.length > 0" class="grafica__chart" :option="opciones" autoresize />
    <p v-else class="grafica__vacio">Aún no hay productos vendidos</p>
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