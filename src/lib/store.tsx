import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { QUESTIONS, TOPICS, DASHBOARD_SEED } from "@/data/seed";
import type { Question } from "@/data/seed";
import {
  completeAuthRedirect,
  consumeAuthRedirect,
  ensureAuthUser,
  getCurrentSession,
  loadState,
  persistenceEnabled,
  saveExamResult,
  savePractice,
  sendMagicLink,
  signInWithProvider,
  signOutAuth,
} from "@/lib/repo";
import type { AuthProvider, AuthSession } from "@/lib/repo";

export type Route = "landing" | "login" | "dashboard" | "exam" | "analytics" | "guided" | "pricing" | "knowledge";
export type Plan = "free" | "pro" | "mentor";

export interface ExamItem { q: Question; selected: number | null; flagged: boolean }
export interface ExamResult {
  items: ExamItem[];
  score: number;            // %
  correctCount: number;
  total: number;
  byTopic: { topicId: string; name: string; correct: number; total: number; pct: number }[];
  wrong: ExamItem[];
  timeUsedSec: number;
  durationSec: number;
  at?: number;              // completion timestamp
}

export interface PracticeEntry { topicId: string; correct: boolean }
export interface AppUser { id?: string; name: string; email?: string }
export interface AuthActionResult { ok: boolean; message?: string; error?: string }

export interface ProfileMastery { topicId: string; label: string; value: number; tested: boolean }
export interface Profile {
  hasData: boolean;
  demo: boolean;
  questionsAnswered: number;
  examsTaken: number;
  readiness: number;
  predicted: number;
  passProbability: number;
  masteredTopics: number;
  streak: number;
  mastery: ProfileMastery[];
  trend: number[];
  activity: { title: string; meta: string; score: number | null; kind: string }[];
}

interface Store {
  route: Route;
  go: (r: Route) => void;
  user: AppUser | null;
  signIn: (name?: string, email?: string) => void;
  signInWithEmail: (email: string) => Promise<AuthActionResult>;
  signInWithSocial: (provider: AuthProvider) => void;
  signOut: () => void;
  authLoading: boolean;
  persistenceEnabled: boolean;
  plan: Plan;
  setPlan: (p: Plan) => void;
  result: ExamResult | null;
  previousResult: ExamResult | null;
  setResult: (r: ExamResult | null) => void;
  buildExam: (n?: number) => ExamItem[];
  lastActivity: { route: Route; label: string } | null;
  profile: Profile;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  logPractice: (topicId: string, correct: boolean) => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("store");
  return c;
};

function sample<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

