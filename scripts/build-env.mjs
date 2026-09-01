// Runs as the Dashboard Vercel project's Build Command. Writes
// dashboard/js/env.js from the project's environment variables so the
// browser-safe Supabase URL/anon key never have to be committed to the
// repo. Never reads or writes anything service-role — there is nothing
// server-side in this deploy for that key to live in.
import { writeFile } from "node:fs/promises";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "[build-env] SUPABASE_URL and/or SUPABASE_ANON_KEY are not set in this Vercel project's environment variables — the deployed Dashboard will fail to connect. Set them under Project Settings → Environment Variables."
  );
}

const contents = `window.__INNOV8_ENV__ = ${JSON.stringify(
  { SUPABASE_URL: url ?? "", SUPABASE_ANON_KEY: anonKey ?? "" },
  null,
  2
)};\n`;

await writeFile(new URL("../dashboard/js/env.js", import.meta.url), contents);
console.log("[build-env] wrote dashboard/js/env.js");
