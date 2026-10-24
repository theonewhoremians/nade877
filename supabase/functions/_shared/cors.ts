const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim().replace(/\/$/, "");

export const corsHeaders = {
  ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
export function options(request: Request) {
  if (request.method !== "OPTIONS") return null;
  if (!allowedOrigin || request.headers.get("origin") !== allowedOrigin) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders });
}
