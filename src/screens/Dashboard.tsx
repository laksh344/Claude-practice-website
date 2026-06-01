import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/screens/Landing";
import { ProgressRing, Reveal, Bar, masteryColor } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CERTIFICATION, TOPICS } from "@/data/seed";
import { ArrowRight, Sparkles, FileText, BookOpen, Trophy, ChevronRight, CheckCircle2, Play, Target, Info } from "lucide-react";

export function Dashboard() {
  const { go, user, profile, demoMode, setDemoMode, lastActivity } = useStore();
  const name = user?.name || "there";

  // ── First-time / no-activity state: everything is genuinely zero ──────────
  if (!profile.hasData) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <TopNav active="dashboard" />
        <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
          <Reveal>
            <h1 className="text-4xl font-bold tracking-tightest md:text-5xl">Welcome, {name}.</h1>
            <p className="mt-2 max-w-md text-muted-foreground">Let's calibrate your readiness for the {CERTIFICATION.name}.</p>
          </Reveal>

          <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[["Overall Readiness", "—"], ["Questions Answered", "0"], ["Subtopics Mastered", "0"], ["Mock Exams", "0"]].map(([label, value], i) => (
              <Reveal key={label} delay={i * 0.05}>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-sm text-muted-foreground">{label}</div>
                  <div className="mt-3 text-3xl font-bold tracking-tight text-muted-foreground/50">{value}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.04] p-8 text-center md:p-12">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary shadow-soft"><Target className="h-7 w-7 text-white" /></div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight">Take your first diagnostic exam</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">A short mock exam calibrates your readiness and unlocks personalized analytics, weak-area detection, and your AI study plan.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="rounded-full px-7" onClick={() => go("exam")}>Start diagnostic exam <ArrowRight className="ml-1 h-4 w-4" /></Button>
                <Button size="lg" variant="outline" className="rounded-full px-7" onClick={() => setDemoMode(true)}>Explore with sample data</Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Sample data previews the full dashboard. Your real numbers appear the moment you start practicing.</p>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground">What you'll be tested on</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <span key={t.id} className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">{t.name}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Populated state: derived from real activity (or labelled sample data) ──
  const masteryRanked = [...profile.mastery].filter((m) => m.tested).sort((a, b) => a.value - b.value);
  const weakest = masteryRanked[0];
  const shownMastery = masteryRanked.slice(0, 6);
  const untested = profile.mastery.length - masteryRanked.length;
  const trendData = profile.trend.map((v, i) => ({ i, v }));

  return (
    <div className="min-h-screen bg-secondary/30">
      <TopNav active="dashboard" />
      <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tightest md:text-5xl">Welcome back, {name}.</h1>
              <p className="mt-2 max-w-md text-muted-foreground">Here is your progress towards the {CERTIFICATION.name}.</p>
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ${profile.readiness >= 70 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
              <CheckCircle2 className="h-4 w-4" /> Exam Readiness: {profile.readiness >= 80 ? "High" : profile.readiness >= 60 ? "Building" : "Early"}
            </div>
          </div>
        </Reveal>

        {demoMode && (
          <Reveal>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/[0.06] p-4">
              <div className="flex items-center gap-2 text-sm"><Info className="h-4 w-4 text-warning" /> You're exploring with <span className="font-semibold">sample data</span>. Take a real exam to see your own analytics.</div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDemoMode(false)}>Exit sample data</Button>
            </div>
          </Reveal>
        )}

        {lastActivity && !demoMode && (
          <Reveal>
            <button
              onClick={() => go(lastActivity.route)}
              className="mt-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 text-left transition-all hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white"><Play className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm font-semibold">Pick up where you left off</div>
                  <div className="text-sm text-muted-foreground">Continue in {lastActivity.label}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            </button>
          </Reveal>
        )}

        {/* stat row */}
        <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Overall Readiness", value: `${profile.readiness}%` },
            { label: "Questions Answered", value: profile.questionsAnswered },
            { label: "Subtopics Mastered", value: profile.masteredTopics },
            { label: "Mock Exams", value: profile.examsTaken },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.05}>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="mt-3 text-3xl font-bold tracking-tight">{s.value}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* predicted score */}
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Predicted Exam Score</h3>
                <button onClick={() => go("analytics")} className="flex items-center text-sm font-medium text-primary">Details <ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="mt-1 text-4xl font-bold tracking-tight">{profile.predicted}<span className="text-xl text-muted-foreground">/100</span></div>
              {trendData.length >= 2 ? (
                <>
                  <div className="-mx-2 mt-2 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#g)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-sm text-muted-foreground">Across your last {trendData.length} mock exams.</p>
                </>
              ) : (
                <div className="mt-3 grid h-28 place-items-center rounded-xl bg-secondary/50 text-center text-sm text-muted-foreground">
                  Take another mock exam to chart your trend.
                </div>
              )}
            </div>
          </Reveal>

          {/* pass probability */}
          <Reveal delay={0.05}>
            <div className="flex h-full flex-col items-center rounded-2xl border border-border bg-card p-6 text-center">
              <h3 className="self-start text-lg font-semibold">Pass Probability</h3>
              <div className="my-2"><ProgressRing value={profile.passProbability} size={150} stroke={12} /></div>
              <p className="text-sm text-muted-foreground">Based on your performance across {masteryRanked.length} practiced domains.</p>
            </div>
          </Reveal>

          {/* AI recommendation */}
          <Reveal delay={0.1}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.04] p-6">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-3.5 w-3.5" /> AI Recommendation</div>
              <h3 className="mt-3 text-xl font-semibold leading-snug">Focus on {weakest?.label ?? "your weakest domain"}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {weakest ? <>Your mastery here is {weakest.value}% — your weakest practiced domain. A short guided lesson now will lift your readiness before the next mock exam.</> : "Practice a few domains and I'll point you to the highest-leverage one to study next."}
              </p>
              <Button className="mt-4 rounded-full" onClick={() => go("guided")}>Start guided lesson <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
          </Reveal>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* topic mastery */}
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Topic Mastery</h3>
                <button onClick={() => go("knowledge")} className="flex items-center text-sm font-medium text-primary">Knowledge map <ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="mt-5 space-y-4">
                {shownMastery.map((m, i) => (
                  <motion.div key={m.topicId} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{m.label}</span>
                      <span className="tabular-nums text-muted-foreground">{m.value}%</span>
                    </div>
                    <Bar value={m.value} color={masteryColor(m.value)} />
                  </motion.div>
                ))}
              </div>
              {untested > 0 && (
                <button onClick={() => go("knowledge")} className="mt-4 text-sm font-medium text-primary hover:underline">
                  Showing your {shownMastery.length} weakest practiced domains · {untested} not yet practiced →
                </button>
              )}
            </div>
          </Reveal>

          {/* recent activity */}
          <Reveal delay={0.05}>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              {profile.activity.length > 0 ? (
                <div className="mt-4 space-y-1">
                  {profile.activity.map((a, i) => {
                    const Icon = a.kind === "exam" ? FileText : a.kind === "lesson" ? BookOpen : Trophy;
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="h-4 w-4" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground">{a.meta}</div>
                        </div>
                        {a.score != null
                          ? <div className={`text-sm font-semibold ${a.score >= CERTIFICATION.passMark ? "text-success" : "text-warning"}`}>{a.score}%</div>
                          : <div className="text-xs font-medium text-muted-foreground">Completed</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No mock exams yet. Take one to start tracking your history.</p>
              )}
              <Button variant="outline" className="mt-4 w-full rounded-full" onClick={() => go("exam")}>Start new mock exam</Button>
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </div>
  );
}
