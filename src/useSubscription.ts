import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export type Plan = 'free' | 'basico' | 'pro';
export type EstadoSuscripcion = 'trialing' | 'active' | 'cancelled' | 'past_due';

export interface Suscripcion {
  plan: Plan;
  status: EstadoSuscripcion;
  mercadopago_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

// Debe coincidir con los planes que ofrece PricingModal.tsx y con lo que
// entiende supabase/functions/crear-suscripcion/index.ts.
export const LIMITE_POR_PLAN: Record<Plan, number> = {
  free: 2,
  basico: 10,
  pro: Infinity,
};

export const NOMBRE_PLAN: Record<Plan, string> = {
  free: 'Free',
  basico: 'Básico',
  pro: 'Pro',
};

export function formatoLimite(limite: number): string {
  return limite === Infinity ? '∞' : String(limite);
}

// Texto corto para mostrar el plan/estado en la UI (ver App.tsx, sección
// "Mis propiedades"). No hace falta separar plan y status en dos textos:
// alcanza con una línea que resuma el estado actual de la suscripción.
export function formatoEstadoSuscripcion(suscripcion: Suscripcion | null): string {
  const plan = suscripcion?.plan ?? 'free';
  const nombre = `Plan ${NOMBRE_PLAN[plan]}`;

  if (plan === 'free' || !suscripcion) return nombre;

  if (suscripcion.status === 'trialing') {
    const fecha = suscripcion.trial_ends_at
      ? new Date(suscripcion.trial_ends_at).toLocaleDateString('es-AR')
      : null;
    return fecha ? `${nombre} · Prueba gratis hasta el ${fecha}` : `${nombre} · Prueba gratis`;
  }
  if (suscripcion.status === 'past_due') return `${nombre} · Pago pendiente`;
  if (suscripcion.status === 'cancelled') return `${nombre} · Cancelada`;
  return nombre;
}

export function useSubscription(userId: string | undefined) {
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    if (!userId) {
      setSuscripcion(null);
      return;
    }
    setCargando(true);
    // RLS en subscriptions solo deja leer la fila propia (auth.uid()), así
    // que no hace falta un .eq('user_id', ...) acá: siempre va a traer, a
    // lo sumo, una sola fila.
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'plan, status, mercadopago_subscription_id, trial_ends_at, current_period_end'
      )
      .maybeSingle();

    if (!error && data) setSuscripcion(data as Suscripcion);
    setCargando(false);
  }, [userId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Sin fila todavía (falló la lectura, o el trigger de bootstrap no llegó
  // a correr) se asume 'free': nunca se deja pasar un límite de más por un
  // problema de lectura.
  const plan = suscripcion?.plan ?? 'free';
  const limitePropiedades = LIMITE_POR_PLAN[plan];

  return { suscripcion, plan, limitePropiedades, cargando, recargar };
}
