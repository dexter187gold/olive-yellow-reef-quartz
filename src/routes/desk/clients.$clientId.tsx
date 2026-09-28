import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getClient } from "@/lib/desk/server";
import { TicketRow } from "@/components/ticket-list";
import { initials } from "@/lib/utils";

export const Route = createFileRoute("/desk/clients/$clientId")({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const id = Number(clientId);
  const q = useQuery({
    queryKey: ["client", id],
    queryFn: () => getClient({ data: { id } }),
    enabled: Number.isFinite(id),
  });
  const data = q.data;
  if (q.isPending) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Client not found.</div>;
  const c = data.client;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <Link to="/desk/clients" className="text-xs text-muted-foreground hover:text-foreground">
        Clients
      </Link>
      <div className="mt-3 flex items-start gap-4">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-sm font-medium">
          {initials(c.company)}
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.company}</h1>
          <p className="text-sm text-muted-foreground">
            {c.contactName} · {c.email} · {c.phone}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {c.plan} · {c.city} · {c.status}
          </p>
        </div>
      </div>
      {c.notes && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
          {c.notes}
        </div>
      )}
      <h2 className="mt-8 text-sm font-semibold">Tickets</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {data.tickets.map((t) => (
          <TicketRow key={t.id} ticket={t} to={`/desk/tickets/${t.id}`} />
        ))}
      </div>
    </div>
  );
}
