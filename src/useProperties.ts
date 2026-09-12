import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export const LIMITE_PLAN_FREE = 2;

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
  created_at: string;
}

// `prevision_rentabilidad_anual` no lo tipea el usuario en un formulario: lo
// completa quien llama a guardar/actualizar con la rentabilidadAnual ya
// calculada (ver calc.ts) al momento de guardar. Ambos campos son opcionales
// acá para no romper a quien todavía guarda propiedades sin esta info.
interface DatosPropiedad {
  nombre: string;
  precio_compra: number;
  alquiler_mensual: number;
  dolar_venta: number;
  fecha_inicio_alquiler?: string | null;
  prevision_rentabilidad_anual?: number | null;
}

export function useProperties(userId: string | undefined) {
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

    if (!error && data) setPropiedades(data as Propiedad[]);
    setCargando(false);
  }, [userId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function guardar(propiedad: DatosPropiedad): Promise<string | null> {
    if (!userId) return 'Tenés que iniciar sesión para guardar propiedades.';

    // El límite del plan free se valida también acá (no solo en la UI).
    // No reemplaza una validación server-side real, pero evita el caso
    // más común de un usuario esquivando el límite desde la consola.
    if (propiedades.length >= LIMITE_PLAN_FREE) {
      return `Llegaste al límite de ${LIMITE_PLAN_FREE} propiedades del plan gratuito.`;
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
    datos: DatosPropiedad
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
