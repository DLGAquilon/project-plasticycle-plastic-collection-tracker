import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filename) {
  const full = path.join(process.cwd(), filename);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const split = trimmed.indexOf("=");
    if (split < 1) continue;
    const key = trimmed.slice(0, split).trim();
    let value = trimmed.slice(split + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
  }
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Add SUPABASE_URL and SUPABASE_SECRET_KEY to .env.local, then run this again.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error, count } = await supabase.from("organizations").select("id", { count: "exact", head: true });

if (!error) {
  console.log(`Supabase is connected. organizations has ${count ?? 0} rows.`);
  process.exit(0);
}

if (error.code === "PGRST205" || /could not find the table/i.test(error.message || "")) {
  console.error("Connected, but the tables are not there yet. Run supabase/schema.sql in the Supabase SQL editor.");
  process.exit(2);
}

console.error(`Supabase refused the check (${error.code || "error"}). Use the secret key, not the publishable key.`);
process.exit(1);
