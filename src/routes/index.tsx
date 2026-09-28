import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Globe,
  MessageCircle,
  Radio,
  Shield,
  Ticket,
} from "lucide-react";
import { HelixWordmark } from "@/components/helix-mark";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ChannelPill, PriorityPill, StatusPill } from "@/components/status-pills";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="min-h-dvh bg-background" />;
  }
  if (user) return <Navigate to="/desk" />;
  return <Landing />;
}

function Landing() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <HelixWordmark />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/login">Open your desk</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 sm:pt-20">
        <p className="mb-4 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          For IT firms
        </p>
        <h1 className="font-display max-w-3xl text-4xl leading-[1.1] tracking-tight text-foreground italic sm:text-6xl">
          The desk that holds clients, tickets, and every channel.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Helix is a 2026 CRM and ticketing workspace for managed service teams.
          Staff work the desk. Clients see a calm portal. WhatsApp, Facebook,
          email and the browser land in one inbox.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/login">
              Start the desk
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Client portal sign in</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="ml-2 text-xs text-muted-foreground">Inbox · All channels</span>
          </div>
          <div className="divide-y divide-border">
            <MockRow
              refId="HX-1042"
              subject="VPN drops every 12 minutes for remote partners"
              company="Meridian Legal"
              channel="whatsapp"
              status="open"
              priority="urgent"
              time="18m"
            />
            <MockRow
              refId="HX-1043"
              subject="PACS workstation frozen during afternoon clinic"
              company="Harbor Medical"
              channel="email"
              status="open"
              priority="urgent"
              time="22m"
            />
            <MockRow
              refId="HX-1044"
              subject="Guest Wi-Fi landing page showing last year's promo"
              company="Oak & Pine Hotels"
              channel="facebook"
              status="pending"
              priority="medium"
              time="3h"
            />
            <MockRow
              refId="HX-1045"
              subject="MFA prompt loop for three Grade 11 teachers"
              company="Brightpath Schools"
              channel="portal"
              status="waiting"
              priority="high"
              time="6h"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <Feature
          icon={<Ticket className="size-4" />}
          title="Unified ticketing"
          body="Freshdesk-shaped inbox, redesigned. Queue, conversation, properties, and the client 360 on one screen."
        />
        <Feature
          icon={<Building2 className="size-4" />}
          title="Client CRM"
          body="Companies, plans, notes, and every ticket in one record. Built for MSPs, not generic sales CRM."
        />
        <Feature
          icon={<Radio className="size-4" />}
          title="WhatsApp & Facebook"
          body="Inbound from Meta channels becomes a ticket. Reply from the desk. Webhooks ready for your Business API."
        />
        <Feature
          icon={<Shield className="size-4" />}
          title="Two portals, one login"
          body="Your team works the management desk. Clients get a 2026 portal for tickets, knowledge, and updates."
        />
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Management portal
            </p>
            <h2 className="font-display mt-3 text-3xl tracking-tight italic">
              Run the floor.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              SLA timers, assignment, internal notes, reports, and a client
              record that remembers the network as well as the people.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Client portal
            </p>
            <h2 className="font-display mt-3 text-3xl tracking-tight italic">
              Let them see the work.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Open a ticket, follow the thread, read the knowledge base. No
              chasing email. Share a desk code and they walk in.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <HelixWordmark />
          <p className="flex items-center gap-2">
            <Globe className="size-3.5" />
            Browser, WhatsApp, Facebook — install Helix on Windows from Chrome.
          </p>
          <p className="flex items-center gap-2">
            <MessageCircle className="size-3.5" />
            Desk codes keep client access tight.
          </p>
        </div>
      </footer>
    </div>
  );
}

function MockRow({
  refId,
  subject,
  company,
  channel,
  status,
  priority,
  time,
}: {
  refId: string;
  subject: string;
  company: string;
  channel: "whatsapp" | "facebook" | "email" | "portal";
  status: "open" | "pending" | "waiting";
  priority: "urgent" | "high" | "medium";
  time: string;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <span className="font-mono text-[11px] text-muted-foreground">{refId}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{subject}</p>
        <p className="text-xs text-muted-foreground">{company}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <ChannelPill channel={channel} />
        <StatusPill status={status} />
        <PriorityPill priority={priority} />
        <span className="text-[11px] text-muted-foreground">{time}</span>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 grid size-8 place-items-center rounded-lg bg-muted text-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
