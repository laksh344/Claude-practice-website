// ─────────────────────────────────────────────────────────────
// Supabase Edge Function: create-checkout
//
// Validates the user's JWT, then creates a Stripe Checkout Session for the
// requested plan and returns its URL. The Stripe secret never leaves the server.
//
// Deploy:  supabase functions deploy create-checkout
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, STRIPE_PRICE_MENTOR
// ─────────────────────────────────────────────────────────────
/* eslint-disable */
// @ts-nocheck — Deno runtime.
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno&deno-std=0.224.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const PRICES: Record<string, string> = {
  pro: Deno.env.get("STRIPE_PRICE_PRO") ?? "",
  mentor: Deno.env.get("STRIPE_PRICE_MENTOR") ?? "",
};

const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function getUser(jwt: string): Promise<{ id: string; email?: string } | null> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${jwt}`, apikey: ANON } });
  if (!r.ok) return null;
  const u = await r.json();
  return typeof u?.id === "string" ? { id: u.id, email: u.email } : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!STRIPE_SECRET) return json({ error: "payments not configured" }, 503);

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const user = jwt ? await getUser(jwt) : null;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan ?? "");
    const price = PRICES[plan];
    if (!price) return json({ error: "unknown plan" }, 400);

    const origin = req.headers.get("origin") ?? "";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: String(body.success_url || `${origin}/pricing?checkout=success`),
      cancel_url: String(body.cancel_url || `${origin}/pricing?checkout=cancelled`),
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      allow_promotion_codes: true,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("[create-checkout] error", e);
    return json({ error: "could not create checkout session" }, 500);
  }
});
