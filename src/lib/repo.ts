// ─────────────────────────────────────────────────────────────
// Durable persistence + auth via Supabase (Auth + PostgREST + Edge Functions).
//
// This layer is OPTIONAL. When VITE_SUPABASE_URL / _ANON_KEY are set it provides
// real PKCE authentication, per-user persistence (RLS-scoped), server-side AI,
// and Stripe-backed entitlements. When they are absent every function no-ops and
// the app runs purely in memory with zero behaviour change.
//
// Auth: PKCE-first. We always send a code_challenge, so the flow works whether
// the Supabase project is configured for PKCE (returns ?code=) or implicit
// (returns #access_token) — both are handled on redirect.
// ─────────────────────────────────────────────────────────────
import type { ExamResult, PracticeEntry, Plan } from "@/lib/store";

const ENV = (import.meta.env ?? {}) as Record<string, string | undefined>;
const SUPABASE_URL = ENV.VITE_SUPABASE_URL;
const SUPABASE_KEY = ENV.VITE_SUPABASE_ANON_KEY;

/** True only when real Supabase credentials are configured. */
export const persistenceEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
/** AI + payments run as Edge Functions on the same Supabase project. */
export const aiBackendEnabled = persistenceEnabled;

export type AuthProvider = "google" | "github";

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: AuthUser;
}

/** Raw token payload returned by GoTrue token/otp endpoints. */
interface AuthPayload {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: AuthUser;
}

interface ExamRow {
  score: number;
  correct_count: number;
  total: number;
  by_topic: ExamResult["byTopic"];
  time_used_sec: number;
  duration_sec: number;
  created_at: string;
}
interface PracticeRow { topic_id: string; correct: boolean }
interface SubscriptionRow { plan: Plan; status: string; current_period_end: string | null }

const SESSION_KEY = "claude-academy.supabase-session";
const PKCE_KEY = "claude-academy.pkce-verifier";

