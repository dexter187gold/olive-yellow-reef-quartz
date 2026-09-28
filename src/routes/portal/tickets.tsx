import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listTickets } from "@/lib/desk/server";
import { EmptyTickets, TicketRow } from "@/components/ticket-list";

export const Route = createFileRoute("/portal/tickets")({ component: PortalTickets });

function PortalTickets() {
  const tickets = useQuery({
    queryKey: ["portal-tickets"],
    queryFn: () => listTickets({ data: {} }),
  });
  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight italic">Tickets</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything you have opened with your IT team.</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {tickets.data?.length === 0 && <EmptyTickets label="No tickets yet." />}
        {tickets.data?.map((t) => (
          <TicketRow key={t.id} ticket={t} to={`/portal/tickets/${t.id}`} />
        ))}
      </div>
    </div>
  );
}
