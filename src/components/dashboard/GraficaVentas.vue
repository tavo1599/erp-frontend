<!-- src/components/dashboard/GraficaVentas.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { VentaPorDia } from '../../services/dashboard.service';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps<{ datos: VentaPorDia[] }>();

const opciones = computed(() => ({
  grid: { top: 20, right: 20, bottom: 30, left: 50 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#2d2a26',
    borderColor: '#2d2a26',
    textStyle: { color: '#f5f1ec' },
    formatter: (params: any) => {
      const p = params[0];
      return `${p.axisValue}<br/><strong>S/ ${Number(p.value).toFixed(2)}</strong>`;
    },
  },
  xAxis: {
    type: 'category',
    data: props.datos.map((d) => {
      const f = new Date(d.fecha);
      return `${f.getDate()}/${f.getMonth() + 1}`;
    }),
    axisLine: { lineStyle: { color: '#d4cabd' } },
    axisLabel: { color: '#9c938a', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#9c938a', fontSize: 11, formatter: 'S/ {value}' },
    splitLine: { lineStyle: { color: '#e8e1d8' } },
  },
  series: [
    {
      data: props.datos.map((d) => d.total),
      type: 'line',
      smooth: true,
      lineStyle: { color: '#c2643f', width: 3 },
      itemStyle: { color: '#c2643f' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(194, 100, 63, 0.25)' },
            { offset: 1, color: 'rgba(194, 100, 63, 0.02)' },
          ],
        },
      },
    },
  ],
}));
</script>

<template>
  <div class="grafica">
    <h3 class="grafica__titulo">Ventas de los últimos días</h3>
    <VChart v-if="datos.length > 0" class="grafica__chart" :option="opciones" autoresize />
    <p v-else class="grafica__vacio">Aún no hay datos de ventas para mostrar</p>
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