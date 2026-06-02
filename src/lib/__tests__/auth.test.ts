import { describe, it, expect } from "vitest";
import { handleAuthRedirect, getCurrentSession, persistenceEnabled, loadEntitlement } from "@/lib/repo";

// With no VITE_SUPABASE_* configured (the test env), the auth/persistence layer
// must safely no-op rather than throw or hang.
describe("auth/persistence safety when unconfigured", () => {
  it("reports persistence disabled", () => {
    expect(persistenceEnabled).toBe(false);
  });

  it("handleAuthRedirect resolves to null", async () => {
    await expect(handleAuthRedirect()).resolves.toBeNull();
  });

  it("getCurrentSession resolves to null", async () => {
    await expect(getCurrentSession()).resolves.toBeNull();
  });

  it("loadEntitlement defaults to the free plan", async () => {
    await expect(loadEntitlement("token")).resolves.toBe("free");
  });
});
