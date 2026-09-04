// Umbral de rentabilidad considerado "bueno" para inversión en alquiler
export const UMBRAL_RENTABILIDAD = 6;

/**
 * Normaliza montos ingresados en formato corto.
 * Si el usuario escribe un número menor a 1000, se asume que quiso decir
 * "en miles" (ej: 47 -> 47000, 450 -> 450000). Si ya escribió el número
 * completo (ej: 47000), se toma literal.
 */
export function normalizarMonto(valor: number): number {
  if (!isFinite(valor) || valor <= 0) return 0;
  return valor < 1000 ? valor * 1000 : valor;
}

export interface ResultadoRentabilidad {
  precioCompraUSD: number;
  alquilerMensualARS: number;
  dolarVenta: number;
  alquilerMensualUSD: number;
  alquilerAnualUSD: number;
  rentabilidadAnual: number;
}

export function calcularRentabilidad(
  precioCompraInput: number,
  alquilerMensualInput: number,
  dolarVenta: number
): ResultadoRentabilidad {
  const precioCompraUSD = normalizarMonto(precioCompraInput);
  const alquilerMensualARS = normalizarMonto(alquilerMensualInput);

  const alquilerMensualUSD = dolarVenta > 0 ? alquilerMensualARS / dolarVenta : 0;
  const alquilerAnualUSD = alquilerMensualUSD * 12;
  const rentabilidadAnual =
    precioCompraUSD > 0 ? (alquilerAnualUSD / precioCompraUSD) * 100 : 0;

  return {
    precioCompraUSD,
    alquilerMensualARS,
    dolarVenta,
    alquilerMensualUSD,
    alquilerAnualUSD,
    rentabilidadAnual,
  };
}

export function formatoARS(valor: number): string {
  return valor.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

export function formatoUSD(valor: number): string {
  return valor.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

export function formatoPorcentaje(valor: number): string {
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
