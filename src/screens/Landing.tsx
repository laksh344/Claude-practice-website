import { motion } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { CursorEnergy } from "@/components/CursorEnergy";
import { Logo, ProgressRing, Reveal } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CERTIFICATION, TOPICS, QUESTIONS } from "@/data/seed";
import {
  Sparkles, ArrowRight, Target, Brain, BarChart3, Gauge, Map, Check,
  GraduationCap, ShieldCheck, Zap, ChevronDown,
} from "lucide-react";

const features = [
  { icon: Target, title: "Realistic mock exams", body: "A timed, full-length simulator with palette, flagging, and review — weighted to the real domain blueprint." },
  { icon: Brain, title: "An AI tutor that adapts", body: "Live Claude coaching that explains your mistakes, teaches the concept, and generates fresh questions until it clicks." },
  { icon: BarChart3, title: "Topic-wise analytics", body: "See mastery per domain, mistake-type breakdowns, and time management — not just a score." },
  { icon: Gauge, title: "Readiness prediction", body: "A calibrated readiness score and pass-probability so you know exactly when to sit the exam." },
  { icon: Map, title: "Personalized study plans", body: "The platform routes you to your weakest topics first, with a clear path to mastery." },
  { icon: ShieldCheck, title: "Grounded in the real domains", body: "All 11 exam domains — from agentic codebase navigation and context management to MCP integration, structured extraction, and model selection." },
];

const HOW_STEPS = [
  { icon: Target, step: "01", title: "Simulate", body: "Take a timed mock exam weighted to the real domain blueprint, with palette, flagging, and review." },
  { icon: BarChart3, step: "02", title: "Analyze", body: "See per-domain accuracy, mistake-type breakdowns, and time management — not just a score." },
  { icon: Brain, step: "03", title: "Master", body: "Drill your weakest domains with the adaptive AI tutor until your readiness score says you're ready." },
];

const FAQS = [
  { q: "Is this affiliated with Anthropic?", a: "No. This is an independent exam-preparation platform. It is not affiliated with, endorsed by, or sponsored by Anthropic. We build practice material aligned to the publicly known certification blueprint." },
  { q: "What does the question bank cover?", a: `It spans all ${TOPICS.length} certification domains with ${QUESTIONS.length} exam-style questions — from agentic codebase navigation and context management to MCP integration, structured extraction, and model selection.` },
  { q: "Do I need to be a developer?", a: "A working familiarity with APIs and software concepts helps, since the exam targets engineers building on Claude. Beginners can still use the guided tutor to build up the fundamentals." },
  { q: "How does the AI tutor work?", a: "It retrieves the most relevant material from the knowledge base first, then explains your specific mistake, teaches the concept, and generates fresh practice questions at the right difficulty until it sticks." },
  { q: "Can I cancel or get a refund?", a: "Yes. Paid plans can be cancelled anytime, and we offer a 7-day money-back guarantee on first purchases." },
  { q: "Will the material stay current?", a: "The bank is versioned and updated as the certification evolves. Model-specific details (names, pricing, context limits) are reviewed against official documentation." },
];

