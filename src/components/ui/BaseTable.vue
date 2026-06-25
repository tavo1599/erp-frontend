<!-- src/components/ui/BaseTable.vue -->
<script setup lang="ts">
interface Columna {
  clave: string;
  titulo: string;
  alineacion?: 'left' | 'center' | 'right';
}

defineProps<{
  columnas: Columna[];
  filas: any[];
  cargando?: boolean;
  textoVacio?: string;
}>();
</script>

<template>
  <div class="tabla-wrapper">
    <table class="tabla">
      <thead>
        <tr>
          <th
            v-for="col in columnas"
            :key="col.clave"
            :style="{ textAlign: col.alineacion || 'left' }"
          >
            {{ col.titulo }}
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Cargando: filas skeleton -->
        <tr v-if="cargando" v-for="n in 5" :key="`sk-${n}`">
          <td v-for="col in columnas" :key="col.clave">
            <div class="skeleton" style="height: 16px;"></div>
          </td>
        </tr>

        <!-- Sin datos -->
        <tr v-else-if="filas.length === 0">
          <td :colspan="columnas.length" class="tabla__vacio">
            {{ textoVacio || 'No hay registros' }}
          </td>
        </tr>

        <!-- Datos -->
        <tr v-else v-for="(fila, i) in filas" :key="i" class="tabla__fila">
          <td
            v-for="col in columnas"
            :key="col.clave"
            :style="{ textAlign: col.alineacion || 'left' }"
          >
            <!-- slot personalizado por columna, o el valor directo -->
            <slot :name="col.clave" :fila="fila" :valor="fila[col.clave]">
              {{ fila[col.clave] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tabla-wrapper {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.tabla {
  width: 100%;
  border-collapse: collapse;
}
.tabla thead th {
  text-align: left;
  padding: var(--space-md);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--bg-surface-2);
  border-bottom: 1px solid var(--border);
}
.tabla tbody td {
  padding: var(--space-md);
  font-size: var(--text-sm);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
}
.tabla__fila {
  transition: background var(--transition);
}
.tabla__fila:hover {
  background: var(--bg-surface-2);
}
.tabla tbody tr:last-child td {
  border-bottom: none;
}
.tabla__vacio {
  text-align: center !important;
  color: var(--text-muted);
  padding: var(--space-xl) !important;
}
</style>