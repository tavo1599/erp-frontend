<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DollarSign, Calendar, TrendingUp, Receipt, AlertTriangle, Info, AlertCircle, Package, Wallet } from 'lucide-vue-next';
import { dashboardService, type KpisData, type Alerta } from '../services/dashboard.service';
import { useFormato } from '../composables/useFormato';
import { useAuthStore } from '../stores/auth.store';
import KpiCard from '../components/dashboard/KpiCard.vue';
import BaseSkeleton from '../components/ui/BaseSkeleton.vue';
import GraficaVentas from '../components/dashboard/GraficaVentas.vue';
import GraficaProductos from '../components/dashboard/GraficaProductos.vue';
import GraficaAlmacenes from '../components/dashboard/GraficaAlmacenes.vue';
import type { VentaPorDia, ProductoVendido, VentaPorAlmacen, Valorizacion } from '../services/dashboard.service';
import { useFrases } from '../composables/useFrases';

const { moneda } = useFormato();
const auth = useAuthStore();

const ventasPorDia = ref<VentaPorDia[]>([]);
const productosTop = ref<ProductoVendido[]>([]);
const ventasPorAlmacen = ref<VentaPorAlmacen[]>([]);
const valorizacion = ref<Valorizacion | null>(null);
const kpis = ref<KpisData | null>(null);
const alertas = ref<Alerta[]>([]);
const cargando = ref(true);
const { frase } = useFrases();
const textoCarga = ref(frase('dashboard'));

onMounted(async () => {
  try {
    const [kpisData, alertasData, ventasData, productosData, almacenesData, valorizacionData] =
      await Promise.all([
        dashboardService.kpis(),
        dashboardService.alertas(),
        dashboardService.ventasPorDia(30),
        dashboardService.productosMasVendidos(5),
        dashboardService.ventasPorAlmacen(),
        dashboardService.valorizacion(),
      ]);
    kpis.value = kpisData;
    alertas.value = alertasData.alertas;
    ventasPorDia.value = ventasData;
    productosTop.value = productosData;
    ventasPorAlmacen.value = almacenesData;
    valorizacion.value = valorizacionData;
  } catch (e) {
    console.error('Error cargando dashboard', e);
  } finally {
    cargando.value = false;
  }
});

function iconoAlerta(nivel: string) {
  if (nivel === 'critico') return AlertCircle;
  if (nivel === 'advertencia') return AlertTriangle;
  return Info;
}
</script>

<template>
  <div class="dashboard">
    <!-- Encabezado -->
    <div class="dashboard__header anim-entrada">
      <div>
        <h1>Dashboard</h1>
        <p class="dashboard__saludo">Bienvenido, {{ auth.usuario?.nombre }}</p>
      </div>
    </div>

    <p v-if="cargando" class="dashboard__cargando">{{ textoCarga }}</p>

    <!-- KPIs (skeleton mientras carga) -->
    <div v-if="cargando" class="dashboard__kpis">
      <div v-for="n in 4" :key="n" class="kpi-skeleton">
        <BaseSkeleton alto="100px" />
      </div>
    </div>

    <div v-else-if="kpis" class="dashboard__kpis anim-stagger">
      <KpiCard
        titulo="Ventas de hoy"
        :valor="moneda(kpis.hoy.total)"
        :icono="DollarSign"
        :comparacion="kpis.hoy.comparacion_ayer"
        subtitulo="vs ayer"
      />
      <KpiCard
        titulo="Ventas del mes"
        :valor="moneda(kpis.mes.total)"
        :icono="Calendar"
        :comparacion="kpis.mes.comparacion_mes_anterior"
        subtitulo="vs mes anterior"
      />
      <KpiCard
        titulo="Ventas del año"
        :valor="moneda(kpis.anio.total)"
        :icono="TrendingUp"
        :comparacion="kpis.anio.comparacion_anio_anterior"
        subtitulo="vs año anterior"
      />
      <KpiCard
        titulo="Ticket promedio"
        :valor="moneda(kpis.ticket_promedio)"
        :icono="Receipt"
        subtitulo="por comprobante este mes"
      />
    </div>

    <!-- Valorización de inventario -->
    <div v-if="!cargando && valorizacion" class="dashboard__kpis anim-stagger">
      <KpiCard
        titulo="Valor del inventario"
        :valor="moneda(valorizacion.valor_total_venta)"
        :icono="Package"
        subtitulo="a precio de venta"
      />
      <KpiCard
        titulo="Costo del inventario"
        :valor="moneda(valorizacion.valor_total_costo)"
        :icono="Wallet"
        subtitulo="lo invertido en stock"
      />
      <KpiCard
        titulo="Utilidad potencial"
        :valor="moneda(valorizacion.utilidad_potencial)"
        :icono="TrendingUp"
        subtitulo="si vendes todo el stock"
      />
      <KpiCard
        titulo="Productos activos"
        :valor="String(valorizacion.cantidad_productos)"
        :icono="Receipt"
        subtitulo="con stock valorizado"
      />
    </div>

    <!-- Gráficas -->
    <div v-if="!cargando" class="dashboard__graficas anim-entrada">
      <GraficaVentas :datos="ventasPorDia" />
      <GraficaProductos :datos="productosTop" />
      <GraficaAlmacenes :datos="ventasPorAlmacen" />
    </div>

    <!-- Alertas -->
    <div v-if="!cargando && alertas.length > 0" class="dashboard__alertas anim-entrada">
      <h2 class="dashboard__seccion-titulo">Alertas</h2>
      <div class="alertas-lista anim-stagger">
        <div
          v-for="(alerta, i) in alertas"
          :key="i"
          class="alerta"
          :class="`alerta--${alerta.nivel}`"
        >
          <component :is="iconoAlerta(alerta.nivel)" :size="18" />
          <span>{{ alerta.mensaje }}</span>
        </div>
      </div>
    </div>

    <div v-if="!cargando && alertas.length === 0" class="dashboard__sin-alertas anim-entrada">
      Todo en orden. No hay alertas pendientes.
    </div>
  </div>
</template>

<style scoped>
.dashboard__header {
  margin-bottom: var(--space-lg);
}
.dashboard__saludo {
  color: var(--text-secondary);
  margin-top: 4px;
}
.dashboard__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}
.dashboard__graficas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}
@media (max-width: 1024px) {
  .dashboard__graficas { grid-template-columns: 1fr; }
}
.dashboard__seccion-titulo {
  font-size: var(--text-lg);
  margin-bottom: var(--space-md);
}
.alertas-lista {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.alerta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}
.alerta--critico { background: var(--danger-soft); color: var(--danger); }
.alerta--advertencia { background: var(--warning-soft); color: var(--warning); }
.alerta--info { background: var(--info-soft); color: var(--info); }
.dashboard__sin-alertas {
  padding: var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  text-align: center;
  box-shadow: var(--shadow-sm);
}

/* RESPONSIVE: en pantallas chicas, las tarjetas se apilan */
@media (max-width: 1024px) {
  .dashboard__kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .dashboard__kpis { grid-template-columns: 1fr; }
}
.dashboard__cargando {
  color: var(--accent);
  font-size: var(--text-sm);
  font-weight: 500;
  margin-bottom: var(--space-md);
  animation: pulso 1.5s ease-in-out infinite;
}
@keyframes pulso {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>