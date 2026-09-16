// Edge Function: recibe las notificaciones (webhooks) de Mercado Pago
// sobre suscripciones (preapproval) y actualiza public.subscriptions.
// La llama Mercado Pago, no un usuario logueado de la app: no verifica JWT
// (se deploya con --no-verify-jwt) y siempre responde 200, aun si algo
// interno falla, para que MP no reintente la notificación sin parar.
//
// Mercado Pago solo manda el id del recurso en la notificación; los datos
// reales (status, plan, fechas) hay que ir a buscarlos con un GET aparte.

import { createClient } from 'npm:@supabase/supabase-js@2';

// Debe coincidir con DIAS_PRUEBA_GRATIS en crear-suscripcion/index.ts: se
// usa para decidir si un preapproval "authorized" todavía está en período
// de prueba o si ya empezó a cobrar.
const DIAS_PRUEBA_GRATIS = 7;
const MS_POR_DIA = 1000 * 60 * 60 * 24;
// Margen para no clasificar mal por pequeñas diferencias de horario/redondeo
// entre el date_created y el next_payment_date que devuelve Mercado Pago.
const TOLERANCIA_MS = MS_POR_DIA;

const TIPOS_PREAPPROVAL = new Set(['preapproval', 'subscription_preapproval']);

// Los preapproval_id reales de Mercado Pago son un hex de 32 caracteres
// (ej. "0b2f72632c06400abfb26c53186f7ddd"). Este endpoint no tiene JWT
// (lo llama Mercado Pago, no un usuario logueado), así que preapprovalId
// viene de un request sin autenticar: valido el formato antes de meterlo
// en la URL que consultamos con nuestro propio access token, para que no
// se pueda usar esta ruta para pedirle a la API de MP algo que no sea
// "traeme este preapproval puntual".
const PREAPPROVAL_ID_VALIDO = /^[a-f0-9]{32}$/i;

type Plan = 'basico' | 'pro';
type StatusInterno = 'trialing' | 'active' | 'cancelled' | 'past_due';

interface PreapprovalMP {
  id: string;
  status: 'pending' | 'authorized' | 'paused' | 'cancelled' | string;
  reason?: string;
  external_reference?: string;
  date_created?: string;
  auto_recurring?: {
    next_payment_date?: string;
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// El plan no viene directo en el preapproval: se infiere del "reason" que
// crear-suscripcion/index.ts arma como "Plan Básico - ..." / "Plan Pro - ...".
function inferirPlanDesdeReason(reason: string | undefined): Plan | null {
  if (!reason) return null;
  const normalizado = reason
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // saca tildes (Básico -> basico)

  if (normalizado.includes('basico')) return 'basico';
  if (normalizado.includes('pro')) return 'pro';
  return null;
}

// "authorized" con next_payment_date todavía dentro de los
// DIAS_PRUEBA_GRATIS desde que se creó el preapproval = no cobró todavía.
function estaEnPeriodoDePrueba(
  dateCreated: string | undefined,
  nextPaymentDate: string | undefined
): boolean {
  if (!dateCreated || !nextPaymentDate) return false;

  const creado = new Date(dateCreated).getTime();
  const proximoPago = new Date(nextPaymentDate).getTime();
  if (Number.isNaN(creado) || Number.isNaN(proximoPago)) return false;

  const finPrueba = creado + DIAS_PRUEBA_GRATIS * MS_POR_DIA;
  return proximoPago <= finPrueba + TOLERANCIA_MS;
}

function mapearStatus(
  preapproval: PreapprovalMP
): { status: StatusInterno; trialEndsAt: string | null } {
  if (preapproval.status === 'paused' || preapproval.status === 'cancelled') {
    return { status: 'cancelled', trialEndsAt: null };
  }

  if (preapproval.status === 'authorized') {
    const enPrueba = estaEnPeriodoDePrueba(
      preapproval.date_created,
      preapproval.auto_recurring?.next_payment_date
    );

    if (enPrueba && preapproval.date_created) {
      const finPrueba = new Date(
        new Date(preapproval.date_created).getTime() +
          DIAS_PRUEBA_GRATIS * MS_POR_DIA
      ).toISOString();
      return { status: 'trialing', trialEndsAt: finPrueba };
    }

    return { status: 'active', trialEndsAt: null };
  }

  // "pending" y cualquier otro valor no contemplado explícitamente.
  return { status: 'past_due', trialEndsAt: null };
}

// Mercado Pago manda el id del preapproval en el body ({ data: { id } }) o,
// a veces, como query param (?data.id=...) en vez de en el body.
async function extraerTipoYId(
  req: Request
): Promise<{ type: string | null; preapprovalId: string | null }> {
  const url = new URL(req.url);
  let type: string | null = null;
  let preapprovalId: string | null = null;

  try {
    const body = await req.json();
    type = typeof body?.type === 'string' ? body.type : null;
    preapprovalId = typeof body?.data?.id === 'string' ? body.data.id : null;
  } catch {
    // Puede no haber body, o no ser JSON: seguimos y probamos query params.
  }

  if (!preapprovalId) {
    preapprovalId = url.searchParams.get('data.id');
  }
  if (!type) {
    type = url.searchParams.get('type');
  }

  return { type, preapprovalId };
}

Deno.serve(async (req: Request) => {
  // Pase lo que pase de acá para abajo, siempre respondemos 200: si le
  // devolvemos error a Mercado Pago, reintenta la misma notificación
  // muchas veces y eso puede generar más problemas que el error original.
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ ok: true }, 200);
    }

