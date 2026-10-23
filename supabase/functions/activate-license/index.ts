import { corsHeaders, json, options } from "../_shared/cors.ts";
import { cleanCode, cleanDevice, db, publicLicense, signLicense, type License } from "../_shared/license.ts";

Deno.serve(async request => {
  const preflight = options(request); if (preflight) return preflight;
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const body = await request.json(); const code = cleanCode(body.accessCode); const deviceId = cleanDevice(body.deviceId);
    if (String(body.appVersion ?? "").length > 80) throw new Error("Invalid app version.");
    const { data, error } = await db.rpc("activate_license", { p_access_code: code, p_device_id: deviceId });
    if (error) {
      const m = error.message;
      if (m.includes("DEVICE_MISMATCH")) return json({ error: "License already activated on another device." }, 409);
      if (m.includes("LICENSE_DISABLED")) return json({ error: "This license has been disabled." }, 403);
      if (m.includes("LICENSE_EXPIRED")) return json({ error: "This license has expired." }, 403);
      if (m.includes("LICENSE_NOT_FOUND")) return json({ error: "Invalid access code." }, 404);
      throw error;
    }
    const license = data as License; return json({ token: await signLicense(license), expiresAt: new Date(Date.now() + 86400000).toISOString(), license: publicLicense(license) });
  } catch (error) { console.error("activation error", error); return json({ error: error instanceof Error ? error.message : "Activation failed." }, 400); }
}, { onListen: () => {} });
