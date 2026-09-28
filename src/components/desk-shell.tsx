import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Radio,
  Ticket,
  BarChart3,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import type { Actor } from "@/lib/desk/types";
import { cn } from "@/lib/utils";
import { HelixWordmark } from "@/components/helix-mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CommandSearch } from "@/components/command-search";

const NAV = [
  { to: "/desk", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/desk/inbox", label: "Inbox", icon: Inbox },
  { to: "/desk/tickets", label: "Tickets", icon: Ticket },
  { to: "/desk/clients", label: "Clients", icon: Building2 },
  { to: "/desk/knowledge", label: "Knowledge", icon: BookOpen },
  { to: "/desk/channels", label: "Channels", icon: Radio },
  { to: "/desk/reports", label: "Reports", icon: BarChart3 },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DeskShell({ actor, children }: { actor: Actor; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const company = actor.kind === "staff" ? actor.profile.company : actor.company;

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-14 items-center px-4">
          <Link to="/desk">
            <HelixWordmark />
          </Link>
        </div>
        <div className="px-3 pb-3">
          <p className="truncate px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {company}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t border-border p-3">
          <Link
            to="/portal"
            className="mb-3 flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MessageCircle className="size-4" />
            Client portal
          </Link>
          <div className="px-1">
            <UserButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-sm sm:px-5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <CommandSearch />
          </div>
          {actor.kind === "staff" && actor.profile.deskCode && (
            <span className="hidden font-mono text-[11px] text-muted-foreground lg:inline">
              Desk {actor.profile.deskCode}
            </span>
          )}
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex flex-col p-0">
          <div className="flex h-14 items-center px-4">
            <HelixWordmark />
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t border-border p-3">
            <Link
              to="/portal"
              onClick={() => setOpen(false)}
              className="mb-3 flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground"
            >
              <MessageCircle className="size-4" />
              Client portal
            </Link>
            <UserButton />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
