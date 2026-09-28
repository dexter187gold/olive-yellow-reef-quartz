import { Link } from "@tanstack/react-router";
import { ChannelPill, PriorityPill, StatusPill } from "@/components/status-pills";
import type { TicketRecord } from "@/lib/desk/types";
import { cn, formatRelative, slaLabel, ticketRef } from "@/lib/utils";

export function TicketRow({
  ticket,
  active,
  to,
}: {
  ticket: TicketRecord;
  active?: boolean;
  to: string;
}) {
  const sla = slaLabel(ticket.slaDueAt, ticket.status);
  return (
    <Link
      to={to}
      className={cn(
        "block border-b border-border px-4 py-3 transition-colors hover:bg-accent/50",
        active && "bg-accent",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {ticketRef(ticket.number)}
            </span>
            <span className="truncate text-sm font-medium">{ticket.subject}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {ticket.clientCompany} · {ticket.requesterName}
            {ticket.lastMessage ? ` — ${ticket.lastMessage}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[11px] text-muted-foreground">{formatRelative(ticket.updatedAt)}</span>
          <div className="flex flex-wrap justify-end gap-1">
            <StatusPill status={ticket.status} />
            <PriorityPill priority={ticket.priority} />
          </div>
          {sla && (
            <span
              className={cn(
                "text-[11px] tabular-nums",
                sla.kind === "overdue" ? "text-urgent" : sla.kind === "soon" ? "text-pending" : "text-muted-foreground",
              )}
            >
              {sla.text}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2">
        <ChannelPill channel={ticket.channel} />
      </div>
    </Link>
  );
}

export function EmptyTickets({ label }: { label: string }) {
  return (
    <div className="grid flex-1 place-items-center px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
