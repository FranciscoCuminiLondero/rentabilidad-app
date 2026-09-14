-- Ejecutar en el SQL Editor de tu proyecto de Supabase, después de
-- schema.sql, schema-pagos.sql y schema-subscriptions.sql.
--
-- Guarda qué tipo de cotización de dólar (oficial/blue/MEP/CCL) eligió el
-- usuario para cada propiedad, para que el seguimiento de pagos y el
-- cálculo de rentabilidad real usen siempre la misma referencia que se usó
-- al guardar la propiedad. Ver src/useDolar.ts.
--
-- Esto no recalcula nada de lo ya guardado: los pagos existentes conservan
-- su dolar_dia tal cual quedó cargado. El default 'oficial' solo determina
-- qué cotización se va a buscar para pagos NUEVOS de propiedades viejas
-- (que no tenían este concepto).

alter table public.properties
  add column if not exists tipo_dolar text not null default 'oficial'
    check (tipo_dolar in ('oficial', 'blue', 'bolsa', 'contadoconliqui'));
