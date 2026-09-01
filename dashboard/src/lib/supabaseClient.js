/*
 * Innov8 Studios — the one Supabase client instance for the whole
 * Dashboard. Reads the browser-safe project URL + anon key from
 * window.__INNOV8_ENV__, which index.html loads from /env.js *before*
 * this module runs (see build-env.mjs / public/env.example.js). Never
 * import or reference a service-role key from this file or anything it
 * loads — that key must never exist in browser code.
 */
import { createClient } from "@supabase/supabase-js";

const env = window.__INNOV8_ENV__ || {};

export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.error(
    "[supabaseClient] Missing SUPABASE_URL / SUPABASE_ANON_KEY. Copy dashboard/public/env.example.js to dashboard/public/env.js for local dev, or set the Vercel project's environment variables for a deploy. The Dashboard cannot load real data until this is set."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;
