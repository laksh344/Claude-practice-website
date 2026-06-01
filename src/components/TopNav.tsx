import { Logo } from "@/components/primitives";
import { useStore } from "@/lib/store";
import type { Route } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function TopNav({ active }: { active?: Route }) {
  const { go, user, signOut } = useStore();
  const [open, setOpen] = useState(false);
  const links: { label: string; r: Route }[] = [
    { label: "Dashboard", r: "dashboard" },
    { label: "Mock Exam", r: "exam" },
    { label: "AI Tutor", r: "guided" },
    { label: "Knowledge Map", r: "knowledge" },
    { label: "Pricing", r: "pricing" },
  ];
  const nav = (r: Route) => { setOpen(false); go(r); };
  const navCls = (r: Route) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
      active === r ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 glass">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <button onClick={() => nav(user ? "dashboard" : "landing")} className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <Logo />
        </button>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <button key={l.r} onClick={() => go(l.r)} className={navCls(l.r)}>
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button size="sm" className="hidden rounded-full px-4 sm:inline-flex" onClick={() => go("exam")}>Take Mock Exam</Button>
              <button onClick={signOut} className="hidden px-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:block">Sign out</button>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-xs font-semibold text-white">
                {user.name[0]}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => go("login")} className="hidden px-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Log in</button>
              <Button size="sm" className="rounded-full px-4" onClick={() => go("login")}>Get started</Button>
            </>
          )}
          {/* mobile menu toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* mobile nav panel */}
      {open && (
        <div className="border-t border-border bg-background/95 px-3 py-2 lg:hidden">
          <nav className="flex flex-col gap-0.5">
            {links.map((l) => (
              <button
                key={l.r}
                onClick={() => nav(l.r)}
                className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active === l.r ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {l.label}
              </button>
            ))}
            {user ? (
              <button onClick={() => { setOpen(false); signOut(); }} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-secondary">Sign out</button>
            ) : (
              <button onClick={() => nav("login")} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-secondary">Log in</button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
