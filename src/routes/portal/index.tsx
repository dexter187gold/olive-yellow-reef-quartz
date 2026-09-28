import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listTickets, listKnowledge } from "@/lib/desk/server";
import { TicketRow } from "@/components/ticket-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/portal/")({ component: PortalHome });

function PortalHome() {
  const tickets = useQuery({
    queryKey: ["portal-tickets"],
    queryFn: () => listTickets({ data: {} }),
  });
  const kb = useQuery({ queryKey: ["kb"], queryFn: () => listKnowledge() });
  const open = (tickets.data ?? []).filter((t) => ["open", "pending", "waiting"].includes(t.status));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight italic">Your IT desk.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open tickets, knowledge, and a short path to ask for help.
          </p>
        </div>
        <Button asChild>
          <Link to="/portal/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </div>
      <h2 className="mt-8 text-sm font-semibold">Open with us</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {open.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing open. Open a ticket if something breaks.
          </p>
        )}
        {open.map((t) => (
          <TicketRow key={t.id} ticket={t} to={`/portal/tickets/${t.id}`} />
        ))}
      </div>
      <h2 className="mt-8 text-sm font-semibold">Help articles</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {kb.data?.slice(0, 4).map((a) => (
          <Link
            key={a.id}
            to="/portal/knowledge"
            className="rounded-2xl border border-border bg-card p-4 hover:bg-accent/40"
          >
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{a.category}</p>
            <p className="mt-1 text-sm font-medium">{a.title}</p>
            <p className="mt-2 text-xs text-muted-foreground">{a.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
