import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bar } from "@/components/primitives";
import { useStore } from "@/lib/store";
import { QUESTIONS, TOPICS } from "@/data/seed";
import type { Question, Difficulty } from "@/data/seed";
import { askTutor, explainMistake, generateSimilar } from "@/lib/claude";
import { Sparkles, CheckCircle2, XCircle, Send, ArrowRight, Loader2, Wand2 } from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E"];
const LADDER: Difficulty[] = ["easy", "medium", "hard", "expert"];

// Group the 11 domains so the picker reads as 3 tidy sections, not a wall of cards.
const PICKER_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Claude Code", ids: ["nav", "ci", "codegen"] },
  { label: "Agents & Tools", ids: ["support", "resolution", "mcp", "agentic"] },
  { label: "Prompting & Models", ids: ["context", "extraction", "prompting", "model"] },
];

type Phase = "answering" | "feedback";
interface ChatMsg { role: "user" | "tutor"; text: string }

export function Guided() {
  const [topicId, setTopicId] = useState<string | null>(null);

  if (!topicId) return <Picker onPick={setTopicId} />;
  return <Session topicId={topicId} onExit={() => setTopicId(null)} />;
}

function Picker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="min-h-screen bg-secondary/30">
      <TopNav active="guided" />
      <main className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary shadow-soft"><Sparkles className="h-7 w-7 text-white" /></div>
          <h1 className="mt-5 text-4xl font-bold tracking-tightest">Guided AI Practice</h1>
          <p className="mx-auto mt-3 max-w-md text-lg text-muted-foreground">Pick a domain. The AI tutor asks a question, evaluates your answer, teaches the concept, and adapts difficulty until you've mastered it.</p>
        </div>
        <div className="mt-10 space-y-8">
          {PICKER_GROUPS.map((g) => (
            <div key={g.label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{g.label}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.ids.map((id) => {
                  const t = TOPICS.find((x) => x.id === id);
                  if (!t) return null;
                  return (
                    <button key={t.id} onClick={() => onPick(t.id)} className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{t.name}</h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">{t.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Session({ topicId, onExit }: { topicId: string; onExit: () => void }) {
  const { logPractice } = useStore();
  const topic = TOPICS.find((t) => t.id === topicId)!;
  const [diffIdx, setDiffIdx] = useState(0);
  const difficulty = LADDER[diffIdx];
  const [q, setQ] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [coach, setCoach] = useState<string>("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [mastery, setMastery] = useState(20);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());

  // free-form chat
  const [chat, setChat] = useState<ChatMsg[]>([{ role: "tutor", text: `Hi! I'm your tutor for ${topic.name}. Answer the question, or ask me anything below.` }]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  const pickSeed = (d: Difficulty, exclude: Set<string>): Question | null => {
    const pool = QUESTIONS.filter((x) => x.topicId === topicId && !exclude.has(x.id));
    const byDiff = pool.filter((x) => x.difficulty === d);
    return (byDiff[0] || pool[0]) ?? null;
  };

  const loadFirst = () => {
    const first = pickSeed("easy", new Set());
    setQ(first);
  };
  useEffect(loadFirst, [topicId]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, chatLoading]);

  const submit = async (oi: number) => {
    if (!q || phase === "feedback") return;
    setSelected(oi);
    setPhase("feedback");
    const correct = oi === q.correct;
    setAnsweredIds((s) => new Set(s).add(q.id));
    logPractice(topicId, correct);
    if (correct) {
      setStreak((s) => s + 1);
      setMastery((m) => Math.min(100, m + 14));
      setCoach(q.explanation);
      // ramp difficulty after 2 in a row
      if (streak + 1 >= 2 && diffIdx < LADDER.length - 1) setDiffIdx((d) => d + 1);
    } else {
      setStreak(0);
      setMastery((m) => Math.max(0, m - 8));
      if (diffIdx > 0) setDiffIdx((d) => d - 1);
      setCoachLoading(true);
      const r = await explainMistake(q, oi);
      setCoach(r.explanation);
      setCoachLoading(false);
    }
  };

  const next = async () => {
    setGenLoading(true);
    setPhase("answering"); setSelected(null); setCoach("");
    // try live generation, fall back to seed bank
    const gen = await generateSimilar(topic.name, q?.subtopic || topic.name, LADDER[diffIdx], topicId);
    const nextQ = gen || pickSeed(LADDER[diffIdx], answeredIds) || pickSeed(LADDER[diffIdx], new Set());
    setQ(nextQ);
    setGenLoading(false);
  };

  const sendChat = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const history: ChatMsg[] = [...chat, { role: "user", text }];
    setChat(history); setInput(""); setChatLoading(true);
    const reply = await askTutor(history.map((m) => ({ role: m.role === "tutor" ? "assistant" : "user", content: m.text })));
    setChat((c) => [...c, { role: "tutor", text: reply }]);
    setChatLoading(false);
  };

  const correct = selected === q?.correct;

  return (
    <div className="min-h-screen bg-secondary/30">
      <TopNav active="guided" />
      <main className="mx-auto max-w-[1200px] px-5 py-8 md:px-8">
        {/* session header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <button onClick={onExit} className="text-sm font-medium text-primary">← All domains</button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{topic.name}</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center" title="Adaptive: 2 correct in a row levels you up; a wrong answer steps it down." aria-label="Adaptive difficulty">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">Difficulty</div>
              <div className="text-sm font-semibold capitalize text-primary">{difficulty}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Streak</div>
              <div className="text-sm font-semibold">{streak} 🔥</div>
            </div>
            <div className="w-40">
              <div className="mb-1 flex items-center justify-between text-xs"><span className="text-muted-foreground">Mastery</span><span className="font-semibold tabular-nums">{mastery}%</span></div>
              <Bar value={mastery} color={mastery >= 80 ? "hsl(var(--success))" : "hsl(var(--primary))"} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          {/* practice card */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            {genLoading || !q ? (
              <div className="grid h-80 place-items-center text-muted-foreground">
                <div className="flex flex-col items-center gap-3"><Wand2 className="h-7 w-7 animate-pulse text-primary" /><span className="text-sm">Generating your next question…</span></div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium capitalize text-muted-foreground">{q.subtopic}</span>
                    {q.tags.includes("ai-generated") && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary"><Sparkles className="h-3 w-3" /> AI-generated</span>}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight">{q.prompt}</h2>
                  <div className="mt-5 space-y-2.5">
                    {q.options.map((opt, oi) => {
                      const isSel = selected === oi;
                      const showCorrect = phase === "feedback" && oi === q.correct;
                      const showWrong = phase === "feedback" && isSel && oi !== q.correct;
                      return (
                        <button
                          key={oi}
                          disabled={phase === "feedback"}
                          onClick={() => submit(oi)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-default ${
                            showCorrect ? "border-success bg-success/[0.06]" :
                            showWrong ? "border-destructive bg-destructive/[0.06]" :
                            isSel ? "border-primary bg-primary/[0.04]" :
                            "border-border hover:border-foreground/30 hover:bg-secondary/50"}`}
                        >
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${showCorrect ? "border-success bg-success text-white" : showWrong ? "border-destructive bg-destructive text-white" : "border-border text-muted-foreground"}`}>{LETTERS[oi]}</span>
                          <span className="text-[15px]">{opt}</span>
                          {showCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
                          {showWrong && <XCircle className="ml-auto h-4 w-4 text-destructive" />}
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {phase === "feedback" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                        <div className={`mt-5 rounded-xl p-4 ${correct ? "bg-success/[0.06]" : "bg-primary/[0.05]"}`}>
                          <div className={`flex items-center gap-1.5 text-sm font-semibold ${correct ? "text-success" : "text-primary"}`}>
                            {correct ? <><CheckCircle2 className="h-4 w-4" /> Correct — nicely done.</> : <><Sparkles className="h-4 w-4" /> Let's break it down.</>}
                          </div>
                          {coachLoading ? (
                            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Your tutor is thinking…</div>
                          ) : <p className="mt-1.5 text-sm leading-relaxed">{coach}</p>}
                        </div>
                        <Button className="mt-4 w-full rounded-full" onClick={next}>Next question <ArrowRight className="ml-1 h-4 w-4" /></Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* tutor chat */}
          <div className="flex h-[560px] flex-col rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary"><Sparkles className="h-4 w-4 text-white" /></div>
              <div><div className="text-sm font-semibold">AI Tutor</div><div className="text-xs text-success">● online · powered by Claude</div></div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 no-scrollbar">
              {chat.map((m, i) => (
                <div key={i} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "ml-auto bg-primary text-white" : "bg-secondary"}`}>{m.text}</div>
              ))}
              {chatLoading && <div className="max-w-[88%] rounded-2xl bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground"><Loader2 className="inline h-3.5 w-3.5 animate-spin" /> thinking…</div>}
              <div ref={chatEnd} />
            </div>
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Ask the tutor anything…" className="h-10 rounded-full bg-secondary" />
                <Button size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={sendChat} disabled={chatLoading}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
