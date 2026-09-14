-- Ejecutar en el SQL Editor de tu proyecto de Supabase, después de
-- schema.sql y schema-pagos.sql.
-- Agrega el modelo de suscripciones pagas (Mercado Pago). Este archivo solo
-- crea la tabla, el bootstrap de fila 'free' y las políticas de RLS: el
-- webhook que confirma pagos y actualiza plan/status va aparte.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'basico', 'pro')),
  status text not null default 'active'
    check (status in ('trialing', 'active', 'cancelled', 'past_due')),
  mercadopago_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- El usuario solo puede LEER su propia fila.
-- (drop primero: a diferencia de create table, create policy no admite
-- "if not exists", así que sin esto el script no se puede volver a correr
-- una vez aplicado.)
drop policy if exists "subscriptions_select_own" on public.subscriptions;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- A propósito NO hay políticas de insert/update/delete acá: con RLS
-- habilitado y sin ellas, ningún usuario puede crear ni modificar su fila
-- desde el navegador (evita que alguien se autoasigne el plan pro). Solo
-- una Edge Function que use la service role key —que ignora RLS por
-- diseño— puede escribir en esta tabla (crear-suscripcion y, más adelante,
-- el webhook que confirma el pago).

-- Mantiene updated_at al día en cada UPDATE, sin que cada función que
-- toque esta tabla tenga que acordarse de setearlo a mano.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

-- Bootstrap: cada usuario nuevo arranca en plan 'free' automáticamente.
-- Enfoque recomendado por Supabase: un trigger AFTER INSERT en auth.users
-- que ejecuta una función SECURITY DEFINER (así puede escribir en
-- public.subscriptions aunque quien dispara el insert sea el propio
-- proceso de signup, sin sesión todavía). Es más simple y confiable que
-- depender de que el frontend cree la fila en el primer login.
create or replace function public.crear_suscripcion_gratuita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.crear_suscripcion_gratuita();

-- Backfill para usuarios que ya existían antes de correr esta migración
-- (el trigger de arriba solo aplica a altas nuevas).
insert into public.subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;
