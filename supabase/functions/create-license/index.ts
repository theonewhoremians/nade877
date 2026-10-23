import { json, options } from "../_shared/cors.ts";
import { db, randomCode, requireAdmin } from "../_shared/license.ts";

const durations = new Set([1, 7, 30, 90, 100, 180, 365]);
const adminLicenseColumns = "access_code, plan, active, duration_days, activated_at, expires_at, device_id, activation_count, notes";

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;

  try {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    await requireAdmin(request);

    const body = await request.json();
    const durationDays = body.durationDays === null ? null : Number(body.durationDays);
    if (durationDays !== null && (!durations.has(durationDays) && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 36500))) {
      throw new Error("Invalid duration.");
    }

    const plan = String(body.plan ?? "").trim();
    const notes = body.notes == null ? null : String(body.notes).trim();
    if (!plan || plan.length > 80 || (notes && notes.length > 2000)) {
      throw new Error("Invalid license details.");
    }

    // Collision is exceptionally rare, but retrying preserves reliable code creation.
    for (let attempt = 0; attempt < 3; attempt++) {
      const access_code = randomCode();
      const { data, error } = await db
        .from("licenses")
        .insert({ access_code, plan, duration_days: durationDays, notes })
        .select(adminLicenseColumns)
        .single();

      if (!error) return json({ license: data });
      if (error.code !== "23505") throw error;
    }

    throw new Error("Could not generate a unique access code.");
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Create failed." }, 400);
  }
});