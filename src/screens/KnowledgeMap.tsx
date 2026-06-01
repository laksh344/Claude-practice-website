import { useState } from "react";
import { motion } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/screens/Landing";
import { Reveal, Bar } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { TOPICS, SUBTOPICS as SUBTOPIC_NAMES } from "@/data/seed";
import { CheckCircle2, Sparkles, Circle, ArrowRight } from "lucide-react";

// Derive a stable per-subtopic mastery spread around the domain average,
// so the detail panel reflects the same numbers as the domain rail.
function subtopicsFor(domainId: string, avg: number): { name: string; v: number }[] {
  const names = SUBTOPIC_NAMES[domainId] || [];
  const spread = [10, 2, -4, -8, 6, -2, -6];
  return names.map((name, i) => ({
    name,
    v: Math.max(18, Math.min(98, avg + (spread[i % spread.length] || 0))),
  }));
}

function state(v: number) {
  if (v >= 75) return { label: "Mastered", color: "hsl(var(--success))", icon: CheckCircle2 };
  if (v >= 50) return { label: "Learning", color: "hsl(var(--primary))", icon: Circle };
  return { label: "Weak", color: "hsl(var(--warning))", icon: Circle };
}

export function KnowledgeMap() {
  const { go, profile } = useStore();
  const [active, setActive] = useState(TOPICS[0].id);
  const topicAvg = (id: string) => {
    const m = profile.mastery.find((x) => x.topicId === id);
    return m?.value ?? 0;
  };
  const subs = subtopicsFor(active, topicAvg(active));

  return (
    <div className="min-h-screen bg-secondary/30">
      <TopNav active="knowledge" />
      <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
        <Reveal>
          <h1 className="text-4xl font-bold tracking-tightest md:text-5xl">Knowledge map</h1>
          <p className="mt-2 max-w-lg text-muted-foreground">Your mastery across every domain and subtopic. Green is mastered, blue is in progress, amber needs work.</p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <Legend color="hsl(var(--success))" label="Mastered" />
            <Legend color="hsl(var(--primary))" label="Learning" />
            <Legend color="hsl(var(--warning))" label="Weak" />
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-[340px_1fr]">
          {/* domain rail */}
          <div className="space-y-2.5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1 no-scrollbar">
            {TOPICS.map((t, i) => {
              const v = topicAvg(t.id);
              const s = state(v);
              const sel = active === t.id;
              return (
                <Reveal key={t.id} delay={i * 0.04}>
                  <button onClick={() => setActive(t.id)} className={`w-full rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${sel ? "border-primary bg-card shadow-soft" : "border-border bg-card hover:border-foreground/20"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: s.color }}>{v}%</span>
                    </div>
                    <div className="mt-2.5"><Bar value={v} color={s.color} /></div>
                    <div className="mt-2 text-xs font-medium" style={{ color: s.color }}>{s.label}</div>
                  </button>
                </Reveal>
              );
            })}
          </div>

          {/* subtopic detail */}
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{TOPICS.find((t) => t.id === active)?.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{TOPICS.find((t) => t.id === active)?.blurb}</p>
                </div>
                <Button className="rounded-full" onClick={() => go("guided")}>Practice this <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </div>
              <div className="mt-6 space-y-3">
                {subs.map((sub, i) => {
                  const s = state(sub.v);
                  return (
                    <motion.div key={sub.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4 rounded-xl border border-border p-4">
                      <s.icon className="h-5 w-5 shrink-0" style={{ color: s.color }} fill={sub.v >= 75 ? s.color : "none"} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between"><span className="font-medium">{sub.name}</span><span className="text-sm tabular-nums text-muted-foreground">{sub.v}%</span></div>
                        <div className="mt-2"><Bar value={sub.v} color={s.color} /></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-xl bg-primary/[0.04] p-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">The tutor recommends starting with <span className="font-semibold text-foreground">{[...subs].sort((a, b) => a.v - b.v)[0]?.name}</span> — your weakest subtopic here.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-3 w-3 rounded-full" style={{ background: color }} />{label}</span>;
}