function ago(ts?: number): string {
  if (!ts) return "Just now";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Derive the user's profile entirely from their real in-session activity —
// or from the labelled sample dataset when demo mode is on.
function computeProfile(results: ExamResult[], practice: PracticeEntry[], demoMode: boolean): Profile {
  if (demoMode) {
    const d = DASHBOARD_SEED;
    return {
      hasData: true, demo: true,
      questionsAnswered: d.questionsAnswered, examsTaken: 3,
      readiness: d.readiness, predicted: d.predicted, passProbability: d.passProbability,
      masteredTopics: d.masteredTopics, streak: d.streak,
      mastery: d.mastery.map((m) => ({ topicId: m.topicId, label: m.label, value: m.value, tested: true })),
      trend: d.trend, activity: d.activity,
    };
  }

  const acc = new Map<string, { correct: number; total: number }>();
  for (const t of TOPICS) acc.set(t.id, { correct: 0, total: 0 });
  for (const r of results) for (const bt of r.byTopic) {
    const e = acc.get(bt.topicId) || { correct: 0, total: 0 };
    e.correct += bt.correct; e.total += bt.total; acc.set(bt.topicId, e);
  }
  for (const p of practice) {
    const e = acc.get(p.topicId) || { correct: 0, total: 0 };
    e.total++; if (p.correct) e.correct++; acc.set(p.topicId, e);
  }

  const mastery: ProfileMastery[] = TOPICS.map((t) => {
    const e = acc.get(t.id)!;
    return { topicId: t.id, label: t.name, value: e.total ? Math.round((e.correct / e.total) * 100) : 0, tested: e.total > 0 };
  });
  const examScores = results.map((r) => r.score);
  const questionsAnswered = results.reduce((s, r) => s + r.total, 0) + practice.length;
  const tested = mastery.filter((m) => m.tested);
  const avgMastery = tested.length ? Math.round(tested.reduce((s, m) => s + m.value, 0) / tested.length) : 0;
  const latest = examScores.length ? examScores[examScores.length - 1] : 0;
  const readiness = examScores.length
    ? Math.min(99, Math.round(0.5 * avgMastery + 0.5 * latest))
    : (practice.length ? Math.min(99, avgMastery) : 0);
  const activity = results
    .map((r, idx) => ({ title: `Mock Exam ${idx + 1}`, meta: ago(r.at), score: r.score, kind: "exam" }))
    .reverse().slice(0, 6);

  return {
    hasData: results.length > 0 || practice.length > 0,
    demo: false,
    questionsAnswered,
    examsTaken: results.length,
    readiness,
    predicted: latest ? Math.max(0, latest - 2) : 0,
    passProbability: readiness ? Math.min(99, Math.round(readiness * 1.02)) : 0,
    masteredTopics: mastery.filter((m) => m.value >= 75 && m.tested).length,
    streak: results.length ? 1 : 0,
    mastery, trend: examScores, activity,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>("landing");
  const [user, setUser] = useState<AppUser | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [result, setResultState] = useState<ExamResult | null>(null);
  const [previousResult, setPreviousResult] = useState<ExamResult | null>(null);
  const [lastActivity, setLastActivity] = useState<{ route: Route; label: string } | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [practice, setPractice] = useState<PracticeEntry[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(persistenceEnabled);

  const displayNameFor = (session: AuthSession): string => {
    const meta = session.user.user_metadata || {};
    const fullName = meta.full_name || meta.name || meta.user_name || session.user.email?.split("@")[0];
    return typeof fullName === "string" && fullName.trim() ? fullName.trim() : "Learner";
  };

  const applySession = async (session: AuthSession) => {
    const name = displayNameFor(session);
    const id = await ensureAuthUser(session, name);
    if (!id) return;
    setUser({ id, name, email: session.user.email });
    setUserId(id);
    setAccessToken(session.access_token);
    setRoute("dashboard");
    const loaded = await loadState(id, session.access_token);
    setResults(loaded.results);
    setPractice(loaded.practice);
  };

  useEffect(() => {
    let cancelled = false;
    if (!persistenceEnabled) {
      setAuthLoading(false);
      return;
    }
    void (async () => {
      try {
        const redirectSession = consumeAuthRedirect();
        const session = redirectSession ? await completeAuthRedirect(redirectSession) : await getCurrentSession();
        if (!cancelled && session) await applySession(session);
      } catch (e) {
        console.warn("[store] auth restore failed", e);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Archive the current result before a new one replaces it, append it to the
  // session history that powers the profile, and (when configured) persist it.
  const setResult = (r: ExamResult | null) => {
    if (r) {
      setPreviousResult(result);
      const stamped = { ...r, at: r.at ?? Date.now() };
      setResults((prev) => [...prev, stamped]);
      setDemoMode(false); // real data takes over from sample data
      if (userId) void saveExamResult(userId, accessToken, stamped);
    }
    setResultState(r);
  };

  const logPractice = (topicId: string, correct: boolean) => {
    const entry: PracticeEntry = { topicId, correct };
    setPractice((prev) => [...prev, entry]);
    if (userId) void savePractice(userId, accessToken, entry);
  };

  const profile = computeProfile(results, practice, demoMode);

  const ACTIVITY_LABELS: Partial<Record<Route, string>> = {
    exam: "Mock Exam", guided: "Guided Practice", knowledge: "Knowledge Map", analytics: "Analytics Report",
  };

  const go = (r: Route) => {
    if (["dashboard", "exam", "analytics", "guided", "knowledge"].includes(r) && !user) {
      setRoute("login");
    } else {
      setRoute(r);
      if (user && ACTIVITY_LABELS[r]) setLastActivity({ route: r, label: ACTIVITY_LABELS[r]! });
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  // Build a stratified mock: sample across domains proportional to weight,
  // preferring real Foundations questions (the actual certification), then
  // topping up from the wider bank. Shuffled so order isn't predictable.
  const buildExam = (n = 20): ExamItem[] => {
    const picks: Question[] = [];
    const used = new Set<string>();
    const take = (pool: Question[], count: number) => {
      for (const q of sample(pool, count)) {
        if (!used.has(q.id)) { used.add(q.id); picks.push(q); }
      }
    };
    for (const t of TOPICS) {
      const quota = Math.max(1, Math.round((t.weight / 100) * n));
      const inTopic = QUESTIONS.filter((q) => q.topicId === t.id && !used.has(q.id));
      const foundationsFirst = [
        ...inTopic.filter((q) => q.source === "Foundations"),
        ...inTopic.filter((q) => q.source !== "Foundations"),
      ];
      take(foundationsFirst.slice(0, quota * 2), quota);
    }
    take(QUESTIONS.filter((q) => !used.has(q.id)), n - picks.length);
    return sample(picks, n).map((q) => ({ q, selected: null, flagged: false }));
  };

  const value: Store = {
    route, go, user, plan, setPlan, result, previousResult, setResult, buildExam, lastActivity,
    profile, demoMode, setDemoMode, logPractice, persistenceEnabled, authLoading,
    signIn: (name = "Laksh", email) => {
      if (persistenceEnabled && email) {
        void sendMagicLink(email);
        return;
      }
      setUser({ name });
      setRoute("dashboard");
    },
    signInWithEmail: async (email) => {
      if (!persistenceEnabled) {
        const name = email.split("@")[0] || "Laksh";
        setUser({ name, email });
        setRoute("dashboard");
        return { ok: true };
      }
      try {
        await sendMagicLink(email);
        return { ok: true, message: "Check your email for a magic sign-in link." };
      } catch (e) {
        console.warn("[store] magic link failed", e);
        return { ok: false, error: "Could not send a magic link. Check your Supabase Auth settings and try again." };
      }
    },
    signInWithSocial: (provider) => {
      if (!persistenceEnabled) {
        setUser({ name: provider === "google" ? "Google Learner" : "GitHub Learner" });
        setRoute("dashboard");
        return;
      }
      signInWithProvider(provider);
    },
    signOut: () => {
      void signOutAuth(accessToken);
      setUser(null); setUserId(null); setAccessToken(null); setLastActivity(null);
      setResults([]); setPractice([]); setDemoMode(false);
      setResultState(null); setPreviousResult(null);
      setRoute("landing");
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function gradeExam(items: ExamItem[], timeUsedSec: number, durationSec: number): ExamResult {
  const correctCount = items.filter((it) => it.selected === it.q.correct).length;
  const total = items.length;
  const byTopicMap = new Map<string, { correct: number; total: number }>();
  for (const it of items) {
    const e = byTopicMap.get(it.q.topicId) || { correct: 0, total: 0 };
    e.total++;
    if (it.selected === it.q.correct) e.correct++;
    byTopicMap.set(it.q.topicId, e);
  }
  const byTopic = [...byTopicMap.entries()].map(([topicId, v]) => ({
    topicId,
    name: TOPICS.find((t) => t.id === topicId)?.name || topicId,
    correct: v.correct, total: v.total,
    pct: Math.round((v.correct / v.total) * 100),
  })).sort((a, b) => a.pct - b.pct);
  return {
    items, total, correctCount,
    score: Math.round((correctCount / total) * 100),
    byTopic,
    wrong: items.filter((it) => it.selected !== it.q.correct),
    timeUsedSec, durationSec,
  };
}
