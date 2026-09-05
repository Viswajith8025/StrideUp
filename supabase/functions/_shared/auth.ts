export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-secret",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function isAuthorized(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  const authHeader = req.headers.get("Authorization");
  const pushSecret = req.headers.get("x-push-secret");

  if (serviceKey && authHeader === `Bearer ${serviceKey}`) return true;
  if (webhookSecret && pushSecret === webhookSecret) return true;
  return false;
}
