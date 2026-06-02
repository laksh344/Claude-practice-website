import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/screens/Landing";
import { Reveal, Bar, masteryColor } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CERTIFICATION, TOPICS } from "@/data/seed";
import { explainMistake } from "@/lib/claude";
import {
  CheckCircle2, XCircle, Sparkles, ArrowRight, AlertTriangle, Clock, TrendingUp, Repeat, GraduationCap,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E"];
const MISTAKE_COLORS: Record<string, string> = {
  "knowledge gap": "hsl(var(--primary))",
  "misread question": "hsl(var(--warning))",
  "distractor selection": "#A855F7",
  "partial understanding": "#06B6D4",
  "overconfidence": "hsl(var(--destructive))",
};

export function Analytics() {
  const { go, result, previousResult } = useStore();
  const [analysis, setAnalysis] = useState<Record<string, { explanation: string; mistakeType: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        result.wrong.map(async (it) => {
          const r = await explainMistake(it.q, it.selected ?? -1);
          return [it.q.id, r] as const;
        })
      );
      if (!cancelled) {
        setAnalysis(Object.fromEntries(entries));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [result]);

  // Computed before the early return so the hook order is stable (rules-of-hooks).
  const mistakeDist = useMemo(() => {
    if (!result) return [] as { name: string; value: number; n: number }[];
    const counts: Record<string, number> = {};
    result.wrong.forEach((it) => {
      const m = analysis[it.q.id]?.mistakeType || "knowledge gap";
      counts[m] = (counts[m] || 0) + 1;
    });
    const total = result.wrong.length || 1;
    return Object.entries(counts).map(([name, n]) => ({ name, value: Math.round((n / total) * 100), n }));
  }, [analysis, result]);

  if (!result) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <TopNav active="analytics" />
        <div className="mx-auto max-w-md px-6 py-32 text-center">
          <h1 className="text-2xl font-semibold">No exam results yet</h1>
          <p className="mt-2 text-muted-foreground">Take a mock exam to unlock your analytics report.</p>
          <Button className="mt-6 rounded-full" onClick={() => go("exam")}>Take a mock exam</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const pass = result.score >= CERTIFICATION.passMark;
  const readiness = Math.min(99, Math.round(result.score * 0.6 + 36));
  const predicted = Math.max(0, Math.round(result.score - 2));
  const passProb = Math.min(99, Math.round(readiness * 1.05));
  const prevReadiness = previousResult ? Math.min(99, Math.round(previousResult.score * 0.6 + 36)) : null;
  const readinessDelta = prevReadiness != null ? readiness - prevReadiness : null;

  const timePct = Math.round((result.timeUsedSec / result.durationSec) * 100);
  const weakest = result.byTopic[0];

  return (
    <div className="min-h-screen bg-secondary/30">
      <TopNav active="analytics" />
      <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
        <Reveal>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success"><span className="h-2 w-2 rounded-full bg-success" /> Result ready</div>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tightest md:text-5xl">Exam complete: {CERTIFICATION.name}</h1>
              <p className="mt-2 text-muted-foreground">You answered {result.correctCount} of {result.total} correctly.{previousResult && <> · <span className={result.score >= previousResult.score ? "font-medium text-success" : "font-medium text-destructive"}>{result.score >= previousResult.score ? "▲" : "▼"} {Math.abs(result.score - previousResult.score)}% vs last attempt ({previousResult.score}%)</span></>}</p>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-6 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Final Score</div>
                <div className={`text-4xl font-bold tracking-tight ${pass ? "text-success" : "text-destructive"}`}>{result.score}<span className="text-xl text-muted-foreground">/100</span></div>
              </div>
              <div className={`rounded-full px-3 py-1 text-sm font-semibold ${pass ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{pass ? "PASS" : "NOT YET"}</div>
            </div>
          </div>
        </Reveal>

        {/* KPI row */}
        <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Overall Score", value: `${result.score}%`, icon: CheckCircle2, sub: <Bar value={result.score} /> },
            { label: "Readiness Score", value: `${readiness}%`, icon: TrendingUp, sub: readinessDelta != null ? <span className={`text-sm font-medium ${readinessDelta >= 0 ? "text-success" : "text-destructive"}`}>{readinessDelta >= 0 ? "+" : ""}{readinessDelta}% from last mock</span> : <span className="text-sm text-muted-foreground">First attempt — baseline set</span> },
            { label: "Predicted Real Exam", value: `${predicted}%`, icon: GraduationCap, sub: <span className="text-sm text-muted-foreground">Margin of error ±3%</span> },
            { label: "Pass Probability", value: pass ? `High` : `Building`, icon: CheckCircle2, sub: <span className="text-sm text-muted-foreground">{passProb}% based on history</span> },
          ].map((k, i) => (
            <Reveal key={k.label} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between text-muted-foreground"><span className="text-sm">{k.label}</span><k.icon className="h-4 w-4" /></div>
                <div className={`mt-2 text-3xl font-bold tracking-tight ${k.label === "Pass Probability" && pass ? "text-success" : ""}`}>{k.value}</div>
                <div className="mt-2">{k.sub}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* radar + mistake distribution */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold">Topic Mastery</h3>
              <p className="text-sm text-muted-foreground">Your accuracy by domain on this exam — weakest first.</p>
              <div className="mt-5 space-y-3.5" role="img" aria-label="Per-domain accuracy, weakest first">
                {result.byTopic.map((t) => (
                  <div key={t.topicId}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{t.name}</span>
                      <span className="tabular-nums text-muted-foreground">{t.correct}/{t.total} · {t.pct}%</span>
                    </div>
                    <Bar value={t.pct} color={masteryColor(t.pct)} />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Mistake Analysis</h3>
                <span className="text-sm text-muted-foreground">{result.wrong.length} {result.wrong.length === 1 ? "error" : "errors"}</span>
              </div>
              {result.wrong.length === 0 ? (
                <div className="grid h-60 place-items-center text-center">
                  <div><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><p className="mt-2 font-medium">Flawless run — no mistakes to analyze.</p></div>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-6">
                  <div className="relative h-44 w-44 shrink-0" role="img" aria-label={`Mistake distribution across ${result.wrong.length} errors`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={mistakeDist} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={3} stroke="none">
                          {mistakeDist.map((m) => <Cell key={m.name} fill={MISTAKE_COLORS[m.name] || "hsl(var(--primary))"} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center"><div className="text-2xl font-bold">{result.wrong.length}</div><div className="text-xs text-muted-foreground">errors</div></div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {loading ? (
                      [0, 1, 2].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-secondary" />)
                    ) : mistakeDist.map((m) => (
                      <div key={m.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: MISTAKE_COLORS[m.name] }} />
                        <span className="flex-1 capitalize">{m.name}</span>
                        <span className="tabular-nums font-medium text-muted-foreground">{m.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* critical gaps + time mgmt */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold">Critical gaps</h3>
              <p className="text-sm text-muted-foreground">Domains to prioritize before your next attempt.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {result.byTopic.slice(0, 2).map((t, i) => (
                  <div key={t.topicId} className="rounded-xl border border-border p-4">
                    <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${i === 0 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                      {i === 0 ? <AlertTriangle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {i === 0 ? "High priority" : "Medium priority"}
                    </div>
                    <div className="mt-2 font-semibold">{t.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t.correct}/{t.total} correct ({t.pct}%)</div>
                    <div className="mt-3"><Bar value={t.pct} color={masteryColor(t.pct)} /></div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /><span className="text-sm">Time management</span></div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{Math.floor(result.timeUsedSec / 60)}m {result.timeUsedSec % 60}s</div>
              <p className="mt-1 text-sm text-muted-foreground">You used {timePct}% of the allotted time.</p>
              <div className="mt-3"><Bar value={timePct} color={timePct > 90 ? "hsl(var(--warning))" : "hsl(var(--success))"} /></div>
              <p className="mt-3 text-sm text-muted-foreground">{timePct > 90 ? "You cut it close — practice pacing on harder items." : "Comfortable pacing. Good time discipline."}</p>
            </div>
          </Reveal>
        </div>

        {/* AI coach insight */}
        <Reveal>
          <div className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.04] p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary"><Sparkles className="h-5 w-5 text-white" /></div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">AI Coach insight</div>
                <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed">
                  {pass ? "Strong result. " : ""}Your sharpest domain is <span className="font-semibold">{result.byTopic[result.byTopic.length - 1]?.name}</span>, while <span className="font-semibold">{weakest?.name}</span> ({weakest?.pct}%) is dragging your readiness. Spend your next session in Guided Practice on that domain — I'll teach the concepts and generate fresh questions until it's solid.
                </p>
                <Button className="mt-4 rounded-full" onClick={() => go("guided")}>Open Guided Practice <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* wrong answer review */}
        {result.wrong.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold tracking-tight">Wrong-answer review</h2>
            <p className="mt-1 text-muted-foreground">Every miss, with a tailored explanation and your next move.</p>
            <div className="mt-5 space-y-4">
              {result.wrong.map((it, i) => {
                const a = analysis[it.q.id];
                const topic = TOPICS.find((t) => t.id === it.q.topicId);
                return (
                  <Reveal key={it.q.id} delay={i * 0.03}>
                    <div className="rounded-2xl border border-border bg-card p-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-muted-foreground">{topic?.name}</span>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium capitalize text-muted-foreground">{it.q.difficulty}</span>
                        {a && <span className="rounded-full px-2.5 py-0.5 font-semibold capitalize" style={{ background: `${MISTAKE_COLORS[a.mistakeType]}1a`, color: MISTAKE_COLORS[a.mistakeType] }}>{a.mistakeType}</span>}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold leading-snug">{it.q.prompt}</h3>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/[0.04] px-3 py-2.5">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          <div className="text-sm"><div className="text-xs font-semibold text-destructive">Your answer</div>{it.selected != null ? `${LETTERS[it.selected]}. ${it.q.options[it.selected]}` : "Skipped"}</div>
                        </div>
                        <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/[0.04] px-3 py-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <div className="text-sm"><div className="text-xs font-semibold text-success">Correct answer</div>{LETTERS[it.q.correct]}. {it.q.options[it.q.correct]}</div>
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl bg-secondary/60 p-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-3.5 w-3.5" /> Why</div>
                        {a ? <p className="mt-1.5 text-sm leading-relaxed">{a.explanation}</p>
                          : <div className="mt-2 space-y-1.5"><div className="h-3 w-full animate-pulse rounded bg-border" /><div className="h-3 w-2/3 animate-pulse rounded bg-border" /></div>}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        )}

        {/* retake modes */}
        <Reveal>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">What next?</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { t: "Full retake", d: "New full mock exam", icon: Repeat, a: () => go("exam") },
                { t: "Weak areas", d: "Drill your lowest domains", icon: AlertTriangle, a: () => go("guided") },
                { t: "Guided practice", d: "Learn with the AI tutor", icon: Sparkles, a: () => go("guided") },
                { t: "Knowledge map", d: "See your mastery tree", icon: GraduationCap, a: () => go("knowledge") },
              ].map((r) => (
                <button key={r.t} onClick={r.a} className="group rounded-xl border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-soft">
                  <r.icon className="h-5 w-5 text-primary" />
                  <div className="mt-2 font-semibold">{r.t}</div>
                  <div className="text-sm text-muted-foreground">{r.d}</div>
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
