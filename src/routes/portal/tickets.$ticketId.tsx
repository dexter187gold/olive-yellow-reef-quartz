import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTicket } from "@/lib/desk/server";
import { TicketHeaderMeta, TicketThread } from "@/components/ticket-thread";
import { ticketRef } from "@/lib/utils";

export const Route = createFileRoute("/portal/tickets/$ticketId")({
  component: PortalTicket,
});

function PortalTicket() {
  const { ticketId } = Route.useParams();
  const id = Number(ticketId);
  const ticket = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getTicket({ data: { id } }),
    enabled: Number.isFinite(id),
  });
  const t = ticket.data;
  if (ticket.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!t) return <p className="text-sm text-muted-foreground">Ticket not found.</p>;
  return (
    <div className="flex min-h-[70dvh] flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <Link to="/portal/tickets" className="text-xs text-muted-foreground hover:text-foreground">
          Tickets
        </Link>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{ticketRef(t.number)}</p>
        <h1 className="mt-1 text-lg font-semibold">{t.subject}</h1>
        <div className="mt-2">
          <TicketHeaderMeta ticket={t} />
        </div>
      </div>
      <TicketThread ticket={t} mode="client" />
    </div>
  );
}
