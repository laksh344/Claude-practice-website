import { describe, it, expect } from "vitest";
import { computeProfile } from "@/lib/store";
import type { ExamResult } from "@/lib/store";
import { DASHBOARD_SEED } from "@/data/seed";

describe("computeProfile", () => {
  it("returns an empty baseline with no activity", () => {
    const p = computeProfile([], [], false);
    expect(p.hasData).toBe(false);
    expect(p.examsTaken).toBe(0);
    expect(p.readiness).toBe(0);
    expect(p.questionsAnswered).toBe(0);
    expect(p.mastery.every((m) => !m.tested)).toBe(true);
  });

  it("derives mastery and readiness from a real exam result", () => {
    const result: ExamResult = {
      items: [],
      wrong: [],
      score: 80,
      correctCount: 8,
      total: 10,
      byTopic: [{ topicId: "nav", name: "Agentic Codebase Navigation", correct: 8, total: 10, pct: 80 }],
      timeUsedSec: 100,
      durationSec: 200,
      at: Date.now(),
    };
    const p = computeProfile([result], [], false);
    expect(p.hasData).toBe(true);
    expect(p.examsTaken).toBe(1);
    expect(p.questionsAnswered).toBe(10);
    expect(p.mastery.find((m) => m.topicId === "nav")).toMatchObject({ value: 80, tested: true });
    expect(p.readiness).toBe(80); // round(0.5*avgMastery + 0.5*latest) = round(0.5*80 + 0.5*80)
    expect(p.predicted).toBe(78);
  });

  it("uses the labelled sample dataset in demo mode", () => {
    const p = computeProfile([], [], true);
    expect(p.demo).toBe(true);
    expect(p.readiness).toBe(DASHBOARD_SEED.readiness);
    expect(p.questionsAnswered).toBe(DASHBOARD_SEED.questionsAnswered);
  });
});
