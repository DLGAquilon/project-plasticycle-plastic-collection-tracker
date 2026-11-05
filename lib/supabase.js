import { createClient } from "@supabase/supabase-js";

function secretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && secretKey());
}

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = secretKey();
  if (!url || !key) {
    throw new Error("Add SUPABASE_URL and SUPABASE_SECRET_KEY to .env.local.");
  }
  if (!globalThis.__plasticycleSupabase) {
    globalThis.__plasticycleSupabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return globalThis.__plasticycleSupabase;
}

export async function checkSupabase() {
  if (!supabaseConfigured()) return { ok: false, status: "missing" };
  const { error, count } = await getSupabase()
    .from("organizations")
    .select("id", { count: "exact", head: true });
  if (!error) return { ok: true, status: "ready", organizations: count ?? 0 };
  const missingTable = error.code === "PGRST205" || /could not find the table/i.test(error.message || "");
  return { ok: false, status: missingTable ? "schema" : "rejected", code: error.code || "" };
}
