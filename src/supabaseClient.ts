import { createClient } from '@supabase/supabase-js';

// Vercel rechaza nombres de variable con el prefijo VITE_, así que en producción
// se pueden cargar como PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY en su lugar
// (ver vite.config.ts, envPrefix). Localmente seguís usando VITE_ en tu .env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ' +
      '(o PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY en Vercel). ' +
      'Copiá .env.example a .env y completá los valores de tu proyecto de Supabase.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
