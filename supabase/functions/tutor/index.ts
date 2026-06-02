// ─────────────────────────────────────────────────────────────
// Supabase Edge Function: tutor
//
// The ONLY place the Anthropic key lives. The browser calls this function with
// its Supabase JWT; we validate the user, enforce a per-plan daily quota, call
// Anthropic server-side (streaming, with retry + timeout), log usage, and return
// the assembled text. The key never reaches the client.
//
// Deploy:  supabase functions deploy tutor
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
//           injected by the platform automatically.)
// ─────────────────────────────────────────────────────────────
/* eslint-disable */
// @ts-nocheck — Deno runtime; type-checked by `deno check`, not the app tsconfig.

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const DAILY_QUOTA: Record<string, number> = { free: 25, pro: 500, mentor: 2000 };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getUserId(jwt: string): Promise<string | null> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${jwt}`, apikey: ANON },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return typeof u?.id === "string" ? u.id : null;
}

async function planFor(userId: string): Promise<string> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/subscription?select=plan&status=eq.active&user_id=eq.${userId}&limit=1`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
  );
  if (!r.ok) return "free";
  const rows = await r.json();
  return rows?.[0]?.plan ?? "free";
}

async function usageToday(userId: string): Promise<number> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/usage_event?select=id&kind=eq.ai&user_id=eq.${userId}&created_at=gte.${since}`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, Prefer: "count=exact", Range: "0-0" } },
  );
  const range = r.headers.get("content-range");
  const total = range && range.includes("/") ? Number(range.split("/")[1]) : 0;
  return Number.isFinite(total) ? total : 0;
}

async function logUsage(userId: string, tokens: number): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/usage_event`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([{ user_id: userId, kind: "ai", units: tokens }]),
  }).catch((e) => console.error("[tutor] usage log failed", e));
}

async function readStream(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]" || !payload) continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") text += evt.delta.text;
      } catch { /* ignore keep-alive lines */ }
    }
  }
  return text;
}

async function callAnthropic(system: string, messages: unknown, maxTokens: number): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages, stream: true }),
      });
      if (r.status === 429 || r.status >= 500) {
        lastErr = new Error(`anthropic ${r.status}`);
        await sleep(2 ** attempt * 500);
        continue;
      }
      if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
      return await readStream(r);
    } catch (e) {
      lastErr = e;
      if (attempt === 2) break;
      await sleep(2 ** attempt * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("anthropic unreachable");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!ANTHROPIC_KEY) return json({ error: "AI backend not configured" }, 503);

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthenticated" }, 401);
    const userId = await getUserId(jwt);
    if (!userId) return json({ error: "unauthenticated" }, 401);

    const plan = await planFor(userId);
    const quota = DAILY_QUOTA[plan] ?? DAILY_QUOTA.free;
    const used = await usageToday(userId);
    if (used >= quota) {
      return json({ error: "daily AI limit reached for your plan", plan, quota }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : null;
    if (!messages) return json({ error: "messages[] required" }, 400);
    const system = typeof body.system === "string" ? body.system : "";
    const maxTokens = Math.min(1500, Math.max(64, Number(body.max_tokens) || 900));

    const text = await callAnthropic(system, messages, maxTokens);
    await logUsage(userId, maxTokens);
    return json({ text });
  } catch (e) {
    console.error("[tutor] error", e);
    return json({ error: "AI request failed" }, 502);
  }
});
