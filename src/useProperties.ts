import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export const LIMITE_PLAN_FREE = 2;

export interface Propiedad {
  id: string;
  nombre: string;
  precio_compra: number;
  alquiler_mensual: number;
  dolar_venta: number;
  created_at: string;
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

  async function guardar(propiedad: {
    nombre: string;
    precio_compra: number;
    alquiler_mensual: number;
    dolar_venta: number;
  }): Promise<string | null> {
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

  async function borrar(id: string) {
    await supabase.from('properties').delete().eq('id', id);
    await recargar();
  }

  return { propiedades, cargando, guardar, borrar, recargar };
}
