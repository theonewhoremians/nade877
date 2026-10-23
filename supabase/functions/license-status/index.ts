import { json, options } from "../_shared/cors.ts";
import { db, isUsable, publicLicense, type License, verifyToken } from "../_shared/license.ts";

Deno.serve(async request => { const preflight = options(request); if (preflight) return preflight; try {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const claims = await verifyToken(request); const { data, error } = await db.from("licenses").select("*").eq("id", claims.sub).maybeSingle(); if (error) throw error;
  const license = data as License | null; if (!license || license.device_id !== claims.did || !isUsable(license)) return json({ error: "License is not active." }, 403);
  return json(publicLicense(license));
} catch (error) { return json({ error: error instanceof Error ? error.message : "Status check failed." }, 401); } });
