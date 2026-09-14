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
//
// Precio en USD, cobrado en ARS: Mercado Pago Argentina solo permite
// currency_id 'ARS' en /preapproval, así que el precio "real" se define en
// USD acá abajo y se convierte a ARS con la cotización oficial del día en
// que cada usuario se suscribe. Esto evita tener que estar actualizando un
// número fijo en pesos por la inflación.
//
// OJO: esto solo fija el precio correcto para suscripciones NUEVAS. Una vez
// creado un preapproval, Mercado Pago cobra ese mismo monto en ARS todos los
// meses — no se reajusta solo. Para reajustar a los que ya están
// suscriptos hace falta actualizar cada preapproval existente con
// PUT /preapproval/{id} (auto_recurring.transaction_amount), por ejemplo
// desde un cron mensual aparte. No implementado todavía.

import { createClient } from 'npm:@supabase/supabase-js@2';

// --- Constantes fáciles de cambiar ---------------------------------------
const PRECIO_BASICO_USD = 3;
const PRECIO_PRO_USD = 7;

// Recargo sobre el precio en USD ya convertido a ARS, para cubrir impuestos
// propios (ej: 0.21 si sos Responsable Inscripto y facturás con IVA
// discriminado). En 0 por ahora: ajustar según tu situación fiscal.
const PORCENTAJE_RECARGO_IMPUESTOS = 0;

// Días de prueba gratis antes del primer cobro para usuarios nuevos.
const DIAS_PRUEBA_GRATIS = 7;

// URL a la que Mercado Pago redirige al usuario después del checkout.
const BACK_URL = 'https://rentabilidad-app-web.vercel.app/';
// --------------------------------------------------------------------------

type Plan = 'basico' | 'pro';

const PRECIO_USD_POR_PLAN: Record<Plan, number> = {
  basico: PRECIO_BASICO_USD,
  pro: PRECIO_PRO_USD,
};

const NOMBRE_PLAN: Record<Plan, string> = {
  basico: 'Plan Básico - Rentabilidad de alquiler',
  pro: 'Plan Pro - Rentabilidad de alquiler',
};

// Misma fuente que usa el frontend (ver src/useDolar.ts), pero no se puede
// compartir el módulo entre el bundle de Vite y esta función Deno: se
// duplica acá la llamada puntual que hace falta (solo "oficial", que es la
// referencia correcta para fijar un precio de venta, no blue/MEP/CCL).
async function obtenerDolarOficialVenta(): Promise<number> {
  const respuesta = await fetch('https://dolarapi.com/v1/dolares/oficial');
  if (!respuesta.ok) {
    throw new Error(`dolarapi.com respondió con status ${respuesta.status}`);
  }
  const datos = (await respuesta.json()) as { venta?: number };
  if (typeof datos.venta !== 'number') {
    throw new Error('dolarapi.com no devolvió un valor de venta válido.');
  }
  return datos.venta;
}

function calcularMontoARS(precioUSD: number, dolarVenta: number): number {
  const montoBase = precioUSD * dolarVenta;
  const montoConImpuestos = montoBase * (1 + PORCENTAJE_RECARGO_IMPUESTOS);
  // Redondeado a pesos enteros: Mercado Pago no necesita más precisión que
  // esa para un monto en ARS.
  return Math.round(montoConImpuestos);
}

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

  let dolarVenta: number;
  try {
    dolarVenta = await obtenerDolarOficialVenta();
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido.';
    // No se cobra con un precio "adivinado" o desactualizado: si no hay
    // cotización, se corta acá en vez de arriesgar un monto mal calculado.
    return jsonResponse(
      {
        error: `No se pudo obtener la cotización del dólar para calcular el precio (${mensaje}). Probá de nuevo en un momento.`,
      },
      502
    );
  }

  const montoARS = calcularMontoARS(PRECIO_USD_POR_PLAN[plan], dolarVenta);

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
          transaction_amount: montoARS,
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
