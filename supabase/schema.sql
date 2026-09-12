-- Ejecutar en el SQL Editor de tu proyecto de Supabase.

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null default 'Propiedad',
  precio_compra numeric not null,
  alquiler_mensual numeric not null,
  dolar_venta numeric not null,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

-- Cada usuario ve, inserta, actualiza y borra únicamente sus propias filas.
create policy "properties_select_own"
  on public.properties for select
  using (auth.uid() = user_id);

create policy "properties_insert_own"
  on public.properties for insert
  with check (auth.uid() = user_id);

create policy "properties_update_own"
  on public.properties for update
  using (auth.uid() = user_id);

create policy "properties_delete_own"
  on public.properties for delete
  using (auth.uid() = user_id);