    const { type, preapprovalId } = await extraerTipoYId(req);

    if (!type || !TIPOS_PREAPPROVAL.has(type)) {
      // Otros tipos de evento (pagos sueltos, etc.) no nos interesan acá.
      return jsonResponse({ ok: true, ignorado: true }, 200);
    }

    if (!preapprovalId) {
      console.error('Webhook de preapproval sin id (ni en body ni en query).');
      return jsonResponse({ ok: true }, 200);
    }

    if (!PREAPPROVAL_ID_VALIDO.test(preapprovalId)) {
      console.error(`Webhook con preapprovalId con formato inválido: "${preapprovalId}".`);
      return jsonResponse({ ok: true }, 200);
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('Falta el secreto MP_ACCESS_TOKEN.');
      return jsonResponse({ ok: true }, 200);
    }

    const respuestaMP = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!respuestaMP.ok) {
      console.error(
        `No se pudo obtener el preapproval ${preapprovalId}: status ${respuestaMP.status}`
      );
      return jsonResponse({ ok: true }, 200);
    }

    const preapproval: PreapprovalMP = await respuestaMP.json();

    const userId = preapproval.external_reference;
    if (!userId) {
      console.error(
        `Preapproval ${preapprovalId} sin external_reference: no se puede asociar a un usuario.`
      );
      return jsonResponse({ ok: true }, 200);
    }

    const plan = inferirPlanDesdeReason(preapproval.reason);
    if (!plan) {
      console.error(
        `No se pudo inferir el plan desde reason="${preapproval.reason}" (preapproval ${preapprovalId}).`
      );
      return jsonResponse({ ok: true }, 200);
    }

    const { status, trialEndsAt } = mapearStatus(preapproval);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
      return jsonResponse({ ok: true }, 200);
    }

    // Service role key: ignora RLS a propósito (ver schema-subscriptions.sql)
    // para poder escribir el plan/status reales de cualquier usuario.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan,
          status,
          mercadopago_subscription_id: preapproval.id,
          trial_ends_at: trialEndsAt,
          current_period_end: preapproval.auto_recurring?.next_payment_date ?? null,
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error haciendo upsert en subscriptions:', error);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error('Error inesperado procesando el webhook de Mercado Pago:', err);
    return jsonResponse({ ok: true }, 200);
  }
});
