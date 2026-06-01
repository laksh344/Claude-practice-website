import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { useStore, gradeExam } from "@/lib/store";
import type { ExamItem } from "@/lib/store";
import { CERTIFICATION } from "@/data/seed";
import { Clock, Flag, ArrowLeft, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const LETTERS = ["A", "B", "C", "D", "E"];

export function Exam() {
  const { go, buildExam, setResult } = useStore();
  const [items, setItems] = useState<ExamItem[]>(() => buildExam(20));
  const [idx, setIdx] = useState(0);
  const DURATION = items.length * 90; // 90s per question
  const [left, setLeft] = useState(DURATION);
  const [confirm, setConfirm] = useState(false);
  const startedAt = useRef(Date.now());
  const cur = items[idx];

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left === 0) submit(); /* eslint-disable-next-line */ }, [left]);

  // Keyboard shortcuts: 1-5 to answer, F to flag, ←/→ to navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirm) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key >= "1" && e.key <= "5") {
        const oi = parseInt(e.key, 10) - 1;
        if (cur && oi < cur.q.options.length) setSelected(oi);
      } else if (e.key.toLowerCase() === "f") {
        toggleFlag();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        setIdx((i) => i - 1);
      } else if (e.key === "ArrowRight" && idx < items.length - 1) {
        setIdx((i) => i + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    /* eslint-disable-next-line */
  }, [cur, idx, items.length, confirm]);

  const answered = items.filter((i) => i.selected !== null).length;
  const flagged = items.filter((i) => i.flagged).length;

  const setSelected = (oi: number) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, selected: oi } : it)));
  const toggleFlag = () =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, flagged: !it.flagged } : it)));

  const submit = () => {
    const used = Math.min(DURATION, Math.round((Date.now() - startedAt.current) / 1000));
    setResult(gradeExam(items, used, DURATION));
    go("analytics");
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const low = left < 60;

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* exam top bar */}
      <header className="sticky top-0 z-40 border-b border-border glass">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-sm text-muted-foreground sm:block">· {CERTIFICATION.name}</span>
          </div>
          <div role="timer" aria-live="polite" aria-label={`Time remaining ${mm}:${ss}${low ? ", low time" : ""}`} className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold tabular-nums ${low ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"}`}>
            <Clock className="h-4 w-4" /> {mm}:{ss}
            <span className="ml-2 hidden font-normal text-muted-foreground sm:inline">Question {idx + 1} of {items.length}</span>
          </div>
          <Button onClick={() => setConfirm(true)} className="rounded-full">Submit exam</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-5 px-4 py-6 md:px-6 lg:grid-cols-[1fr_320px]">
        {/* question card */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question {idx + 1}</div>
            <button onClick={toggleFlag} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${cur.flagged ? "border-warning bg-warning/10 text-warning" : "border-border text-muted-foreground hover:bg-secondary"}`}>
              <Flag className="h-3.5 w-3.5" /> {cur.flagged ? "Flagged" : "Flag for review"}
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight">{cur.q.prompt}</h2>
              <div className="mt-6 space-y-3">
                {cur.q.options.map((opt, oi) => {
                  const sel = cur.selected === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => setSelected(oi)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${sel ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "border-border hover:border-foreground/30 hover:bg-secondary/50"}`}
                    >
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${sel ? "border-primary bg-primary text-white" : "border-border text-muted-foreground"}`}>{LETTERS[oi]}</span>
                      <span className="text-[15px]">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Button variant="outline" className="rounded-full" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            {idx < items.length - 1
              ? <Button variant="outline" className="rounded-full" onClick={() => setIdx((i) => i + 1)}>Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
              : <Button className="rounded-full" onClick={() => setConfirm(true)}>Review & submit</Button>}
          </div>
        </div>

        {/* palette */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-[88px] lg:self-start">
          <h3 className="text-base font-semibold">Question Palette</h3>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {items.map((it, i) => {
              const state = i === idx ? "current" : it.flagged ? "flagged" : it.selected !== null ? "answered" : "blank";
              const cls = {
                current: "bg-primary text-white ring-2 ring-primary ring-offset-1",
                flagged: "bg-warning text-white",
                answered: "bg-success text-white",
                blank: "border border-border text-muted-foreground hover:bg-secondary",
              }[state];
              return (
                <button key={i} onClick={() => setIdx(i)} className={`grid h-10 place-items-center rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${cls}`}>{i + 1}</button>
              );
            })}
          </div>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <Legend color="bg-success" label="Answered" n={answered} />
            <Legend color="bg-border" label="Unanswered" n={items.length - answered} />
            <Legend color="bg-primary" label="Current" />
            <Legend color="bg-warning" label="Flagged" n={flagged} />
          </div>
          <p className="mt-4 hidden text-xs leading-relaxed text-muted-foreground lg:block">
            Tip: press <kbd className="rounded bg-secondary px-1 font-sans">1</kbd>–<kbd className="rounded bg-secondary px-1 font-sans">5</kbd> to answer, <kbd className="rounded bg-secondary px-1 font-sans">F</kbd> to flag, <kbd className="rounded bg-secondary px-1 font-sans">←</kbd>/<kbd className="rounded bg-secondary px-1 font-sans">→</kbd> to navigate.
          </p>
        </div>
      </main>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Submit your exam?</DialogTitle>
            <DialogDescription>
              You've answered <span className="font-semibold text-foreground">{answered}</span> of {items.length} questions
              {items.length - answered > 0 && <> · <span className="font-semibold text-warning">{items.length - answered} unanswered</span></>}
              {flagged > 0 && <> · <span className="font-semibold text-warning">{flagged} flagged for review</span></>}.
              Submitting generates your full analytics report.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setConfirm(false)}>Keep working</Button>
            <Button className="rounded-full" onClick={submit}>Submit & see results</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ color, label, n }: { color: string; label: string; n?: number }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={`h-3.5 w-3.5 rounded-[4px] ${color}`} />
      <span className="flex-1">{label}</span>
      {n !== undefined && <span className="tabular-nums">({n})</span>}
    </div>
  );
}
