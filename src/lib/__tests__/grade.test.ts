import { describe, it, expect } from "vitest";
import { gradeExam } from "@/lib/store";
import type { ExamItem } from "@/lib/store";
import { QUESTIONS } from "@/data/seed";

const navQs = QUESTIONS.filter((q) => q.topicId === "nav").slice(0, 3);

describe("gradeExam", () => {
  it("scores a mix of correct and incorrect answers", () => {
    const [q0, q1] = navQs;
    const items: ExamItem[] = [
      { q: q0, selected: q0.correct, flagged: false },
      { q: q1, selected: (q1.correct + 1) % q1.options.length, flagged: false },
    ];
    const r = gradeExam(items, 120, 240);
    expect(r.total).toBe(2);
    expect(r.correctCount).toBe(1);
    expect(r.score).toBe(50);
    expect(r.wrong).toHaveLength(1);
    expect(r.wrong[0].q.id).toBe(q1.id);
    expect(r.timeUsedSec).toBe(120);
    expect(r.byTopic.find((t) => t.topicId === "nav")?.total).toBe(2);
  });

  it("treats an unanswered (null) question as incorrect", () => {
    const r = gradeExam([{ q: navQs[0], selected: null, flagged: false }], 10, 100);
    expect(r.correctCount).toBe(0);
    expect(r.score).toBe(0);
    expect(r.wrong).toHaveLength(1);
  });

  it("awards 100 when every answer is correct", () => {
    const items: ExamItem[] = navQs.map((q) => ({ q, selected: q.correct, flagged: false }));
    const r = gradeExam(items, 50, 100);
    expect(r.score).toBe(100);
    expect(r.wrong).toHaveLength(0);
  });
});
