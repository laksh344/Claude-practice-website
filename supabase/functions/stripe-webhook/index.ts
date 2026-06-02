// ─────────────────────────────────────────────────────────────
// Supabase Edge Function: stripe-webhook
//
// Verifies the Stripe signature, then persists the user's entitlement to the
// `subscription` table (service role). This is the ONLY source of truth for a
// user's plan — the client can never grant itself paid access.
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Stripe:  add an endpoint -> https://<ref>.functions.supabase.co/stripe-webhook
//          events: checkout.session.completed, customer.subscription.*
// ─────────────────────────────────────────────────────────────
/* eslint-disable */
// @ts-nocheck — Deno runtime.
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno&deno-std=0.224.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

async function upsert(row: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/subscription?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([row]),
  });
  if (!r.ok) console.error("[stripe-webhook] upsert failed", r.status, await r.text());
}

Deno.serve(async (req: Request) => {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  if (!sig || !WEBHOOK_SECRET) return new Response("missing signature/secret", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (e) {
    console.error("[stripe-webhook] signature verification failed", e);
    return new Response("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = (s.metadata?.user_id as string) || (s.client_reference_id as string);
        const plan = (s.metadata?.plan as string) || "pro";
        if (userId) {
          await upsert({
            user_id: userId,
            plan,
            status: "active",
            stripe_customer_id: s.customer,
            stripe_subscription_id: s.subscription,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id as string;
        const plan = (sub.metadata?.plan as string) || "pro";
        const active = sub.status === "active" || sub.status === "trialing";
        if (userId) {
          await upsert({
            user_id: userId,
            plan: active ? plan : "free",
            status: active ? "active" : "inactive",
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            stripe_customer_id: sub.customer,
            stripe_subscription_id: sub.id,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id as string;
        if (userId) {
          await upsert({ user_id: userId, plan: "free", status: "canceled", stripe_subscription_id: sub.id });
        }
        break;
      }
    }
  } catch (e) {
    console.error("[stripe-webhook] handler error", e);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
