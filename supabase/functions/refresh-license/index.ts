import { json, options } from "../_shared/cors.ts";
import { cleanCode, cleanDevice, db, isUsable, publicLicense, signLicense, type License } from "../_shared/license.ts";

Deno.serve(async request => { const preflight = options(request); if (preflight) return preflight; try {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const body = await request.json(); const code = cleanCode(body.accessCode); const device = cleanDevice(body.deviceId);
  const { data, error } = await db.from("licenses").select("*").eq("access_code", code).maybeSingle(); if (error) throw error;
  const license = data as License | null; if (!license) return json({ error: "Invalid access code." }, 404);
  if (!isUsable(license)) return json({ error: license.active ? "This license has expired." : "This license has been disabled." }, 403);
  if (license.device_id !== device) return json({ error: "License already activated on another device." }, 409);
  return json({ token: await signLicense(license), expiresAt: new Date(Date.now() + 86400000).toISOString(), license: publicLicense(license) });
} catch (error) { return json({ error: error instanceof Error ? error.message : "Refresh failed." }, 400); } });
