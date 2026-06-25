// src/composables/useToast.ts
import { ref } from 'vue';

export interface Toast {
  id: number;
  tipo: 'exito' | 'error' | 'info' | 'advertencia';
  mensaje: string;
}

// Estado global compartido (fuera de la función, para que sea único)
const toasts = ref<Toast[]>([]);
let contador = 0;

export function useToast() {
  function mostrar(tipo: Toast['tipo'], mensaje: string, duracion = 3500) {
    const id = ++contador;
    toasts.value.push({ id, tipo, mensaje });
    setTimeout(() => cerrar(id), duracion);
  }

  function cerrar(id: number) {
    const i = toasts.value.findIndex((t) => t.id === id);
    if (i !== -1) toasts.value.splice(i, 1);
  }

  return {
    toasts,
    cerrar,
    exito: (msg: string, duracion?: number) => mostrar('exito', msg, duracion),
    error: (msg: string, duracion?: number) => mostrar('error', msg, duracion),
    info: (msg: string, duracion?: number) => mostrar('info', msg, duracion),
    advertencia: (msg: string, duracion?: number) => mostrar('advertencia', msg, duracion),
  };
}