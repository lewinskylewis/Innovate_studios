/*
 * Innov8 Studios — the one Supabase client instance for the whole
 * Dashboard. Loaded via the Supabase-hosted ESM build (no bundler, no
 * npm install — matches the rest of this codebase's plain-script
 * architecture) using the browser-safe project URL + anon key only.
 * Never import or reference a service-role key from this file or
 * anything it loads — that key must never exist in browser code.
 *
 * A classic (non-module) script on purpose, so `supabase` stays a plain
 * global exactly like every other identifier in shell.js/studio.js —
 * the dynamic import() below is what lets a classic script pull in an
 * ESM package. Load order in every dashboard/*.html:
 *   env.js -> supabaseClient.js -> shell.js -> {page}-data.js -> {page}.js
 *
 * Because the import is async, anything that needs `supabase` before it
 * resolves should await `window.supabaseReady` (a Promise, resolved once
 * `window.supabase` is set) rather than reading `window.supabase` at the
 * top of the file.
 */

window.supabase = null;
window.SUPABASE_READY = false;

window.supabaseReady = (async () => {
  const env = window.__INNOV8_ENV__ || {};
  const configured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);

  if (!configured) {
    console.error(
      "[supabaseClient] Missing SUPABASE_URL / SUPABASE_ANON_KEY. Copy dashboard/js/env.example.js to dashboard/js/env.js for local dev, or set the Vercel project's environment variables for a deploy. The Dashboard cannot load real data until this is set."
    );
    return null;
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  window.supabase = client;
  window.SUPABASE_READY = true;
  return client;
})();
