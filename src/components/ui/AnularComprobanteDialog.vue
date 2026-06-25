<!-- src/components/ui/AnularComprobanteDialog.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue';
import { FileX, FileMinus, AlertCircle, X } from 'lucide-vue-next';
import BaseButton from './BaseButton.vue';

interface Props {
  modelValue: boolean;
  tipoComprobante: string; // '01' factura, '03' boleta
  comprobante: string;     // ej "F001-00000123"
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [v: boolean];
  'baja': [motivo: string];
  'nota-credito': [];
  'solo-interna': [];
}>();

const opcion = ref<'baja' | 'nota' | 'interna' | null>(null);
const motivo = ref('ANULACIÓN DE LA OPERACIÓN');

watch(() => props.modelValue, (v) => {
  if (v) {
    opcion.value = null;
    motivo.value = 'ANULACIÓN DE LA OPERACIÓN';
  }
});

const esFactura = () => props.tipoComprobante === '01';

function cerrar() {
  emit('update:modelValue', false);
}

function continuar() {
  if (!opcion.value) return;
  if (opcion.value === 'baja') emit('baja', motivo.value);
  if (opcion.value === 'nota') emit('nota-credito');
  if (opcion.value === 'interna') emit('solo-interna');
  cerrar();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="overlay" @click.self="cerrar">
        <div class="dialog">
          <div class="dialog__head">
            <h3>Anular {{ esFactura() ? 'factura' : 'boleta' }} {{ comprobante }}</h3>
            <button class="dialog__cerrar" @click="cerrar"><X :size="18" /></button>
          </div>

          <p class="dialog__intro">
            ¿Cómo deseas anularlo ante SUNAT? Elige la opción que corresponda al caso.
          </p>

          <div class="opciones">
            <!-- Opción 1: Comunicación de baja (solo facturas) -->
            <label v-if="esFactura()" class="opcion" :class="{ 'opcion--activa': opcion === 'baja' }">
              <input type="radio" value="baja" v-model="opcion" />
              <div class="opcion__icono opcion__icono--baja"><FileX :size="20" /></div>
              <div class="opcion__cuerpo">
                <span class="opcion__titulo">Comunicación de baja</span>
                <span class="opcion__desc">
                  Anula la factura ante SUNAT (recomendado). Disponible hasta el 7° día calendario del mes siguiente a la emisión.
                </span>
              </div>
            </label>

            <!-- Opción 2: Nota de crédito -->
            <label class="opcion" :class="{ 'opcion--activa': opcion === 'nota' }">
              <input type="radio" value="nota" v-model="opcion" />
              <div class="opcion__icono opcion__icono--nota"><FileMinus :size="20" /></div>
              <div class="opcion__cuerpo">
                <span class="opcion__titulo">Emitir nota de crédito</span>
                <span class="opcion__desc">
                  Crea una nota de crédito que anula o ajusta el comprobante. Disponible siempre, también para boletas.
                </span>
              </div>
            </label>

            <!-- Opción 3: Solo interna -->
            <label class="opcion" :class="{ 'opcion--activa': opcion === 'interna' }">
              <input type="radio" value="interna" v-model="opcion" />
              <div class="opcion__icono opcion__icono--peligro"><AlertCircle :size="20" /></div>
              <div class="opcion__cuerpo">
                <span class="opcion__titulo">Solo anular en mi sistema</span>
                <span class="opcion__desc">
                  Revierte stock y finanzas, pero NO le avisa a SUNAT. Úsalo solo si el comprobante fue rechazado antes.
                </span>
              </div>
            </label>
          </div>

          <!-- Motivo (solo si eligió baja) -->
          <div v-if="opcion === 'baja'" class="motivo-baja">
            <label class="motivo-baja__label">Motivo de la baja</label>
            <input v-model="motivo" type="text" class="motivo-baja__input" placeholder="Motivo" maxlength="100" />
          </div>

          <div class="dialog__acciones">
            <BaseButton variant="secondary" @click="cerrar">Cancelar</BaseButton>
            <BaseButton :disabled="!opcion" @click="continuar">Continuar</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  width: 100vw; height: 100vh;
  background: rgba(45, 42, 38, 0.3);
  display: flex; align-items: center; justify-content: center;
  z-index: 1500;
  padding: var(--space-lg);
  backdrop-filter: blur(2px);
}
.dialog {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-xl);
  width: 100%;
  max-width: 520px;
  max-height: 90vh; overflow-y: auto;
}
.dialog__head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-sm);
}
.dialog__head h3 { margin: 0; font-size: var(--text-lg); }
.dialog__cerrar {
  background: none; border: none; color: var(--text-muted);
  padding: 4px; cursor: pointer; display: flex; border-radius: var(--radius-sm);
}
.dialog__cerrar:hover { background: var(--bg-surface-2); }
.dialog__intro { color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-md); }

.opciones { display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-md); }
.opcion {
  display: flex; gap: var(--space-md); align-items: flex-start;
  padding: var(--space-md);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}
.opcion:hover { border-color: var(--accent); }
.opcion--activa { border-color: var(--accent); background: var(--accent-soft); }
.opcion input { margin-top: 4px; accent-color: var(--accent); }
.opcion__icono {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.opcion__icono--baja { background: var(--accent-soft); color: var(--accent); }
.opcion__icono--nota { background: var(--info-soft); color: var(--info); }
.opcion__icono--peligro { background: var(--warning-soft); color: var(--warning); }
.opcion__cuerpo { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.opcion__titulo { font-weight: 700; font-size: var(--text-sm); }
.opcion__desc { font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.4; }

.motivo-baja { margin-bottom: var(--space-md); }
.motivo-baja__label { font-size: var(--text-sm); color: var(--text-secondary); display: block; margin-bottom: 4px; }
.motivo-baja__input {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.dialog__acciones { display: flex; gap: var(--space-sm); justify-content: flex-end; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>