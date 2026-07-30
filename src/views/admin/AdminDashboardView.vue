<!-- src/views/admin/AdminDashboardView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Building2, Calendar, DollarSign, Wallet, AlertTriangle,
} from 'lucide-vue-next';
import {
  adminService,
  type KpisGlobales,
  type DashboardSuperAdmin,
} from '../../services/admin.service';
import { useFormato } from '../../composables/useFormato';
import BaseSkeleton from '../../components/ui/BaseSkeleton.vue';
import KpiCard from '../../components/dashboard/KpiCard.vue';

const kpis = ref<KpisGlobales | null>(null);
const dash = ref<DashboardSuperAdmin | null>(null);
const cargando = ref(true);
const { moneda, numero } = useFormato();

const maxIngresoMes = computed(() => {
  if (!dash.value) return 0;
  return Math.max(1, ...dash.value.ingresos_por_mes.map((m) => m.total));
});

// "2026-07" → "jul 26"
function etiquetaMes(ym: string): string {
  const [anio, mes] = ym.split('-').map(Number);
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${nombres[(mes || 1) - 1]} ${String(anio).slice(2)}`;
}

function fechaCorta(valor: string | null): string {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function claseUrgencia(dias: number | null): string {
  if (dias === null) return '';
  if (dias < 0) return 'venc--vencido';
  if (dias <= 7) return 'venc--urgente';
  if (dias <= 15) return 'venc--pronto';
  return '';
}

function textoDias(dias: number | null): string {
  if (dias === null) return 'sin fecha';
  if (dias < 0) return `vencida hace ${Math.abs(dias)} d`;
  if (dias === 0) return 'vence hoy';
  return `en ${dias} d`;
}

onMounted(async () => {
  try {
    const [k, d] = await Promise.all([
      adminService.kpis(),
      adminService.dashboard(),
    ]);
    kpis.value = k;
    dash.value = d;
  } catch (e) {
    console.error('Error cargando dashboard', e);
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
        <p class="pagina-subtitulo">Visión global del negocio y las empresas</p>
      </div>
    </div>

    <!-- KPIs -->
    <div v-if="cargando" class="kpis-grid">
      <div v-for="n in 4" :key="n"><BaseSkeleton alto="110px" /></div>
    </div>

    <div v-else-if="dash" class="kpis-grid anim-stagger">
      <KpiCard
        titulo="Ingresos totales"
        :valor="moneda(dash.ingresos_total)"
        :icono="DollarSign"
        subtitulo="pagos registrados"
      />
      <KpiCard
        titulo="Ingresos del mes"
        :valor="moneda(dash.ingresos_mes)"
        :icono="Wallet"
        subtitulo="cobrado este mes"
      />
      <KpiCard
        titulo="Empresas registradas"
        :valor="String(dash.total_empresas)"
        :icono="Building2"
        :subtitulo="`${dash.empresas_activas} activas · ${dash.empresas_suspendidas} suspendidas`"
      />
      <KpiCard
        titulo="Comprobantes hoy"
        :valor="kpis ? String(kpis.comprobantes_hoy) : '—'"
        :icono="Calendar"
        subtitulo="emitidos en el día"
      />
    </div>

    <div class="grid-2col">
      <!-- Ingresos por mes -->
      <div v-if="dash" class="panel anim-entrada">
        <h3 class="panel__titulo">Ingresos (últimos 6 meses)</h3>
        <div v-if="dash.ingresos_por_mes.length" class="barras">
          <div v-for="m in dash.ingresos_por_mes" :key="m.mes" class="barra">
            <div class="barra__monto">{{ m.total > 0 ? moneda(m.total) : '' }}</div>
            <div class="barra__track">
              <div
                class="barra__fill"
                :style="{ height: `${(m.total / maxIngresoMes) * 100}%` }"
              ></div>
            </div>
            <div class="barra__label">{{ etiquetaMes(m.mes) }}</div>
          </div>
        </div>
        <p v-else class="vacio">Aún no hay pagos registrados.</p>
      </div>

      <!-- Próximos vencimientos -->
      <div v-if="dash" class="panel anim-entrada">
        <h3 class="panel__titulo">
          <AlertTriangle :size="16" /> Próximos vencimientos
        </h3>
        <div v-if="dash.proximos_vencimientos.length" class="venc-lista">
          <div
            v-for="e in dash.proximos_vencimientos"
            :key="e.id"
            class="venc"
            :class="claseUrgencia(e.dias_restantes)"
          >
            <div class="venc__info">
              <span class="venc__nombre">{{ e.razon_social }}</span>
              <span class="venc__meta">{{ e.plan }} · {{ fechaCorta(e.fecha_fin_suscripcion) }}</span>
            </div>
            <span class="venc__dias">{{ textoDias(e.dias_restantes) }}</span>
          </div>
        </div>
        <p v-else class="vacio">No hay vencimientos próximos.</p>
      </div>
    </div>

    <!-- Distribución por plan -->
    <div v-if="dash && dash.empresas_por_plan.length > 0" class="panel anim-entrada">
      <h3 class="panel__titulo">Distribución por plan</h3>
      <div class="planes-grid">
        <div
          v-for="grupo in dash.empresas_por_plan"
          :key="grupo.plan"
          class="plan-card"
        >
          <span class="plan-card__nombre">{{ grupo.plan }}</span>
          <span class="plan-card__cantidad">{{ numero(grupo.cantidad) }}</span>
          <span class="plan-card__label">{{ grupo.cantidad === 1 ? 'empresa' : 'empresas' }}</span>
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

.grid-2col {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--space-lg);
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
  display: flex;
  align-items: center;
  gap: 6px;
}
.vacio {
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-lg) 0;
}

/* Barras de ingresos */
.barras {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-sm);
  height: 220px;
}
.barra {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.barra__monto {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
  min-height: 14px;
  white-space: nowrap;
}
.barra__track {
  flex: 1;
  width: 60%;
  max-width: 42px;
  display: flex;
  align-items: flex-end;
  background: var(--bg-surface-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.barra__fill {
  width: 100%;
  background: linear-gradient(180deg, var(--accent), var(--accent-soft));
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  min-height: 2px;
  transition: height 0.4s ease;
}
.barra__label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 6px;
  text-transform: capitalize;
}

/* Vencimientos */
.venc-lista { display: flex; flex-direction: column; gap: var(--space-sm); }
.venc {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface-2);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--border);
}
.venc--vencido { border-left-color: var(--danger); }
.venc--urgente { border-left-color: var(--warning); }
.venc--pronto { border-left-color: var(--info); }
.venc__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.venc__nombre {
  font-weight: 600;
  font-size: var(--text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.venc__meta { font-size: var(--text-xs); color: var(--text-muted); }
.venc__dias {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
  margin-left: var(--space-sm);
}
.venc--vencido .venc__dias { color: var(--danger); }
.venc--urgente .venc__dias { color: var(--warning); }

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
  .grid-2col { grid-template-columns: 1fr; }
  .planes-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .kpis-grid { grid-template-columns: 1fr; }
}
</style>