function authRedirectTo(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

// ── PKCE helpers (Web Crypto, S256) ───────────────────────────
function base64url(bytes: ArrayBuffer): string {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function createPkce(): Promise<{ verifier: string; challenge: string }> {
  const random = new Uint8Array(64);
  crypto.getRandomValues(random);
  const verifier = base64url(random.buffer);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(digest) };
}

function baseHeaders(authToken?: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_KEY as string,
    Authorization: `Bearer ${authToken || SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest<T>(path: string, init: RequestInit = {}, authToken?: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...baseHeaders(authToken), ...((init.headers as Record<string, string>) || {}) },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
  return (res.status === 204 ? (null as T) : ((await res.json()) as T));
}

async function auth<T>(path: string, init: RequestInit = {}, authToken?: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: { ...baseHeaders(authToken), ...((init.headers as Record<string, string>) || {}) },
  });
  if (!res.ok) throw new Error(`supabase auth ${res.status}: ${await res.text()}`);
  return (res.status === 204 ? (null as T) : ((await res.json()) as T));
}

/** POST to an Edge Function on the configured project, authenticated as the user. */
export async function invokeEdgeFunction<T>(name: string, body: unknown): Promise<T> {
  if (!SUPABASE_URL) throw new Error("backend not configured");
  const token = readStoredSession()?.access_token;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: baseHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`function ${name}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
}

async function sessionFromAuthPayload(payload: AuthPayload | null): Promise<AuthSession | null> {
  if (!payload?.access_token) return null;
  const expiresAt =
    payload.expires_at ||
    (payload.expires_in ? Math.floor(Date.now() / 1000) + Number(payload.expires_in) : undefined);
  let user = payload.user;
  if (!user?.id) {
    user = await auth<AuthUser>("user", { method: "GET" }, payload.access_token);
  }
  if (!user?.id) return null;
  return { access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: expiresAt, user };
}

function clearAuthParamsFromUrl(): void {
  // redirect_to is always origin+pathname (no query), so the only query/hash
  // present after an auth redirect are the auth params — safe to strip.
  window.history.replaceState(null, "", window.location.pathname);
}

async function exchangeCodeForSession(code: string): Promise<AuthSession | null> {
  const verifier = window.localStorage.getItem(PKCE_KEY);
  window.localStorage.removeItem(PKCE_KEY);
  if (!verifier) throw new Error("missing PKCE verifier");
  const payload = await auth<AuthPayload>("token?grant_type=pkce", {
    method: "POST",
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  });
  const full = await sessionFromAuthPayload(payload);
  if (full) persistSession(full);
  return full;
}

/**
 * Resolve any auth redirect into a session. Handles BOTH:
 *  - PKCE:     ?code=…   → exchange (with stored verifier)
 *  - Implicit: #access_token=… → parse hash
 * Throws on an explicit provider error so callers can surface it.
 */
export async function handleAuthRedirect(): Promise<AuthSession | null> {
  if (!persistenceEnabled || typeof window === "undefined") return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const providerError = search.get("error_description") || hash.get("error_description");
  if (providerError) {
    clearAuthParamsFromUrl();
    throw new Error(providerError);
  }

  const code = search.get("code");
  if (code) {
    clearAuthParamsFromUrl();
    return exchangeCodeForSession(code);
  }

  if (hash.has("access_token")) {
    const payload: AuthPayload = {
      access_token: hash.get("access_token") || undefined,
      refresh_token: hash.get("refresh_token") || undefined,
      expires_in: hash.get("expires_in") ? Number(hash.get("expires_in")) : undefined,
    };
    clearAuthParamsFromUrl();
    const full = await sessionFromAuthPayload(payload);
    if (full) persistSession(full);
    return full;
  }
  return null;
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  if (!persistenceEnabled) return null;
  const session = readStoredSession();
  if (!session) return null;
  const expiresSoon = session.expires_at && session.expires_at < Math.floor(Date.now() / 1000) + 60;
  if (!expiresSoon) return session;
  if (!session.refresh_token) {
    persistSession(null);
    return null;
  }
  try {
    const refreshed = await auth<AuthPayload>("token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const next = await sessionFromAuthPayload(refreshed);
    persistSession(next);
    return next;
  } catch (e) {
    console.warn("[repo] refresh session failed", e);
    persistSession(null);
    return null;
  }
}

export async function sendMagicLink(email: string): Promise<void> {
  if (!persistenceEnabled) return;
  const { verifier, challenge } = await createPkce();
  window.localStorage.setItem(PKCE_KEY, verifier);
  // GoTrue's /otp endpoint reads the post-confirmation redirect from the
  // `redirect_to` query parameter; the PKCE challenge goes in the body.
  const redirect = encodeURIComponent(authRedirectTo());
  await auth(`otp?redirect_to=${redirect}`, {
    method: "POST",
    body: JSON.stringify({
      email,
      create_user: true,
      code_challenge: challenge,
      code_challenge_method: "s256",
    }),
  });
}

export async function signInWithProvider(provider: AuthProvider): Promise<void> {
  if (!persistenceEnabled || typeof window === "undefined") return;
  const { verifier, challenge } = await createPkce();
  window.localStorage.setItem(PKCE_KEY, verifier);
  const redirect = encodeURIComponent(authRedirectTo());
  window.location.href =
    `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}` +
    `&redirect_to=${redirect}&code_challenge=${challenge}&code_challenge_method=s256`;
}

export async function signOutAuth(accessToken?: string | null): Promise<void> {
  persistSession(null);
  if (typeof window !== "undefined") window.localStorage.removeItem(PKCE_KEY);
  if (!persistenceEnabled || !accessToken) return;
  try {
    await auth("logout", { method: "POST" }, accessToken);
  } catch (e) {
    console.warn("[repo] auth logout failed", e);
  }
}

/** Upsert the authenticated user's public profile row for FK ownership. */
export async function ensureAuthUser(session: AuthSession, name: string): Promise<string | null> {
  if (!persistenceEnabled) return null;
  try {
    const rows = await rest<{ id: string }[]>(
      "app_user?on_conflict=id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([{ id: session.user.id, email: session.user.email, name }]),
      },
      session.access_token,
    );
    return rows?.[0]?.id ?? null;
  } catch (e) {
    console.warn("[repo] ensureAuthUser failed; continuing in-memory", e);
    return null;
  }
}

/** Read the user's current entitlement (plan) from the server — never trusted from the client. */
export async function loadEntitlement(accessToken: string | null): Promise<Plan> {
  if (!persistenceEnabled || !accessToken) return "free";
  try {
    const rows = await rest<SubscriptionRow[]>(
      "subscription?select=plan,status,current_period_end&status=eq.active&order=current_period_end.desc.nullslast&limit=1",
      {},
      accessToken,
    );
    return rows?.[0]?.plan ?? "free";
  } catch (e) {
    console.warn("[repo] loadEntitlement failed; defaulting to free", e);
    return "free";
  }
}

/** Create a Stripe Checkout Session via Edge Function; returns the redirect URL. */
export async function createCheckoutSession(plan: Exclude<Plan, "free">): Promise<string | null> {
  if (!aiBackendEnabled) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { url } = await invokeEdgeFunction<{ url: string }>("create-checkout", {
    plan,
    success_url: `${origin}/pricing?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
  });
  return url ?? null;
}

export interface LoadedState {
  results: ExamResult[];
  practice: PracticeEntry[];
}

/** Hydrate a user's full history. Returns empty state when persistence is off. */
export async function loadState(userId: string, accessToken?: string | null): Promise<LoadedState> {
  if (!persistenceEnabled || !userId || !accessToken) return { results: [], practice: [] };
  try {
    const [er, pe] = await Promise.all([
      rest<ExamRow[]>(`exam_result?user_id=eq.${userId}&order=created_at.asc`, {}, accessToken),
      rest<PracticeRow[]>(`practice_entry?user_id=eq.${userId}&order=created_at.asc`, {}, accessToken),
    ]);
    const results: ExamResult[] = (er || []).map((r) => ({
      items: [],
      wrong: [],
      score: r.score,
      correctCount: r.correct_count,
      total: r.total,
      byTopic: r.by_topic || [],
      timeUsedSec: r.time_used_sec,
      durationSec: r.duration_sec,
      at: new Date(r.created_at).getTime(),
    }));
    const practice: PracticeEntry[] = (pe || []).map((p) => ({ topicId: p.topic_id, correct: p.correct }));
    return { results, practice };
  } catch (e) {
    console.warn("[repo] loadState failed; continuing in-memory", e);
    return { results: [], practice: [] };
  }
}

/** Persist a completed exam (summary + per-topic breakdown). Fire-and-forget. */
export async function saveExamResult(userId: string, accessToken: string | null, r: ExamResult): Promise<void> {
  if (!persistenceEnabled || !userId || !accessToken) return;
  try {
    await rest(
      "exam_result",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([
          {
            user_id: userId,
            score: r.score,
            correct_count: r.correctCount,
            total: r.total,
            by_topic: r.byTopic,
            time_used_sec: r.timeUsedSec,
            duration_sec: r.durationSec,
          },
        ]),
      },
      accessToken,
    );
  } catch (e) {
    console.warn("[repo] saveExamResult failed", e);
  }
}

/** Persist a single guided-practice answer. Fire-and-forget. */
export async function savePractice(userId: string, accessToken: string | null, entry: PracticeEntry): Promise<void> {
  if (!persistenceEnabled || !userId || !accessToken) return;
  try {
    await rest(
      "practice_entry",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([{ user_id: userId, topic_id: entry.topicId, correct: entry.correct }]),
      },
      accessToken,
    );
  } catch (e) {
    console.warn("[repo] savePractice failed", e);
  }
}
