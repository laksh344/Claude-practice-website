import { describe, it, expect } from "vitest";
import { routeFromPath } from "@/lib/store";

describe("routeFromPath", () => {
  it("maps known URLs to routes", () => {
    expect(routeFromPath("/")).toBe("landing");
    expect(routeFromPath("/exam")).toBe("exam");
    expect(routeFromPath("/knowledge")).toBe("knowledge");
    expect(routeFromPath("/privacy")).toBe("privacy");
    expect(routeFromPath("/pricing")).toBe("pricing");
  });

  it("falls back to landing for unknown paths", () => {
    expect(routeFromPath("/does-not-exist")).toBe("landing");
  });
});
