import { StoreProvider, useStore } from "@/lib/store";
import { Landing } from "@/screens/Landing";
import { Login } from "@/screens/Login";
import { Dashboard } from "@/screens/Dashboard";
import { Exam } from "@/screens/Exam";
import { Analytics } from "@/screens/Analytics";
import { Guided } from "@/screens/Guided";
import { Pricing } from "@/screens/Pricing";
import { KnowledgeMap } from "@/screens/KnowledgeMap";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

function Router() {
  const { route } = useStore();
  const reduce = useReducedMotion();

  const screens: Record<string, React.ReactNode> = {
    landing: <Landing />,
    login: <Login />,
    dashboard: <Dashboard />,
    exam: <Exam />,
    analytics: <Analytics />,
    guided: <Guided />,
    pricing: <Pricing />,
    knowledge: <KnowledgeMap />,
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {screens[route] ?? <Landing />}
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
