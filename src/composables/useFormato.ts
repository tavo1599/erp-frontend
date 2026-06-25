// src/composables/useFormato.ts
export function useFormato() {
  // Formatea a soles peruanos: 1234.5 → "S/ 1,234.50"
  function moneda(valor: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(valor || 0);
  }

  // Formatea número: 1234 → "1,234"
  function numero(valor: number): string {
    return new Intl.NumberFormat('es-PE').format(valor || 0);
  }

  // Formatea fecha: "2026-05-25" → "25 may 2026"
  function fecha(valor: string | Date): string {
    if (!valor) return '';
    return new Date(valor).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return { moneda, numero, fecha };
}