import { useCallback } from 'react';
import { useDolarOficial } from './useDolarOficial';

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

// La API espera la fecha como YYYY/MM/DD; acá se recibe en formato ISO
// (YYYY-MM-DD), que es el que produce un <input type="date"> y el que
// devuelve la columna `date` de Postgres.
function fechaAFormatoApi(fechaISO: string): string {
  return fechaISO.replaceAll('-', '/');
}

/**
 * Cotización del dólar oficial para una fecha puntual, con fallback a la
 * cotización actual cuando la API histórica no tiene el dato (típicamente
 * porque la fecha pedida es hoy, o porque el servicio no respondió).
 */
export function useDolarHistorico() {
  const { valorAutomatico, recargar } = useDolarOficial();

  const buscarDolarOficial = useCallback(
    async (fecha: string): Promise<number | null> => {
      if (!esHoy(fecha)) {
        try {
          const respuesta = await fetch(
            `https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${fechaAFormatoApi(
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

      // Fallback: cotización actual (ya resuelta por useDolarOficial, o
      // en camino). Si tampoco hay valor automático disponible todavía,
      // se reintenta la carga y se devuelve null: quien use este hook
      // debe permitir que el usuario ingrese el valor a mano en ese caso.
      if (valorAutomatico != null) return valorAutomatico;
      recargar();
      return null;
    },
    [valorAutomatico, recargar]
  );

  return { buscarDolarOficial };
}
