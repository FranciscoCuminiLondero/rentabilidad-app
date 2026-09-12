import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export type EstadoPago = 'pagado' | 'atrasado';

export interface PagoAlquiler {
  id: string;
  property_id: string;
  fecha: string;
  monto_ars: number;
  dolar_dia: number;
  estado: EstadoPago;
  nota: string | null;
  created_at: string;
}

// Igual que en useProperties.ts: el shape que se le pasa a registrar/actualizar
// no exige todos los campos de la fila (id, property_id y created_at los
// resuelve la base).
interface DatosPagoAlquiler {
  fecha: string;
  monto_ars: number;
  dolar_dia: number;
  estado?: EstadoPago;
  nota?: string | null;
}

export interface ResumenAnualInput {
  precioCompraUSD: number;
  fechaInicioAlquiler: string | null;
  previsionRentabilidadAnual: number | null;
}

export interface ResumenAnual {
  totalCobradoUSD: number;
  mesesTranscurridos: number;
  // false antes de DIAS_MINIMOS_PARA_ANUALIZAR: con tan poco tiempo
  // transcurrido, anualizar dispara el % a números sin sentido (ej: 270%
  // con apenas el primer mes cobrado). En ese caso rentabilidadRealAnualizada
  // y diferenciaPuntosPorcentuales quedan en null; totalCobradoUSD sigue
  // siendo válido siempre (no depende de una extrapolación).
  suficienteHistorial: boolean;
  rentabilidadRealAnualizada: number | null;
  // null cuando no hay suficiente historial, o cuando la propiedad no tiene
  // previsionRentabilidadAnual guardada (propiedades creadas antes de
  // agregar esta columna).
  diferenciaPuntosPorcentuales: number | null;
  pagosAtrasados: number;
}

// Un mes: por debajo de esto, anualizar lo cobrado exagera demasiado la
// rentabilidad real como para que el número sea confiable.
const DIAS_MINIMOS_PARA_ANUALIZAR = 30;

const MS_POR_DIA = 1000 * 60 * 60 * 24;

function diasDesde(fechaISO: string): number {
  const inicio = new Date(`${fechaISO}T00:00:00`);
  const dias = (Date.now() - inicio.getTime()) / MS_POR_DIA;
  return Math.max(0, dias);
}

export function usePagos(propertyId: string | undefined) {
  const [pagos, setPagos] = useState<PagoAlquiler[]>([]);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    if (!propertyId) {
      setPagos([]);
      return;
    }
    setCargando(true);
    const { data, error } = await supabase
      .from('pagos_alquiler')
      .select('*')
      .eq('property_id', propertyId)
      .order('fecha', { ascending: true });

    if (!error && data) setPagos(data as PagoAlquiler[]);
    setCargando(false);
  }, [propertyId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function registrarPago(pago: DatosPagoAlquiler): Promise<string | null> {
    if (!propertyId) {
      return 'No hay una propiedad seleccionada para registrar el pago.';
    }

    const { error } = await supabase.from('pagos_alquiler').insert({
      property_id: propertyId,
      estado: 'pagado',
      ...pago,
    });

    if (error) return error.message;
    await recargar();
    return null;
  }

  async function actualizarPago(
    id: string,
    datos: DatosPagoAlquiler
  ): Promise<string | null> {
    const { error } = await supabase
      .from('pagos_alquiler')
      .update(datos)
      .eq('id', id);

    if (error) return error.message;
    await recargar();
    return null;
  }

  async function borrarPago(id: string) {
    await supabase.from('pagos_alquiler').delete().eq('id', id);
    await recargar();
  }

  /**
   * Compara lo cobrado realmente contra la previsión de rentabilidad anual
   * guardada en la propiedad. Recibe el precio de compra en USD, la fecha de
   * inicio del alquiler y la previsión, porque usePagos solo conoce los
   * pagos: esos tres datos viven en la propiedad (ver useProperties.ts).
   */
  function resumenAnual({
    precioCompraUSD,
    fechaInicioAlquiler,
    previsionRentabilidadAnual,
  }: ResumenAnualInput): ResumenAnual {
    const pagosConfirmados = pagos.filter((p) => p.estado === 'pagado');

    const totalCobradoUSD = pagosConfirmados.reduce(
      (acc, p) => acc + (p.dolar_dia > 0 ? p.monto_ars / p.dolar_dia : 0),
      0
    );

    // Se anualiza con el tiempo real transcurrido (días), no con una
    // cantidad fija de días por mes, para no distorsionar el resultado en
    // los primeros meses de seguimiento.
    const diasTranscurridos = fechaInicioAlquiler
      ? diasDesde(fechaInicioAlquiler)
      : 0;
    const mesesTranscurridos = diasTranscurridos / (365 / 12);
    const suficienteHistorial = diasTranscurridos >= DIAS_MINIMOS_PARA_ANUALIZAR;

    // Con menos de DIAS_MINIMOS_PARA_ANUALIZAR de historial (o precio de
    // compra inválido) no se anualiza: el % quedaría sin sentido. Esto
    // también cubre diasTranscurridos === 0 (fecha de inicio es hoy), que
    // de otro modo dividiría por cero.
    const rentabilidadRealAnualizada =
      suficienteHistorial && precioCompraUSD > 0
        ? (totalCobradoUSD / precioCompraUSD) * (365 / diasTranscurridos) * 100
        : null;

    const diferenciaPuntosPorcentuales =
      rentabilidadRealAnualizada != null && previsionRentabilidadAnual != null
        ? rentabilidadRealAnualizada - previsionRentabilidadAnual
        : null;

    return {
      totalCobradoUSD,
      mesesTranscurridos,
      suficienteHistorial,
      rentabilidadRealAnualizada,
      diferenciaPuntosPorcentuales,
      pagosAtrasados: pagos.length - pagosConfirmados.length,
    };
  }

  return {
    pagos,
    cargando,
    registrarPago,
    actualizarPago,
    borrarPago,
    resumenAnual,
    recargar,
  };
}
