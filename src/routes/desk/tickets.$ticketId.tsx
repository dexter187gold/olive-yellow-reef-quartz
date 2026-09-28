import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTicket, listTickets, updateTicket } from "@/lib/desk/server";
import { TicketHeaderMeta, TicketThread } from "@/components/ticket-thread";
import { TicketRow } from "@/components/ticket-list";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { STATUSES, PRIORITIES } from "@/lib/desk/types";
import { formatWhen, slaLabel, ticketRef, initials } from "@/lib/utils";
import { useState } from "react";
import { PanelRight } from "lucide-react";

export const Route = createFileRoute("/desk/tickets/$ticketId")({
  component: TicketDetailPage,
});

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  const id = Number(ticketId);
  const qc = useQueryClient();
  const ticket = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getTicket({ data: { id } }),
    enabled: Number.isFinite(id),
  });
  const queue = useQuery({
    queryKey: ["tickets", "queue"],
    queryFn: () => listTickets({ data: {} }),
  });
  const [propsOpen, setPropsOpen] = useState(false);

  const t = ticket.data;
  const mutate = useMutation({
    mutationFn: (patch: { status?: string; priority?: string; assignee?: string }) =>
      updateTicket({ data: { id, ...patch } }),
    onSuccess: () => void qc.invalidateQueries(),
  });

  if (ticket.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading ticket…</div>;
  }
  if (!t) {
    return <div className="p-6 text-sm text-muted-foreground">Ticket not found.</div>;
  }

  const sla = slaLabel(t.slaDueAt, t.status);
  const properties = (
    <div className="space-y-5">
      <div>
        <Label>Status</Label>
        <select
          className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={t.status}
          onChange={(e) => mutate.mutate({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Priority</Label>
        <select
          className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={t.priority}
          onChange={(e) => mutate.mutate({ priority: e.target.value })}
        >
          {PRIORITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Assignee</Label>
        <input
          className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue={t.assignee}
          onBlur={(e) => {
            if (e.target.value !== t.assignee) mutate.mutate({ assignee: e.target.value });
          }}
        />
      </div>
      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">SLA</p>
        <p className={`mt-1 text-sm tabular-nums ${sla?.kind === "overdue" ? "text-urgent" : ""}`}>
          {sla ? sla.text : "Complete"}
        </p>
        {t.slaDueAt && (
          <p className="mt-1 text-xs text-muted-foreground">Due {formatWhen(t.slaDueAt)}</p>
        )}
      </div>
      <Link
        to="/desk/clients/$clientId"
        params={{ clientId: String(t.clientId) }}
        className="block rounded-xl border border-border bg-background p-3 hover:bg-accent"
      >
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Client</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-muted text-xs">
            {initials(t.client.company)}
          </span>
          <div>
            <p className="text-sm font-medium">{t.client.company}</p>
            <p className="text-xs text-muted-foreground">{t.client.contactName}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t.client.plan} · {t.client.city} · {t.client.openTickets} open
        </p>
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-border xl:block">
        {(queue.data ?? []).slice(0, 24).map((item) => (
          <TicketRow
            key={item.id}
            ticket={item}
            active={item.id === t.id}
            to={`/desk/tickets/${item.id}`}
          />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-muted-foreground">{ticketRef(t.number)}</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">{t.subject}</h1>
            <div className="mt-2">
              <TicketHeaderMeta ticket={t} />
            </div>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setPropsOpen(true)}
            aria-label="Properties"
          >
            <PanelRight className="size-4" />
          </Button>
        </div>
        <TicketThread ticket={t} mode="staff" />
      </div>
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border p-4 lg:block">
        {properties}
      </aside>
      <Sheet open={propsOpen} onOpenChange={setPropsOpen}>
        <SheetContent>
          <SheetTitle className="mb-4">Ticket</SheetTitle>
          {properties}
        </SheetContent>
      </Sheet>
    </div>
  );
}
