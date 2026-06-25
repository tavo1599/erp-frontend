// src/composables/useConfirm.ts
import { ref } from 'vue';

interface OpcionesConfirm {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean; // si es true, el botón de confirmar es rojo
}

// Estado global compartido
const visible = ref(false);
const opciones = ref<OpcionesConfirm>({ titulo: '', mensaje: '' });
let resolver: ((valor: boolean) => void) | null = null;

export function useConfirm() {
  // Devuelve una promesa: true si confirma, false si cancela
  function confirmar(opts: OpcionesConfirm): Promise<boolean> {
    opciones.value = opts;
    visible.value = true;
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function aceptar() {
    visible.value = false;
    resolver?.(true);
    resolver = null;
  }

  function cancelar() {
    visible.value = false;
    resolver?.(false);
    resolver = null;
  }

  return { visible, opciones, confirmar, aceptar, cancelar };
}