import { json, options } from "../_shared/cors.ts";
import { cleanCode, db, requireAdmin } from "../_shared/license.ts";

// Keep the list response small while retaining every field the dashboard displays.
const adminLicenseColumns = "id, access_code, plan, active, duration_days, activated_at, expires_at, device_id, activation_count, notes, created_at";

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;

  try {
    await requireAdmin(request);
    const body = request.method === "GET" ? {} : await request.json();
    const action = request.method === "GET" ? "search" : body.action;

    if (action === "search") {
      const query = String(new URL(request.url).searchParams.get("q") ?? body.query ?? "").trim().toUpperCase();
      let search = db.from("licenses").select(adminLicenseColumns).order("created_at", { ascending: false }).limit(200);
      if (query) search = search.ilike("access_code", `%${query.replace(/[%_,]/g, "")}%`);

      const { data, error } = await search;
      if (error) throw error;
      return json({ licenses: data ?? [] });
    }

    const code = cleanCode(body.accessCode);

    if (action === "delete") {
      const { error } = await db.from("licenses").delete().eq("access_code", code);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "enable" || action === "disable") {
      const { data, error } = await db
        .from("licenses")
        .update({ active: action === "enable" })
        .eq("access_code", code)
        .select(adminLicenseColumns)
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ error: "License not found." }, 404);
      return json({ license: data });
    }

    if (action === "extend") {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 36500) throw new Error("Invalid extension.");

      const { data: license, error: findError } = await db
        .from("licenses")
        .select("id, duration_days, expires_at")
        .eq("access_code", code)
        .maybeSingle();

      if (findError) throw findError;
      if (!license) return json({ error: "License not found." }, 404);

      const now = new Date();
      const currentExpiry = license.expires_at ? new Date(license.expires_at) : null;
      const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
      const expires_at = new Date(base.getTime() + days * 86_400_000).toISOString();

      const { data, error } = await db
        .from("licenses")
        .update({ duration_days: (license.duration_days ?? 0) + days, expires_at })
        .eq("id", license.id)
        .select(adminLicenseColumns)
        .single();

      if (error) throw error;
      return json({ license: data });
    }

    throw new Error("Unknown action.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    return json({ error: message }, message === "Unauthorized." ? 401 : 400);
  }
});
