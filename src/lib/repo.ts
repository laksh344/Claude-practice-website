// ─────────────────────────────────────────────────────────────
// Durable persistence via Supabase (Auth + PostgREST) — dependency-free.
//
// Design: this layer is OPTIONAL. When VITE_SUPABASE_URL / _ANON_KEY are set
// (a real `npm run dev` / deployment), attempts are written to and hydrated
// from Postgres, so data survives reloads. When they are absent — e.g. the
// in-browser artifact preview, which can't reach an external DB — every
// function no-ops and the app runs purely in memory with zero behaviour change.
// ─────────────────────────────────────────────────────────────
import type { ExamResult, PracticeEntry } from "@/lib/store";

const ENV: Record<string, string | undefined> =
  (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env) || {};
const SUPABASE_URL = ENV.VITE_SUPABASE_URL;
const SUPABASE_KEY = ENV.VITE_SUPABASE_ANON_KEY;

/** True only when real Supabase credentials are configured. */
export const persistenceEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

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

const SESSION_KEY = "claude-academy.supabase-session";

function authRedirectTo(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

function baseHeaders(authToken?: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_KEY as string,
    Authorization: `Bearer ${authToken || SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest(path: string, init: RequestInit = {}, authToken?: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...baseHeaders(authToken), ...(init.headers as Record<string, string> || {}) },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function auth(path: string, init: RequestInit = {}, authToken?: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: { ...baseHeaders(authToken), ...(init.headers as Record<string, string> || {}) },
  });
  if (!res.ok) throw new Error(`supabase auth ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as AuthSession : null;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
}

async function sessionFromAuthPayload(payload: any): Promise<AuthSession | null> {
  if (!payload?.access_token) return null;
  const expiresAt = payload.expires_at || (payload.expires_in ? Math.floor(Date.now() / 1000) + Number(payload.expires_in) : undefined);
  let user = payload.user as AuthUser | undefined;
  if (!user?.id) {
    user = await auth("user", { method: "GET" }, payload.access_token);
  }
  if (!user?.id) return null;
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: expiresAt,
    user,
  };
}

export function consumeAuthRedirect(): AuthSession | null {
  if (!persistenceEnabled || typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (!params.has("access_token")) return null;
  const session = {
    access_token: params.get("access_token") || "",
    refresh_token: params.get("refresh_token") || undefined,
    expires_at: params.get("expires_in") ? Math.floor(Date.now() / 1000) + Number(params.get("expires_in")) : undefined,
    user: { id: "" },
  } as AuthSession;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  return session.access_token ? session : null;
}

export async function completeAuthRedirect(session: AuthSession): Promise<AuthSession | null> {
  const full = await sessionFromAuthPayload(session);
  if (full) persistSession(full);
  return full;
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
    const refreshed = await auth("token?grant_type=refresh_token", {
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
  // GoTrue's /otp endpoint reads the post-confirmation redirect from the
  // `redirect_to` query parameter, not the JSON body (the `options.emailRedirectTo`
  // shape is a supabase-js client convention this raw REST layer doesn't use).
  // Mirrors signInWithProvider below.
  const redirect = encodeURIComponent(authRedirectTo());
  await auth(`otp?redirect_to=${redirect}`, {
    method: "POST",
    body: JSON.stringify({ email, create_user: true }),
  });
}

export function signInWithProvider(provider: AuthProvider): void {
  if (!persistenceEnabled || typeof window === "undefined") return;
  const redirect = encodeURIComponent(authRedirectTo());
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirect}`;
}

export async function signOutAuth(accessToken?: string | null): Promise<void> {
  persistSession(null);
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
    const rows = await rest("app_user?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{ id: session.user.id, email: session.user.email, name }]),
    }, session.access_token);
    return rows?.[0]?.id ?? null;
  } catch (e) {
    console.warn("[repo] ensureAuthUser failed; continuing in-memory", e);
    return null;
  }
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
      rest(`exam_result?user_id=eq.${userId}&order=created_at.asc`, {}, accessToken),
      rest(`practice_entry?user_id=eq.${userId}&order=created_at.asc`, {}, accessToken),
    ]);
    const results: ExamResult[] = (er || []).map((r: any) => ({
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
    const practice: PracticeEntry[] = (pe || []).map((p: any) => ({
      topicId: p.topic_id,
      correct: p.correct,
    }));
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
    await rest("exam_result", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: userId,
        score: r.score,
        correct_count: r.correctCount,
        total: r.total,
        by_topic: r.byTopic,
        time_used_sec: r.timeUsedSec,
        duration_sec: r.durationSec,
      }]),
    }, accessToken);
  } catch (e) {
    console.warn("[repo] saveExamResult failed", e);
  }
}

/** Persist a single guided-practice answer. Fire-and-forget. */
export async function savePractice(userId: string, accessToken: string | null, entry: PracticeEntry): Promise<void> {
  if (!persistenceEnabled || !userId || !accessToken) return;
  try {
    await rest("practice_entry", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{ user_id: userId, topic_id: entry.topicId, correct: entry.correct }]),
    }, accessToken);
  } catch (e) {
    console.warn("[repo] savePractice failed", e);
  }
}
