-- Ejecutar en el SQL Editor de tu proyecto de Supabase, después de schema.sql.
-- Agrega el tracking de pagos reales de alquiler para comparar contra la
-- previsión de rentabilidad calculada al guardar la propiedad.

alter table public.properties
  add column if not exists fecha_inicio_alquiler date,
  add column if not exists prevision_rentabilidad_anual numeric;

create table if not exists public.pagos_alquiler (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  fecha date not null,
  monto_ars numeric not null,
  dolar_dia numeric not null,
  estado text not null default 'pagado' check (estado in ('pagado', 'atrasado')),
  nota text,
  created_at timestamptz not null default now()
);

alter table public.pagos_alquiler enable row level security;

-- pagos_alquiler no tiene user_id propio: la propiedad (dueño real del dato)
-- vive en properties, así que cada política valida la relación vía EXISTS
-- contra properties.user_id = auth.uid().

create policy "pagos_alquiler_select_own"
  on public.pagos_alquiler for select
  using (
    exists (
      select 1
      from public.properties
      where properties.id = pagos_alquiler.property_id
        and properties.user_id = auth.uid()
    )
  );

create policy "pagos_alquiler_insert_own"
  on public.pagos_alquiler for insert
  with check (
    exists (
      select 1
      from public.properties
      where properties.id = pagos_alquiler.property_id
        and properties.user_id = auth.uid()
    )
  );

create policy "pagos_alquiler_update_own"
  on public.pagos_alquiler for update
  using (
    exists (
      select 1
      from public.properties
      where properties.id = pagos_alquiler.property_id
        and properties.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.properties
      where properties.id = pagos_alquiler.property_id
        and properties.user_id = auth.uid()
    )
  );

create policy "pagos_alquiler_delete_own"
  on public.pagos_alquiler for delete
  using (
    exists (
      select 1
      from public.properties
      where properties.id = pagos_alquiler.property_id
        and properties.user_id = auth.uid()
    )
  );
