import { useState } from 'react';
import { supabase } from './supabaseClient';
import { NOMBRE_PLAN, type Plan } from './useSubscription';

interface PricingModalProps {
  planActual: Plan;
  onClose: () => void;
}

type PlanPago = 'basico' | 'pro';

// Deben coincidir con las constantes de
// supabase/functions/crear-suscripcion/index.ts.
const PRECIO_BASICO_ARS = 4999;
const PRECIO_PRO_ARS = 9999;
const DIAS_PRUEBA_GRATIS = 7;

const PRECIO_POR_PLAN: Record<PlanPago, number> = {
  basico: PRECIO_BASICO_ARS,
  pro: PRECIO_PRO_ARS,
};

const FEATURES_POR_PLAN: Record<PlanPago, string[]> = {
  basico: ['Hasta 10 propiedades guardadas', 'Seguimiento de pagos de alquiler'],
  pro: ['Propiedades ilimitadas', 'Seguimiento de pagos de alquiler'],
};

function formatoPrecio(valor: number): string {
  return valor.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

// supabase-js expone el body de un error 4xx/5xx de la función en
// error.context (la Response cruda) en vez de en error.message. Sin esto
// se pierde el mensaje claro que arma crear-suscripcion/index.ts.
async function extraerMensajeError(error: unknown): Promise<string> {
  const generico = 'No se pudo iniciar la suscripción.';
  if (!error || typeof error !== 'object') return generico;

  const contexto = (error as { context?: unknown }).context;
  if (contexto instanceof Response) {
    try {
      const cuerpo = await contexto.clone().json();
      if (typeof cuerpo?.error === 'string') return cuerpo.error;
    } catch {
      // el body no era JSON parseable: seguimos al mensaje genérico.
    }
  }

  const mensaje = (error as { message?: unknown }).message;
  return typeof mensaje === 'string' ? mensaje : generico;
}

export function PricingModal({ planActual, onClose }: PricingModalProps) {
  const [enviando, setEnviando] = useState<PlanPago | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleElegirPlan(plan: PlanPago) {
    setError(null);
    setEnviando(plan);

    // user_id/email no se mandan: crear-suscripcion los saca del JWT de la
    // sesión (que supabase.functions.invoke adjunta solo). Mandarlos acá
    // sería confiar en el cliente para algo que decide a quién se le activa
    // el plan pago.
    const { data, error: errorInvoke } = await supabase.functions.invoke<{
      init_point?: string;
      error?: string;
    }>('crear-suscripcion', {
      body: { plan },
    });

    if (errorInvoke) {
      setEnviando(null);
      setError(await extraerMensajeError(errorInvoke));
      return;
    }

    if (!data?.init_point) {
      setEnviando(null);
      setError(data?.error ?? 'Mercado Pago no devolvió un link de pago.');
      return;
    }

    // Redirección completa (no un tab nuevo): Mercado Pago va a volver a
    // back_url una vez que el usuario termine el checkout.
    window.location.href = data.init_point;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="pricing-panel">
          <div className="save-section__header">
            <span className="board__title" style={{ fontSize: 14 }}>
              Planes
            </span>
            <button type="button" className="link-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <div className={'plan-card' + (planActual === 'free' ? ' plan-card--actual' : '')}>
            <div className="plan-card__header">
              <span className="plan-card__nombre">Free</span>
              <span className="plan-card__precio">Gratis</span>
            </div>
            <ul className="plan-card__features">
              <li>Hasta 2 propiedades guardadas</li>
              <li>Sin seguimiento de pagos</li>
            </ul>
            {planActual === 'free' && <p className="dolar-meta">Tu plan actual</p>}
          </div>

          {(['basico', 'pro'] as const).map((id) => (
            <div
              key={id}
              className={'plan-card' + (planActual === id ? ' plan-card--actual' : '')}
            >
              <div className="plan-card__header">
                <span className="plan-card__nombre">{NOMBRE_PLAN[id]}</span>
                <span className="plan-card__precio">
                  ${formatoPrecio(PRECIO_POR_PLAN[id])}/mes
                </span>
              </div>
              <ul className="plan-card__features">
                {FEATURES_POR_PLAN[id].map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
                <li>{DIAS_PRUEBA_GRATIS} días de prueba gratis</li>
              </ul>

              {planActual === id ? (
                <p className="dolar-meta">Tu plan actual</p>
              ) : (
                <button
                  type="button"
                  className="primary-btn"
                  disabled={enviando !== null}
                  onClick={() => handleElegirPlan(id)}
                >
                  {enviando === id ? 'Redirigiendo…' : 'Elegir plan'}
                </button>
              )}
            </div>
          ))}

          {error && <p className="dolar-meta dolar-meta--error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
