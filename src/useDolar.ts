import { useCallback, useEffect, useState } from 'react';

// Fuente única de cotizaciones del dólar para toda la app. Antes había dos
// caminos separados: useDolarOficial.ts (una llamada por tipo a
// dolarapi.com, y solo "oficial") y useDolarHistorico.ts (otra API para
// fechas pasadas). Este hook los reemplaza a los dos: una sola consulta a
// dolarapi.com trae los 4 tipos de una vez, y expone también la búsqueda
// histórica para el seguimiento de pagos.
export type TipoDolar = 'oficial' | 'blue' | 'bolsa' | 'contadoconliqui';

// Los 4 tipos que soportan tanto la cotización en vivo (dolarapi.com,
// GET /v1/dolares) como la histórica (api.argentinadatos.com, que a su vez
// toma sus datos de dolarapi.com). Quedan afuera mayorista/cripto/tarjeta:
// no los pidió nadie y así el selector se mantiene chico.
export const TIPOS_DOLAR: TipoDolar[] = ['oficial', 'blue', 'bolsa', 'contadoconliqui'];

export const NOMBRE_TIPO_DOLAR: Record<TipoDolar, string> = {
  oficial: 'Oficial',
  blue: 'Blue',
  bolsa: 'MEP',
  contadoconliqui: 'CCL',
};

export type EstadoDolar = 'cargando' | 'ok' | 'error';

interface DolarApiItem {
  casa: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface CotizacionHistoricaResponse {
  casa: string;
  compra: number;
  venta: number;
  fecha: string;
}

function esHoy(fechaISO: string): boolean {
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`;
  return fechaISO === hoyISO;
}

// api.argentinadatos.com espera la fecha como YYYY/MM/DD; acá se recibe en
// formato ISO (YYYY-MM-DD), el que produce un <input type="date"> y el que
// devuelve la columna `date` de Postgres.
function fechaAFormatoApi(fechaISO: string): string {
  return fechaISO.replaceAll('-', '/');
}

export function useDolar() {
  // Puede faltar alguna clave si dolarapi.com no devolviera ese tipo puntual
  // (no debería pasar, pero mejor no asumirlo con un Record completo).
  const [cotizaciones, setCotizaciones] = useState<Partial<
    Record<TipoDolar, number>
  > | null>(null);
  const [estado, setEstado] = useState<EstadoDolar>('cargando');
  const [actualizado, setActualizado] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setEstado('cargando');
    fetch('https://dolarapi.com/v1/dolares')
      .then((r) => {
        if (!r.ok) throw new Error('Respuesta no válida');
        return r.json() as Promise<DolarApiItem[]>;
      })
      .then((items) => {
        const porTipo: Partial<Record<TipoDolar, number>> = {};
        let ultimaActualizacion: string | null = null;

        for (const item of items) {
          if ((TIPOS_DOLAR as string[]).includes(item.casa)) {
            porTipo[item.casa as TipoDolar] = item.venta;
            ultimaActualizacion = item.fechaActualizacion ?? ultimaActualizacion;
          }
        }

        setCotizaciones(porTipo);
        setActualizado(ultimaActualizacion);
        setEstado('ok');
      })
      .catch(() => {
        setEstado('error');
      });
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  /**
   * Cotización de un tipo de dólar para una fecha puntual, con fallback a
   * la cotización en vivo cuando no hay dato histórico (típicamente porque
   * la fecha pedida es hoy, o porque api.argentinadatos.com no respondió).
   */
  const buscarDolarHistorico = useCallback(
    async (tipo: TipoDolar, fecha: string): Promise<number | null> => {
      if (!esHoy(fecha)) {
        try {
          const respuesta = await fetch(
            `https://api.argentinadatos.com/v1/cotizaciones/dolares/${tipo}/${fechaAFormatoApi(
              fecha
            )}`
          );
          if (respuesta.ok) {
            const datos = (await respuesta.json()) as CotizacionHistoricaResponse;
            if (typeof datos.venta === 'number') return datos.venta;
          }
        } catch {
          // Sin datos históricos para esa fecha: seguimos al fallback.
        }
      }

      const valorEnVivo = cotizaciones?.[tipo];
      if (valorEnVivo != null) return valorEnVivo;
      recargar();
      return null;
    },
    [cotizaciones, recargar]
  );

  return { cotizaciones, estado, actualizado, recargar, buscarDolarHistorico };
}
