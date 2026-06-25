<!-- src/views/admin/AdminDashboardView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Building2, FileText, CheckCircle2, Calendar } from 'lucide-vue-next';
import { adminService, type KpisGlobales } from '../../services/admin.service';
import { useFrases } from '../../composables/useFrases';
import BaseSkeleton from '../../components/ui/BaseSkeleton.vue';
import KpiCard from '../../components/dashboard/KpiCard.vue';

const kpis = ref<KpisGlobales | null>(null);
const cargando = ref(true);
const { frase } = useFrases();

onMounted(async () => {
  try {
    kpis.value = await adminService.kpis();
  } catch (e) {
    console.error('Error cargando KPIs', e);
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1>Panel Super Admin</h1>
        <p class="pagina-subtitulo">Visión global del sistema</p>
      </div>
    </div>

    <!-- KPIs -->
    <div v-if="cargando" class="kpis-grid">
      <div v-for="n in 4" :key="n"><BaseSkeleton alto="110px" /></div>
    </div>

    <div v-else-if="kpis" class="kpis-grid anim-stagger">
      <KpiCard
        titulo="Empresas registradas"
        :valor="String(kpis.total_empresas)"
        :icono="Building2"
        :subtitulo="`${kpis.empresas_activas} activas, ${kpis.empresas_suspendidas} suspendidas`"
      />
      <KpiCard
        titulo="Comprobantes totales"
        :valor="String(kpis.total_comprobantes)"
        :icono="FileText"
        :subtitulo="`${kpis.comprobantes_aceptados} aceptados`"
      />
      <KpiCard
        titulo="Comprobantes hoy"
        :valor="String(kpis.comprobantes_hoy)"
        :icono="Calendar"
        subtitulo="emitidos en el día"
      />
      <KpiCard
        titulo="Tasa de éxito"
        :valor="kpis.total_comprobantes > 0
          ? `${((kpis.comprobantes_aceptados / kpis.total_comprobantes) * 100).toFixed(1)}%`
          : '—'"
        :icono="CheckCircle2"
        subtitulo="aceptados por SUNAT"
      />
    </div>

    <!-- Distribución por plan -->
    <div v-if="kpis && kpis.empresas_por_plan.length > 0" class="panel anim-entrada">
      <h3 class="panel__titulo">Distribución por plan</h3>
      <div class="planes-grid">
        <div
          v-for="grupo in kpis.empresas_por_plan"
          :key="grupo.plan"
          class="plan-card"
        >
          <span class="plan-card__nombre">{{ grupo.plan }}</span>
          <span class="plan-card__cantidad">{{ grupo.cantidad }}</span>
          <span class="plan-card__label">{{ Number(grupo.cantidad) === 1 ? 'empresa' : 'empresas' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagina-header { margin-bottom: var(--space-lg); }
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; }

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.panel__titulo {
  font-size: var(--text-lg);
  margin-bottom: var(--space-md);
}

.planes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}
.plan-card {
  background: var(--bg-surface-2);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.plan-card__nombre {
  font-size: var(--text-xs);
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: 700;
}
.plan-card__cantidad {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
}
.plan-card__label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .kpis-grid { grid-template-columns: repeat(2, 1fr); }
  .planes-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .kpis-grid { grid-template-columns: 1fr; }
}
</style>