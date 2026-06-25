<!-- src/views/PermisosView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  ShieldCheck, RefreshCw, Info, Check, X, ChevronDown, ChevronRight,
} from 'lucide-vue-next';
import { permisosService, type MatrizPermisos } from '../services/permisos.service';
import { useToast } from '../composables/useToast';
import { useFrases } from '../composables/useFrases';
import BaseSpinner from '../components/ui/BaseSpinner.vue';

const toast = useToast();
const { frase } = useFrases();

const cargando = ref(true);
const textoCarga = ref(frase('configuracion'));
const matriz = ref<MatrizPermisos | null>(null);
const modulosColapsados = ref<Record<string, boolean>>({});
const guardando = ref<Record<string, boolean>>({});

// Etiquetas amigables para los roles
const etiquetasRol: Record<string, string> = {
  ADMIN_EMPRESA: 'Administrador',
  VENDEDOR: 'Vendedor',
  CONTADOR: 'Contador',
  SUPER_ADMIN: 'Super Admin',
};

const coloresRol: Record<string, string> = {
  ADMIN_EMPRESA: '#c2643f',
  VENDEDOR: '#1e88e5',
  CONTADOR: '#43a047',
  SUPER_ADMIN: '#8e24aa',
};

async function cargar() {
  cargando.value = true;
  try {
    matriz.value = await permisosService.obtenerMatriz();
  } catch (e: any) {
    toast.error('No se pudo cargar la matriz de permisos');
  } finally {
    cargando.value = false;
  }
}

// Clave única para identificar un permiso/rol mientras se guarda
function claveGuardar(rol: string, permiso: string) {
  return `${rol}:${permiso}`;
}

async function cambiarPermiso(modulo: string, codigo: string, rol: string, valorActual: boolean) {
  const nuevoValor = !valorActual;
  const clave = claveGuardar(rol, codigo);

  // Cambio optimista (se actualiza en pantalla inmediato)
  const permiso = matriz.value?.modulos
    .find((m) => m.modulo === modulo)
    ?.permisos.find((p) => p.codigo === codigo);
  if (!permiso) return;
  permiso.roles[rol] = nuevoValor;

  guardando.value[clave] = true;
  try {
    await permisosService.actualizar(rol, codigo, nuevoValor);
    toast.exito(`Permiso actualizado`, 2000);
  } catch (e: any) {
    // Revertir si falla
    permiso.roles[rol] = valorActual;
    toast.error('No se pudo actualizar el permiso');
  } finally {
    guardando.value[clave] = false;
  }
}

function colapsarTodos() {
  if (!matriz.value) return;
  for (const m of matriz.value.modulos) {
    modulosColapsados.value[m.modulo] = true;
  }
}

function expandirTodos() {
  if (!matriz.value) return;
  for (const m of matriz.value.modulos) {
    modulosColapsados.value[m.modulo] = false;
  }
}

// Total de permisos activos por rol (para el resumen visual)
const totalesPorRol = computed(() => {
  if (!matriz.value) return {};
  const totales: Record<string, number> = {};
  for (const rol of matriz.value.roles) {
    totales[rol] = 0;
  }
  for (const modulo of matriz.value.modulos) {
    for (const permiso of modulo.permisos) {
      for (const rol of matriz.value.roles) {
        if (permiso.roles[rol]) totales[rol]++;
      }
    }
  }
  return totales;
});

const totalPermisos = computed(() => {
  if (!matriz.value) return 0;
  return matriz.value.modulos.reduce(
    (sum, m) => sum + m.permisos.length,
    0,
  );
});

onMounted(cargar);
</script>

