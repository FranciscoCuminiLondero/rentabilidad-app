import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { tipoDolarValido, type TipoDolar } from './useDolar';

export interface Propiedad {
  id: string;
  nombre: string;
  precio_compra: number;
  alquiler_mensual: number;
  dolar_venta: number;
  // Fecha desde la que se empezó a alquilar (para calcular meses transcurridos
  // en usePagos) y el % de rentabilidad previsto al momento de guardar la
  // propiedad, para comparar después contra lo cobrado realmente. Ambos son
  // opcionales porque propiedades guardadas antes de esta columna no los
  // tienen cargados.
  fecha_inicio_alquiler: string | null;
  prevision_rentabilidad_anual: number | null;
  // Tipo de cotización (oficial/blue/MEP/CCL) elegido para esta propiedad.
  // Se usa también para buscar el dólar histórico de sus pagos, así el
  // seguimiento queda consistente con la elección (ver useDolar.ts).
  tipo_dolar: TipoDolar;
  created_at: string;
}

// `prevision_rentabilidad_anual` no lo tipea el usuario en un formulario: lo
// completa quien llama a guardar/actualizar con la rentabilidadAnual ya
// calculada (ver calc.ts) al momento de guardar. Es opcional acá (junto con
// fecha_inicio_alquiler) para no romper a quien todavía guarda propiedades
// sin esta info.
interface DatosPropiedad {
  nombre: string;
  precio_compra: number;
  alquiler_mensual: number;
  dolar_venta: number;
  tipo_dolar: TipoDolar;
  fecha_inicio_alquiler?: string | null;
  prevision_rentabilidad_anual?: number | null;
}

// A diferencia de guardar (que inserta una fila nueva y necesita los campos
// core), actualizar admite parches parciales: por ejemplo, cargar solo
// fecha_inicio_alquiler sin tocar el resto (ver el botón "Agregar fecha de
// inicio de alquiler" en PropertyDetail.tsx).
type DatosActualizacionPropiedad = Partial<DatosPropiedad>;

// `limite` viene de useSubscription (LIMITE_POR_PLAN según el plan real del
// usuario): este hook no sabe nada de Mercado Pago ni de planes, solo
// respeta el número que le pasan.
export function useProperties(userId: string | undefined, limite: number) {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    if (!userId) {
      setPropiedades([]);
      return;
    }
    setCargando(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // tipo_dolar puede venir null/ausente en filas leídas antes de
      // aplicar supabase/schema-tipo-dolar.sql: se normaliza acá, en un
      // solo lugar, en vez de que cada componente tenga que acordarse.
      const propiedadesNormalizadas = (data as Propiedad[]).map((p) => ({
        ...p,
        tipo_dolar: tipoDolarValido(p.tipo_dolar),
      }));
      setPropiedades(propiedadesNormalizadas);
    }
    setCargando(false);
  }, [userId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function guardar(propiedad: DatosPropiedad): Promise<string | null> {
    if (!userId) return 'Tenés que iniciar sesión para guardar propiedades.';

    // El límite del plan se valida también acá (no solo en la UI). No
    // reemplaza una validación server-side real, pero evita el caso más
    // común de un usuario esquivando el límite desde la consola.
    if (propiedades.length >= limite) {
      return `Llegaste al límite de ${limite} propiedades de tu plan actual.`;
    }

    const { error } = await supabase.from('properties').insert({
      user_id: userId,
      ...propiedad,
    });

    if (error) return error.message;
    await recargar();
    return null;
  }

  async function actualizar(
    id: string,
    datos: DatosActualizacionPropiedad
  ): Promise<string | null> {
    const { error } = await supabase.from('properties').update(datos).eq('id', id);
    if (error) return error.message;
    await recargar();
    return null;
  }

  async function borrar(id: string) {
    await supabase.from('properties').delete().eq('id', id);
    await recargar();
  }

  return { propiedades, cargando, guardar, actualizar, borrar, recargar };
}
