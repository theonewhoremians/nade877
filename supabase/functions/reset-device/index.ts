import { json, options } from "../_shared/cors.ts";
import { cleanCode, db, requireAdmin } from "../_shared/license.ts";
Deno.serve(async request => { const preflight = options(request); if (preflight) return preflight; try {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405); await requireAdmin(request); const { accessCode } = await request.json();
  const { data, error } = await db.from("licenses").update({ device_id: null }).eq("access_code", cleanCode(accessCode)).select("*").maybeSingle(); if (error) throw error; if (!data) return json({ error: "License not found." }, 404); return json({ license: data });
} catch (error) { return json({ error: error instanceof Error ? error.message : "Reset failed." }, 400); } });
