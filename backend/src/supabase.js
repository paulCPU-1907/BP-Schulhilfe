import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    })
  : null;

export function getSupabaseStatus() {
  return {
    configured: isSupabaseConfigured,
    urlConfigured: Boolean(supabaseUrl),
    keyConfigured: Boolean(supabaseKey),
    keyType: supabaseKey
      ? process.env.SUPABASE_SECRET_KEY
        ? "secret"
        : process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "service_role"
        : "anon"
      : null
  };
}
