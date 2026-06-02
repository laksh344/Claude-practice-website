import { describe, it, expect } from "vitest";
import { retrieve } from "@/lib/claude";

describe("retrieve (knowledge-base RAG scorer)", () => {
  it("returns up to k relevant questions for a domain query", () => {
    const hits = retrieve("Grep Glob search files", 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("returns nothing when the query shares no keywords", () => {
    expect(retrieve("zzzqqxnonsense", 3)).toHaveLength(0);
  });

  it("scopes retrieval to a single topic when given a topicId", () => {
    const hits = retrieve("tool design schema", 5, "mcp");
    expect(hits.every((q) => q.topicId === "mcp")).toBe(true);
  });
});
