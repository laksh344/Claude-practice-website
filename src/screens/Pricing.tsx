import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/screens/Landing";
import { Reveal } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import type { Plan } from "@/lib/store";
import { createCheckoutSession } from "@/lib/repo";
import { captureError } from "@/lib/observability";
import { Check, Minus, Sparkles, CreditCard, Smartphone, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const TIERS = [
  { id: "free" as Plan, name: "Free", price: "₹0", per: "", note: "For getting started", popular: false,
    feats: ["10 practice questions / day", "1 mock exam total", "Basic score report", "Community support"] },
  { id: "pro" as Plan, name: "Pro", price: "₹799", per: "/mo", note: "For serious candidates", popular: true,
    feats: ["Unlimited mock exams", "Full analytics & readiness score", "Wrong-answer review", "Interactive knowledge map", "Time-management insights"] },
  { id: "mentor" as Plan, name: "AI Mentor", price: "₹1,499", per: "/mo", note: "Pro + a live AI coach", popular: false,
    feats: ["Everything in Pro", "Live AI tutor (Claude)", "Adaptive question generation", "Personalized study plans", "Mistake-type coaching", "Priority support"] },
];

// Annual pricing = ~20% off, expressed per-month billed yearly.
const ANNUAL_PRICE: Record<Plan, string> = { free: "₹0", pro: "₹639", mentor: "₹1,199" };

const MATRIX: { label: string; free: boolean | string; pro: boolean | string; mentor: boolean | string }[] = [
  { label: "Practice questions", free: "10 / day", pro: "Unlimited", mentor: "Unlimited" },
  { label: "Mock exams", free: "1 total", pro: "Unlimited", mentor: "Unlimited" },
  { label: "Full analytics & readiness score", free: false, pro: true, mentor: true },
  { label: "Wrong-answer review", free: false, pro: true, mentor: true },
  { label: "Interactive knowledge map", free: false, pro: true, mentor: true },
  { label: "Time-management insights", free: false, pro: true, mentor: true },
  { label: "Live AI tutor (Claude)", free: false, pro: false, mentor: true },
  { label: "Adaptive question generation", free: false, pro: false, mentor: true },
  { label: "Personalized study plans", free: false, pro: false, mentor: true },
  { label: "Priority support", free: false, pro: false, mentor: true },
];

export function Pricing() {
  const { setPlan, go, plan, persistenceEnabled, reloadEntitlement } = useStore();
  const [checkout, setCheckout] = useState<typeof TIERS[number] | null>(null);
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [stage, setStage] = useState<"form" | "processing" | "done">("form");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [payError, setPayError] = useState("");
  const [justUpgraded, setJustUpgraded] = useState(false);
  const priceFor = (id: Plan) => (billing === "annual" ? ANNUAL_PRICE[id] : TIERS.find((t) => t.id === id)!.price);
  const perFor = (id: Plan) => (id === "free" ? "" : "/mo");

  // Returning from Stripe Checkout: confirm and refresh the server entitlement.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setJustUpgraded(true);
      void reloadEntitlement();
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = async () => {
    if (!checkout) return;
    setPayError("");
    // Real payments: redirect to Stripe Checkout; the webhook grants the plan.
    if (persistenceEnabled && checkout.id !== "free") {
      setStage("processing");
      try {
        const url = await createCheckoutSession(checkout.id as Exclude<Plan, "free">);
        if (url) {
          window.location.href = url;
          return;
        }
        throw new Error("no checkout url returned");
      } catch (e) {
        captureError(e, { area: "checkout", plan: checkout.id });
        setStage("form");
        setPayError("Could not start secure checkout. Please try again.");
      }
      return;
    }
    // Demo fallback when no backend is configured (clearly labelled below).
    setStage("processing");
    setTimeout(() => {
      setPlan(checkout.id);
      setStage("done");
    }, 1200);
  };
  const close = () => { setCheckout(null); setStage("form"); setPayError(""); };

  return (
    <div className="min-h-screen bg-background">
      <TopNav active="pricing" />
      <main className="mx-auto max-w-[1200px] px-5 py-16 md:px-8 md:py-24">
        {justUpgraded && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-success/40 bg-success/[0.06] p-4 text-sm" role="status">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            <span>Payment received — your plan is now <span className="font-semibold capitalize">{plan}</span>. It may take a moment to reflect everywhere.</span>
          </div>
        )}
        <Reveal>
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Launch pricing</div>
            <h1 className="mt-5 text-4xl font-bold tracking-tightest md:text-6xl">Invest in passing the first time.</h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">Start free, upgrade when you're serious. Cancel anytime.</p>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-border bg-card p-1 text-sm" role="tablist" aria-label="Billing period">
              <button
                role="tab" aria-selected={billing === "monthly"}
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${billing === "monthly" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >Monthly</button>
              <button
                role="tab" aria-selected={billing === "annual"}
                onClick={() => setBilling("annual")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${billing === "annual" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >Annual <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">SAVE 20%</span></button>
            </div>
          </div>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-5xl items-stretch gap-5 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.06}>
              <div className={`relative flex h-full flex-col rounded-2xl border p-7 transition-all hover:-translate-y-1 ${t.popular ? "border-primary bg-card shadow-lift" : "border-border bg-card hover:shadow-soft"}`}>
                {t.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-white">Most popular</div>}
                <div className="text-sm font-semibold text-muted-foreground">{t.name}</div>
                <div className="mt-3 flex items-end gap-1"><span className="text-5xl font-bold tracking-tightest">{priceFor(t.id)}</span><span className="mb-1.5 text-muted-foreground">{perFor(t.id)}</span></div>
                {billing === "annual" && t.id !== "free"
                  ? <div className="mt-1 text-xs font-medium text-success">Billed yearly · save 20%</div>
                  : <div className="mt-1 text-sm text-muted-foreground">{t.note}</div>}
                <ul className="mt-6 flex-1 space-y-3">
                  {t.feats.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{f}</li>
                  ))}
                </ul>
                {plan === t.id ? (
                  <Button disabled className="mt-7 w-full rounded-full" variant="outline"><CheckCircle2 className="mr-1 h-4 w-4 text-success" /> Current plan</Button>
                ) : t.id === "free" ? (
                  <Button variant="outline" className="mt-7 w-full rounded-full" onClick={() => { setPlan("free"); go("dashboard"); }}>Get started</Button>
                ) : (
                  <Button variant={t.popular ? "default" : "outline"} className="mt-7 w-full rounded-full" onClick={() => setCheckout({ ...t, price: priceFor(t.id), per: perFor(t.id) })}>Choose {t.name}</Button>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        {/* lifetime banner */}
        <Reveal>
          <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-black p-7 text-white">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold">Limited launch offer</div>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">Lifetime access — ₹4,999 once</h3>
              <p className="mt-1 text-white/60">Everything in AI Mentor, forever. No subscription.</p>
            </div>
            <Button className="rounded-full bg-white px-7 text-black hover:bg-white/90" onClick={() => setCheckout({ ...TIERS[2], name: "Lifetime", price: "₹4,999", per: "", id: "mentor" })}>Claim lifetime deal</Button>
          </div>
        </Reveal>

        {/* comparison matrix */}
        <Reveal>
          <div className="mx-auto mt-16 max-w-5xl">
            <h2 className="text-center text-2xl font-bold tracking-tight">Compare plans</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 text-left font-medium text-muted-foreground">Feature</th>
                    {TIERS.map((t) => (
                      <th key={t.id} className={`py-3 text-center font-semibold ${t.popular ? "text-primary" : ""}`}>{t.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.label} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{row.label}</td>
                      {(["free", "pro", "mentor"] as const).map((col) => {
                        const v = row[col];
                        return (
                          <td key={col} className="py-3 text-center">
                            {typeof v === "string"
                              ? <span className="text-muted-foreground">{v}</span>
                              : v
                                ? <Check className="mx-auto h-4 w-4 text-success" aria-label="Included" />
                                : <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Not included" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> 7-day money-back guarantee · Secure checkout · This is a product demo</p>
      </main>
      <Footer />

      {/* checkout dialog */}
      <Dialog open={!!checkout} onOpenChange={(o) => !o && close()}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          {stage === "done" ? (
            <div className="py-6 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10">
                <CheckCircle2 className="h-9 w-9 text-success" />
              </motion.div>
              <h3 className="mt-4 text-xl font-bold">You're on {checkout?.name}!</h3>
              <p className="mt-1.5 text-muted-foreground">Premium features are unlocked. Your AI tutor is ready.</p>
              <Button className="mt-6 w-full rounded-full" onClick={() => { close(); go("dashboard"); }}>Go to dashboard</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Upgrade to {checkout?.name}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm">
                <span className="font-medium">{checkout?.name} plan</span>
                <span className="font-bold">{checkout?.price}{checkout?.per}</span>
              </div>
              {persistenceEnabled ? (
                <p className="mt-2 flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-success" /> You'll be redirected to Stripe's secure checkout to complete payment.
                </p>
              ) : (
                <>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button onClick={() => setMethod("upi")} className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium ${method === "upi" ? "border-primary bg-primary/[0.04] text-primary" : "border-border"}`}><Smartphone className="h-4 w-4" /> UPI</button>
                    <button onClick={() => setMethod("card")} className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium ${method === "card" ? "border-primary bg-primary/[0.04] text-primary" : "border-border"}`}><CreditCard className="h-4 w-4" /> Card</button>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={method} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-2.5">
                      {method === "upi" ? (
                        <Input placeholder="yourname@upi" className="h-11 rounded-xl bg-secondary" defaultValue="demo@upi" />
                      ) : (
                        <>
                          <Input placeholder="Card number" className="h-11 rounded-xl bg-secondary" defaultValue="4242 4242 4242 4242" />
                          <div className="grid grid-cols-2 gap-2.5">
                            <Input placeholder="MM / YY" className="h-11 rounded-xl bg-secondary" defaultValue="04 / 28" />
                            <Input placeholder="CVC" className="h-11 rounded-xl bg-secondary" defaultValue="123" />
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
              {payError && <p role="alert" className="text-sm font-medium text-destructive">{payError}</p>}
              <Button className="mt-2 h-11 w-full rounded-full text-base" onClick={pay} disabled={stage === "processing"}>
                {stage === "processing"
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                  : persistenceEnabled ? <>Continue to secure checkout</> : <>Pay {checkout?.price}</>}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{persistenceEnabled ? "Secured by Stripe · cancel anytime" : "No real charge — demo checkout."}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
