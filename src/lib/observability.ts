// ─────────────────────────────────────────────────────────────
// Observability — dependency-free crash + error reporting.
//
// When VITE_SENTRY_DSN is set, events are POSTed directly to Sentry's HTTP
// ingestion endpoint (no SDK bundle, no extra weight). When unset, errors are
// logged to the console in development and swallowed in production. Telemetry
// must NEVER throw or affect app behaviour.
// ─────────────────────────────────────────────────────────────

const DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined) || "";

const endpoint: string | null = (() => {
  if (!DSN) return null;
  try {
    const u = new URL(DSN);
    const projectId = u.pathname.replace(/^\//, "");
    return `${u.protocol}//${u.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${u.username}`;
  } catch {
    return null;
  }
})();

export type ErrorContext = Record<string, unknown>;

function normalize(err: unknown): { type: string; value: string; stack?: string } {
  if (err instanceof Error) return { type: err.name || "Error", value: err.message, stack: err.stack };
  if (typeof err === "string") return { type: "Error", value: err };
  try {
    return { type: "Error", value: JSON.stringify(err) };
  } catch {
    return { type: "Error", value: String(err) };
  }
}

/** Report an error to Sentry (if configured) and the console (in dev). Never throws. */
export function captureError(err: unknown, context?: ErrorContext): void {
  const e = normalize(err);
  if (import.meta.env.DEV) console.error("[observability]", e.value, context ?? "");
  if (!endpoint) return;
  try {
    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      environment: import.meta.env.MODE,
      exception: { values: [{ type: e.type, value: e.value }] },
      extra: { ...context, stack: e.stack },
      request: typeof window !== "undefined" ? { url: window.location.href } : undefined,
    };
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* telemetry must never break the app */
  }
}

let initialized = false;
/** Install global handlers for uncaught errors and unhandled rejections. */
export function initObservability(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("error", (ev) => captureError(ev.error ?? ev.message, { kind: "window.onerror" }));
  window.addEventListener("unhandledrejection", (ev) => captureError(ev.reason, { kind: "unhandledrejection" }));
}
