import { motion } from "framer-motion";
import { Logo } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { CERTIFICATION, QUESTIONS, TOPICS } from "@/data/seed";
import { useState } from "react";

export function Login() {
  const { signInWithEmail, signInWithSocial, go, persistenceEnabled, authLoading } = useStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitEmail = async () => {
    const v = email.trim();
    if (!v && persistenceEnabled) {
      setError("Enter your email address.");
      return;
    }
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    const result = await signInWithEmail(v || "learner@example.com");
    setSubmitting(false);
    if (result.error) setError(result.error);
    if (result.message) setNotice(result.message);
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* left brand panel */}
      <div className="relative hidden overflow-hidden bg-black lg:block">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <button onClick={() => go("landing")}><Logo dark /></button>
          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-white text-balance">The fastest path to your Claude certification.</h2>
            <p className="mt-4 max-w-sm text-white/60">Mock exams, deep analytics, and a live AI tutor — all in one premium study platform.</p>
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80">
              <div className="text-3xl font-bold">{QUESTIONS.length}</div>
              <div className="text-sm">exam-style questions across all {TOPICS.length} domains, weighted to the real blueprint.</div>
            </div>
          </div>
        </div>
      </div>

      {/* right form */}
      <div className="grid place-items-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-8"><button onClick={() => go("landing")}><Logo /></button></div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-muted-foreground">Sign in to continue your prep for <span className="font-medium text-foreground">{CERTIFICATION.name}</span>.</p>

          <div className="mt-8 space-y-2.5">
            <button onClick={() => signInWithSocial("google")} disabled={authLoading} className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card py-2.5 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60">
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>
              Continue with Google
            </button>
            <button onClick={() => signInWithSocial("github")} disabled={authLoading} className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card py-2.5 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/></svg>
              Continue with GitHub
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Email address" type="email"
              className={`h-11 rounded-xl bg-secondary ${error ? "ring-1 ring-destructive" : ""}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); if (notice) setNotice(""); }}
              onKeyDown={(e) => e.key === "Enter" && submitEmail()}
              aria-invalid={!!error}
              aria-describedby={error ? "email-error" : undefined}
            />
            {error && <p id="email-error" role="alert" className="text-xs font-medium text-destructive">{error}</p>}
            {notice && <p className="text-xs font-medium text-success">{notice}</p>}
            <Button className="h-11 w-full rounded-full text-base" onClick={submitEmail} disabled={submitting || authLoading}>
              {submitting ? "Sending link..." : "Continue with email"}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our <a href="#" className="underline hover:text-foreground">Terms</a> and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>
          {!persistenceEnabled && <p className="mt-2 text-center text-xs text-muted-foreground">Demo mode is active because Supabase credentials are not configured.</p>}
        </motion.div>
      </div>
    </div>
  );
}