<template>
  <div class="anim-entrada">
    <div class="pagina-header">
      <div>
        <h1><ShieldCheck :size="22" /> Permisos por rol</h1>
        <p class="pagina-subtitulo">
          Configura qué puede hacer cada rol en tu empresa. Los cambios se aplican al instante.
        </p>
      </div>
      <div class="acciones-header">
        <button class="btn-secundario" @click="cargar" :disabled="cargando">
          <RefreshCw :size="16" :class="{ 'spin': cargando }" /> Recargar
        </button>
      </div>
    </div>

    <!-- Aviso explicativo -->
    <div class="aviso">
      <Info :size="18" />
      <div>
        <strong>Cómo funciona:</strong>
        Marca los permisos que cada rol puede ejecutar. Los cambios se guardan automáticamente.
        El rol Super Admin tiene todos los permisos (no editable).
      </div>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" class="cargando-completo">
      <BaseSpinner :texto="textoCarga" />
    </div>

    <!-- Contenido -->
    <div v-else-if="matriz">
      <!-- Resumen por rol -->
      <div class="resumen-roles">
        <div
          v-for="rol in matriz.roles"
          :key="rol"
          class="rol-tarjeta"
          :style="{ borderLeftColor: coloresRol[rol] }"
        >
          <div class="rol-tarjeta__nombre">{{ etiquetasRol[rol] || rol }}</div>
          <div class="rol-tarjeta__count">
            <strong :style="{ color: coloresRol[rol] }">
              {{ totalesPorRol[rol] || 0 }}
            </strong>
            / {{ totalPermisos }} permisos
          </div>
        </div>
      </div>

      <!-- Controles -->
      <div class="controles">
        <button class="btn-link" @click="expandirTodos">Expandir todos</button>
        <span class="separador">·</span>
        <button class="btn-link" @click="colapsarTodos">Colapsar todos</button>
      </div>

      <!-- Tabla por módulo -->
      <div
        v-for="modulo in matriz.modulos"
        :key="modulo.modulo"
        class="modulo-tarjeta"
      >
        <button
          class="modulo-header"
          @click="modulosColapsados[modulo.modulo] = !modulosColapsados[modulo.modulo]"
        >
          <component
            :is="modulosColapsados[modulo.modulo] ? ChevronRight : ChevronDown"
            :size="18"
          />
          <span class="modulo-nombre">{{ modulo.modulo }}</span>
          <span class="modulo-count">{{ modulo.permisos.length }} permisos</span>
        </button>

        <div v-if="!modulosColapsados[modulo.modulo]" class="modulo-tabla">
          <!-- Cabecera -->
          <div class="tabla-fila tabla-fila--header">
            <div class="tabla-col-permiso">Permiso</div>
            <div
              v-for="rol in matriz.roles"
              :key="rol"
              class="tabla-col-rol"
            >
              <span :style="{ color: coloresRol[rol] }">
                {{ etiquetasRol[rol] || rol }}
              </span>
            </div>
          </div>

          <!-- Filas de permisos -->
          <div
            v-for="permiso in modulo.permisos"
            :key="permiso.codigo"
            class="tabla-fila"
          >
            <div class="tabla-col-permiso">
              <div class="permiso-nombre">{{ permiso.nombre }}</div>
              <div class="permiso-descripcion">{{ permiso.descripcion }}</div>
            </div>
            <div
              v-for="rol in matriz.roles"
              :key="rol"
              class="tabla-col-rol"
            >
              <button
                class="toggle"
                :class="{
                  'toggle--activo': permiso.roles[rol],
                  'toggle--guardando': guardando[`${rol}:${permiso.codigo}`],
                }"
                :style="permiso.roles[rol] ? { background: coloresRol[rol] } : {}"
                @click="cambiarPermiso(modulo.modulo, permiso.codigo, rol, permiso.roles[rol])"
                :disabled="guardando[`${rol}:${permiso.codigo}`]"
                :title="permiso.roles[rol] ? 'Click para deshabilitar' : 'Click para habilitar'"
              >
                <Check v-if="permiso.roles[rol]" :size="14" />
                <X v-else :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagina-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
  gap: var(--space-md);
}
.pagina-header h1 { display: flex; align-items: center; gap: var(--space-sm); }
.pagina-subtitulo { color: var(--text-secondary); margin-top: 4px; font-size: var(--text-sm); }

.acciones-header { display: flex; gap: var(--space-sm); }
.btn-secundario {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
}
.btn-secundario:hover { color: var(--accent); border-color: var(--accent); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.aviso {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--accent-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
  line-height: 1.5;
}
.aviso strong { display: block; margin-bottom: 2px; }
.aviso svg { flex-shrink: 0; margin-top: 2px; color: var(--accent); }

.cargando-completo {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

/* Resumen por rol */
.resumen-roles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
.rol-tarjeta {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-left: 4px solid;
  border-radius: var(--radius-md);
  padding: var(--space-md);
}
.rol-tarjeta__nombre {
  font-size: var(--text-xs);
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  font-weight: 700;
  margin-bottom: 6px;
}
.rol-tarjeta__count {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.rol-tarjeta__count strong {
  font-size: var(--text-xl);
  font-weight: 700;
}

/* Controles */
.controles {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  font-size: var(--text-sm);
}
.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: var(--text-sm);
  cursor: pointer;
  text-decoration: underline;
}
.btn-link:hover { filter: brightness(0.8); }
.separador { color: var(--text-muted); }

/* Módulos */
.modulo-tarjeta {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
  overflow: hidden;
}
.modulo-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface-2);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: var(--transition);
}
.modulo-header:hover { background: var(--accent-soft); }
.modulo-nombre {
  font-weight: 700;
  font-size: var(--text-base);
  color: var(--text-primary);
  flex: 1;
}
.modulo-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* Tabla */
.modulo-tabla {
  padding: var(--space-md);
}
.tabla-fila {
  display: grid;
  grid-template-columns: 2fr repeat(3, 100px);
  gap: var(--space-md);
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border);
}
.tabla-fila:last-child { border-bottom: none; }
.tabla-fila--header {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  font-weight: 700;
  background: var(--bg-surface-2);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-sm);
}
.tabla-col-rol {
  text-align: center;
}
.tabla-col-rol span { font-weight: 700; font-size: var(--text-xs); }
.permiso-nombre {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-primary);
  margin-bottom: 2px;
}
.permiso-descripcion {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* Toggle */
.toggle {
  width: 36px;
  height: 22px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--bg-surface-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: var(--transition);
  margin: 0 auto;
}
.toggle:hover { transform: scale(1.05); }
.toggle--activo {
  color: white;
  border: none;
}
.toggle--guardando { opacity: 0.6; cursor: wait; }

@media (max-width: 800px) {
  .tabla-fila {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }
  .tabla-fila--header { display: none; }
  .tabla-col-rol {
    display: flex;
    justify-content: space-between;
    text-align: left;
  }
  .tabla-col-rol::before {
    content: attr(data-rol);
    font-weight: 700;
    font-size: var(--text-xs);
  }
}
</style>