export function Landing() {
  const { go } = useStore();
  return (
    <div className="min-h-screen bg-background">
      <CursorEnergy />
      <TopNav active="landing" />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="parallax-soft pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="parallax-strong pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-semibold text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" /> NEW · AI Tutor V2 powered by Claude
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl font-bold leading-[1.02] tracking-tightest md:text-7xl text-balance"
            >
              Become Claude<br />Certified.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground"
            >
              Practice smarter with an AI tutor that adapts to how you learn. Master the material, predict your readiness, and pass with confidence.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button size="lg" className="rounded-full px-7 text-base" onClick={() => go("login")}>Start Learning</Button>
              <Button size="lg" variant="outline" className="group rounded-full px-7 text-base" onClick={() => go("login")}>
                Take Mock Exam <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-3 text-sm text-muted-foreground"
            >
              Free to start · No credit card required.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> {QUESTIONS.length} exam-style questions</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> All {TOPICS.length} exam domains</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Adaptive AI tutor</span>
            </motion.div>
          </div>

          {/* hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="rounded-2xl border border-border bg-card p-7 shadow-lift">
              <div className="absolute -top-px left-7 right-7 h-1 rounded-full bg-primary" />
              <h3 className="text-center text-xl font-semibold">Exam Readiness</h3>
              <div className="my-4 grid place-items-center">
                <ProgressRing value={86} size={180} stroke={14} />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Based on your performance across standard modules, you are <span className="font-semibold text-success">highly likely</span> to pass.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
              className="absolute -bottom-8 -left-2 w-72 rounded-2xl border border-border bg-card p-4 shadow-lift md:-left-10"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary"><Sparkles className="h-4 w-4 text-white" /></div>
                <div>
                  <div className="text-sm font-semibold">AI Tutor</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">You struggled with Context Windows. Want to review that topic before moving on?</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-[1200px] px-5 py-9 md:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { n: `${QUESTIONS.length}`, l: "Exam-style questions" },
              { n: `${TOPICS.length}`, l: "Certification domains" },
              { n: `${CERTIFICATION.passMark}%`, l: "Score to pass" },
              { n: `${CERTIFICATION.durationMin}m`, l: "Real exam length" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-3xl font-bold tracking-tight tabular-nums md:text-4xl">{s.n}</div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Built around the real certification blueprint</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {TOPICS.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <GraduationCap className="h-4 w-4" /> {t.name}
              </div>
            ))}
          </div>
          <p className="mt-7 text-center text-xs text-muted-foreground">
            Independent exam-prep platform · Not affiliated with or endorsed by Anthropic.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-5xl text-balance">Everything you need to walk in ready.</h2>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">Not a quiz site. A complete readiness system: simulate, analyze, learn from mistakes, and let an AI coach close every gap.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="energy-card group h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lift">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* DARK CTA band */}
      <section className="bg-black">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white"><Zap className="h-3.5 w-3.5" /> Guided AI Practice</div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl text-balance">An AI coach that teaches until it sticks.</h2>
            <p className="mt-3 max-w-lg text-white/70">Answer a question, get instant evaluation, a clear explanation, a worked example, and a fresh reinforcement question at the right difficulty. Repeat until mastery.</p>
            <Button size="lg" className="mt-7 rounded-full bg-white px-7 text-base text-black hover:bg-white/90" onClick={() => go("login")}>Try the AI Tutor</Button>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-3">
              {[
                { who: "tutor", text: "Let's test tool design. When Claude calls a tool, what's the stop_reason?" },
                { who: "you", text: "end_turn?" },
                { who: "tutor", text: "Close — that's the final answer signal. A tool call pauses with stop_reason = tool_use. Here's a fresh one to lock it in…" },
              ].map((m, i) => (
                <div key={i} className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${m.who === "you" ? "ml-auto bg-primary text-white" : "bg-white/10 text-white"}`}>{m.text}</div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-24">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">A measured path to exam-ready.</h2>
            <p className="mx-auto mt-3 max-w-md text-center text-lg text-muted-foreground">Three steps, repeated until your readiness score says you're ready.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {HOW_STEPS.map((s, i) => (
              <Reveal key={s.step} delay={i * 0.06}>
                <div className="energy-card flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary"><s.icon className="h-5 w-5" /></div>
                    <span className="text-sm font-bold text-muted-foreground/40">{s.step}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[820px] px-5 py-20 md:px-8 md:py-24">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Frequently asked questions</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={i} delay={i * 0.03}>
              <details className="group rounded-2xl border border-border bg-card p-5 [&_summary]:list-none">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRICING preview */}
      <PricingPreview />

      <Footer />
    </div>
  );
}

function PricingPreview() {
  const { go } = useStore();
  const tiers = [
    { name: "Free", price: "₹0", note: "For getting started", popular: false, feats: ["10 practice questions / day", "1 mock exam", "Basic score report"] },
    { name: "Pro", price: "₹799", per: "/mo", note: "For serious candidates", popular: true, feats: ["Unlimited mock exams", "Full analytics & readiness score", "Wrong-answer review", "Knowledge map"] },
    { name: "AI Mentor", price: "₹1,499", per: "/mo", note: "Everything + live coaching", popular: false, feats: ["Everything in Pro", "Live AI tutor (Claude)", "Adaptive question generation", "Personalized study plans"] },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
      <Reveal>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Simple, premium pricing.</h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-muted-foreground">Start free. Upgrade when you're serious about passing.</p>
        </div>
      </Reveal>
      <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
        {tiers.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.06}>
            <div className={`energy-card relative h-full rounded-2xl border p-6 transition-all hover:-translate-y-1 ${t.popular ? "border-primary bg-card shadow-lift" : "border-border bg-card hover:shadow-soft"}`}>
              {t.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-white">Most popular</div>}
              <div className="text-sm font-semibold text-muted-foreground">{t.name}</div>
              <div className="mt-2 flex items-end gap-1"><span className="text-4xl font-bold tracking-tight">{t.price}</span><span className="mb-1 text-sm text-muted-foreground">{t.per}</span></div>
              <div className="mt-1 text-sm text-muted-foreground">{t.note}</div>
              <ul className="mt-5 space-y-2.5">
                {t.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{f}</li>
                ))}
              </ul>
              <Button onClick={() => go("pricing")} variant={t.popular ? "default" : "outline"} className="mt-6 w-full rounded-full">Choose {t.name}</Button>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  const { go } = useStore();
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">© 2026 Claude Certification Academy. An independent study platform — not affiliated with, endorsed by, or sponsored by Anthropic.</p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground" aria-label="Footer">
          <button onClick={() => go("pricing")} className="rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Pricing</button>
          <button onClick={() => go("terms")} className="rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Terms</button>
          <button onClick={() => go("privacy")} className="rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Privacy</button>
          <a href="mailto:support@claude-academy.app" className="rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Support</a>
        </nav>
      </div>
    </footer>
  );
}
