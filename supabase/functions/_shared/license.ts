import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const encoder = new TextEncoder();

function requiredSecret(name: string, minimumLength = 1) {
  const value = Deno.env.get(name)?.trim();
  if (!value || value.length < minimumLength) throw new Error(`${name} is not configured.`);
  return value;
}

export type License = { id: string; access_code: string; plan: string; duration_days: number | null; activated_at: string | null; expires_at: string | null; device_id: string | null; active: boolean; activation_count: number; max_devices: number; notes: string | null; created_at: string; updated_at: string };
export function cleanCode(value: unknown) { const code = String(value ?? "").trim().toUpperCase(); if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) throw new Error("Enter a valid access code."); return code; }
export function cleanDevice(value: unknown) { const id = String(value ?? "").trim(); if (id.length < 16 || id.length > 256) throw new Error("Invalid device fingerprint."); return id; }
export function isUsable(l: License) { return l.active && (!l.expires_at || new Date(l.expires_at).getTime() > Date.now()); }
function constantTimeEqual(left: string, right: string) { if (left.length !== right.length) return false; let difference = 0; for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i); return difference === 0; }
function b64(value: Uint8Array | string) { const bytes = typeof value === "string" ? encoder.encode(value) : value; let raw = ""; for (const v of bytes) raw += String.fromCharCode(v); return btoa(raw).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
async function hmac(value: string) { const key = await crypto.subtle.importKey("raw", encoder.encode(requiredSecret("LICENSE_JWT_SECRET", 32)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))); }
export async function signLicense(l: License) { const now = Math.floor(Date.now() / 1000); const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })); const payload = b64(JSON.stringify({ sub: l.id, did: l.device_id, plan: l.plan, iat: now, exp: now + 86400, iss: "license-api", aud: "license-client" })); return `${header}.${payload}.${b64(await hmac(`${header}.${payload}`))}`; }
export async function verifyToken(request: Request) { const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, ""); if (!token) throw new Error("Missing license token."); const parts = token.split("."); if (parts.length !== 3 || parts[0] !== b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))) throw new Error("Invalid license token."); const expected = b64(await hmac(`${parts[0]}.${parts[1]}`)); if (!constantTimeEqual(expected, parts[2])) throw new Error("Invalid license token.");
  const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))));
  if (claims.exp <= Math.floor(Date.now() / 1000) || claims.iss !== "license-api" || claims.aud !== "license-client") throw new Error("License token expired."); return claims as { sub: string; did: string };
}
export async function requireAdmin(request: Request) { const supplied = request.headers.get("x-admin-key") ?? ""; const expected = requiredSecret("LICENSE_ADMIN_KEY", 24); if (!constantTimeEqual(supplied, expected)) throw new Error("Unauthorized."); }
export function publicLicense(l: License) { return { id: l.id, plan: l.plan, expiresAt: l.expires_at, active: l.active }; }
export function randomCode() { const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const bytes = crypto.getRandomValues(new Uint8Array(12)); return Array.from(bytes, b => alphabet[b % alphabet.length]).join("").replace(/(.{4})(?=.)/g, "$1-"); }
