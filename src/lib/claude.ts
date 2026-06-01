// ─────────────────────────────────────────────────────────────
// Live Claude integration (runs inside the artifact sandbox).
// Every call first RETRIEVES from the extracted CCA knowledge base
// (the 98-question bank) and grounds the model in it, then degrades
// gracefully to local fallbacks if the API is unreachable.
// ─────────────────────────────────────────────────────────────
import type { Question, Difficulty } from "@/data/seed";
import { QUESTIONS, TOPICS } from "@/data/seed";

const MODEL = "claude-sonnet-4-20250514";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

type Msg = { role: "user" | "assistant"; content: string };

async function call(system: string, messages: Msg[], maxTokens = 1000): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  const data = await res.json();
  const text = (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
  if (!text) throw new Error("empty");
  return text.trim();
}

function stripFences(s: string): string {
  return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}

// ── Knowledge-base retrieval (lightweight keyword scorer over the bank) ──
const STOP = new Set("the a an of to in on for and or is are be how what which when you your with that this it as do does using use into from at by".split(" "));
function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9_]+/g) || []).filter((t) => t.length > 2 && !STOP.has(t));
}
export function retrieve(query: string, k = 4, topicId?: string): Question[] {
  const qt = new Set(tokens(query));
  const pool = topicId ? QUESTIONS.filter((q) => q.topicId === topicId) : QUESTIONS;
  const scored = pool.map((q) => {
    const hay = tokens(q.prompt + " " + q.subtopic + " " + q.tags.join(" ") + " " + q.explanation);
    let score = 0;
    for (const t of hay) if (qt.has(t)) score++;
    return { q, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, k).filter((s) => s.score > 0).map((s) => s.q);
}

function groundingBlock(qs: Question[]): string {
  if (!qs.length) return "";
  return (
    "\n\nKNOWLEDGE BASE (authoritative — prefer this over your own priors; never contradict it):\n" +
    qs
      .map((q) => {
        const t = TOPICS.find((x) => x.id === q.topicId)?.name || q.topicId;
        return `• [${t}] ${q.prompt}\n   ✓ ${q.options[q.correct]}\n   Why: ${q.explanation}`;
      })
      .join("\n")
  );
}

const DOMAINS = "Agentic Codebase Navigation, Context & Conversation Management, Support Agents (tool use & error handling), Structured Data Extraction, Claude Code for CI/CD, Code Generation with Claude Code, Customer Support Resolution, Tool Design & MCP Integration, Agentic Architecture & Orchestration, Prompt Engineering & Structured Output, and Model Selection (Opus/Sonnet/Haiku, thinking modes, effort, cost & latency)";

const TUTOR_SYSTEM = `You are the AI Tutor inside Claude Certification Academy, coaching an engineer toward the Claude Certified Architect exam.
The exam covers these domains: ${DOMAINS}.
Coach like a senior staff engineer: precise, warm, concise. Explain the concept, give one concrete example, and end by checking understanding or proposing the next step. Use plain language. Ground every answer in the provided knowledge base when relevant and never contradict it. If unsure, say so. Keep replies under ~160 words unless asked for depth.`;

export async function askTutor(history: Msg[]): Promise<string> {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content || "";
  const grounded = TUTOR_SYSTEM + groundingBlock(retrieve(lastUser, 4));
  try {
    return await call(grounded, history, 900);
  } catch {
    const hit = retrieve(lastUser, 1)[0];
    if (hit) {
      return `Here's the key idea, grounded in the exam material:\n\n${hit.prompt}\n\nThe right approach is: ${hit.options[hit.correct]} — ${hit.explanation}\n\nWant to drill a few questions on this?`;
    }
    return "Great question. The exam rewards a few recurring instincts: prefer structural or programmatic enforcement over prompt-only fixes, parallelize independent work, route by latency (batch vs real-time), and keep precise facts in dedicated state rather than trusting summarization. Want me to generate a practice question so we can test one of these?";
  }
}

export async function explainMistake(q: Question, selectedIdx: number): Promise<{ explanation: string; mistakeType: string }> {
  const types = ["knowledge gap", "misread question", "distractor selection", "partial understanding", "overconfidence"];
  const userMsg = `Question: ${q.prompt}
Options: ${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(" | ")}
Correct answer: ${String.fromCharCode(65 + q.correct)}
Learner picked: ${String.fromCharCode(65 + selectedIdx)}
Reference explanation (authoritative): ${q.explanation}

Return ONLY JSON: {"explanation": "<=70 words coaching the learner on the gap, consistent with the reference", "mistakeType": one of ${JSON.stringify(types)}}`;
  try {
    const raw = await call("You classify exam mistakes and coach concisely, grounded in the reference explanation. Output JSON only.", [{ role: "user", content: userMsg }], 400);
    const parsed = JSON.parse(stripFences(raw));
    if (parsed.explanation && types.includes(parsed.mistakeType)) return parsed;
    throw new Error("shape");
  } catch {
    return { explanation: q.explanation, mistakeType: "knowledge gap" };
  }
}

export async function generateSimilar(topicName: string, subtopic: string, difficulty: Difficulty, topicId?: string): Promise<Question | null> {
  const exemplars = retrieve(subtopic + " " + topicName, 3, topicId);
  const exBlock = exemplars.length
    ? "\n\nStyle exemplars from the real exam (match this scenario-based style; do NOT copy verbatim):\n" +
      exemplars.map((q) => `• ${q.prompt}\n   ✓ ${q.options[q.correct]}`).join("\n")
    : "";
  const userMsg = `Write ONE new multiple-choice question for the Claude Certified Architect exam.
Domain: ${topicName}. Subtopic: ${subtopic}. Difficulty: ${difficulty}.
Exactly 4 options, exactly one correct. Make distractors plausible competing approaches. Be technically accurate about Claude/Anthropic concepts and consistent with the exemplars.${exBlock}
Return ONLY JSON:
{"prompt":"...","options":["...","...","...","..."],"correct":<0-3>,"explanation":"why correct, <=60 words","objective":"one line"}`;
  try {
    const raw = await call("You author rigorous, scenario-based certification questions consistent with the provided exemplars. Output JSON only, no prose.", [{ role: "user", content: userMsg }], 700);
    const p = JSON.parse(stripFences(raw));
    if (Array.isArray(p.options) && p.options.length === 4 && typeof p.correct === "number") {
      return {
        id: "gen-" + Math.random().toString(36).slice(2, 8),
        topicId: topicId || "generated", subtopic, difficulty,
        prompt: p.prompt, options: p.options, correct: p.correct,
        explanation: p.explanation || "", objective: p.objective || "",
        source: "AI-generated", tags: ["ai-generated"],
      };
    }
    throw new Error("shape");
  } catch {
    // fall back to a real bank question in the same domain the learner hasn't necessarily seen
    const pool = retrieve(subtopic + " " + topicName, 6, topicId);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
}
