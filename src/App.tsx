import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Route-level code splitting: each screen (and the heavy recharts/canvas code it
// pulls in) loads on demand, keeping the initial bundle small.
const Landing = lazy(() => import("@/screens/Landing").then((m) => ({ default: m.Landing })));
const Login = lazy(() => import("@/screens/Login").then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import("@/screens/Dashboard").then((m) => ({ default: m.Dashboard })));
const Exam = lazy(() => import("@/screens/Exam").then((m) => ({ default: m.Exam })));
const Analytics = lazy(() => import("@/screens/Analytics").then((m) => ({ default: m.Analytics })));
const Guided = lazy(() => import("@/screens/Guided").then((m) => ({ default: m.Guided })));
const Pricing = lazy(() => import("@/screens/Pricing").then((m) => ({ default: m.Pricing })));
const KnowledgeMap = lazy(() => import("@/screens/KnowledgeMap").then((m) => ({ default: m.KnowledgeMap })));
const Terms = lazy(() => import("@/screens/Legal").then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import("@/screens/Legal").then((m) => ({ default: m.Privacy })));

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function Router() {
  const { route } = useStore();
  const reduce = useReducedMotion();

  const screens: Record<string, ReactNode> = {
    landing: <Landing />,
    login: <Login />,
    dashboard: <Dashboard />,
    exam: <Exam />,
    analytics: <Analytics />,
    guided: <Guided />,
    pricing: <Pricing />,
    knowledge: <KnowledgeMap />,
    terms: <Terms />,
    privacy: <Privacy />,
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          id="main-content"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<RouteFallback />}>{screens[route] ?? <Landing />}</Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
