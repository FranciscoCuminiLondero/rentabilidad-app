// Edge Function: crea una suscripción (preapproval) en Mercado Pago para
// los planes pagos y devuelve el link de checkout (init_point) al que hay
// que redirigir al usuario. No confirma el pago ni toca la tabla
// subscriptions — eso lo hace mercadopago-webhook.
//
// POST body esperado: { plan: 'basico' | 'pro' }
// user_id y email NO se toman del body: se derivan del JWT de la request
// (esta función requiere JWT válido, se deploya sin --no-verify-jwt). Si
// se confiara en el body, cualquier usuario logueado podría mandar el
// user_id de otra persona y generarle una suscripción a su cuenta.

import { createClient } from 'npm:@supabase/supabase-js@2';

// --- Constantes fáciles de cambiar ---------------------------------------
// Montos en ARS, cobro mensual recurrente. Ajustar según corresponda.
const PRECIO_BASICO_ARS = 4999;
const PRECIO_PRO_ARS = 9999;

// Días de prueba gratis antes del primer cobro para usuarios nuevos.
const DIAS_PRUEBA_GRATIS = 7;

// URL a la que Mercado Pago redirige al usuario después del checkout.
const BACK_URL = 'https://rentabilidad-app-web.vercel.app/';
// --------------------------------------------------------------------------

type Plan = 'basico' | 'pro';

const MONTO_POR_PLAN: Record<Plan, number> = {
  basico: PRECIO_BASICO_ARS,
  pro: PRECIO_PRO_ARS,
};

const NOMBRE_PLAN: Record<Plan, string> = {
  basico: 'Plan Básico - Rentabilidad de alquiler',
  pro: 'Plan Pro - Rentabilidad de alquiler',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function esPlanValido(valor: unknown): valor is Plan {
  return valor === 'basico' || valor === 'pro';
}

interface CrearSuscripcionBody {
  plan?: unknown;
}

interface RespuestaMercadoPago {
  init_point?: string;
  message?: string;
  cause?: { description?: string }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido, usá POST.' }, 405);
  }

  let body: CrearSuscripcionBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Body inválido: se esperaba JSON.' }, 400);
  }

  const { plan } = body;

  if (!esPlanValido(plan)) {
    return jsonResponse(
      { error: 'El plan debe ser "basico" o "pro".' },
      400
    );
  }

  // Identidad real del que llama, sacada del JWT (no del body). El gateway
  // de Supabase ya verificó que el JWT es válido antes de invocar esta
  // función; acá lo decodificamos para saber DE QUIÉN es.
  const authHeader = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authHeader || !supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'Falta autenticación.' }, 401);
  }

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: errorUsuario,
  } = await supabaseClient.auth.getUser();

  if (errorUsuario || !user) {
    return jsonResponse({ error: 'Sesión inválida o expirada.' }, 401);
  }
  if (!user.email) {
    return jsonResponse(
      { error: 'Tu cuenta no tiene un email asociado; no se puede suscribir.' },
      400
    );
  }

  const userId = user.id;
  const email = user.email;

  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  if (!accessToken) {
    return jsonResponse(
      {
        error:
          'Falta configurar el secreto MP_ACCESS_TOKEN en las Edge Functions del proyecto.',
      },
      500
    );
  }

  try {
    const respuestaMP = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reason: NOMBRE_PLAN[plan],
        external_reference: userId,
        payer_email: email,
        back_url: BACK_URL,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: MONTO_POR_PLAN[plan],
          currency_id: 'ARS',
          free_trial: {
            frequency: DIAS_PRUEBA_GRATIS,
            frequency_type: 'days',
          },
        },
      }),
    });

    const datosMP: RespuestaMercadoPago = await respuestaMP.json();

    if (!respuestaMP.ok) {
      const mensaje =
        datosMP.message ??
        datosMP.cause?.[0]?.description ??
        `Mercado Pago respondió con status ${respuestaMP.status}.`;
      return jsonResponse(
        { error: `No se pudo crear la suscripción: ${mensaje}` },
        respuestaMP.status
      );
    }

    if (!datosMP.init_point) {
      return jsonResponse(
        {
          error:
            'Mercado Pago no devolvió un link de checkout (init_point) para esta suscripción.',
        },
        502
      );
    }

    return jsonResponse({ init_point: datosMP.init_point }, 200);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido.';
    return jsonResponse(
      { error: `No se pudo conectar con Mercado Pago: ${mensaje}` },
      502
    );
  }
});
