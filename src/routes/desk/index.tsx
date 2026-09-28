import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AlertTriangle, Building2, CircleDot, CheckCircle2 } from "lucide-react";
import { getDeskStats, listTickets } from "@/lib/desk/server";
import { TicketRow } from "@/components/ticket-list";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/desk/")({ component: DeskHome });

function DeskHome() {
  const stats = useQuery({ queryKey: ["desk-stats"], queryFn: () => getDeskStats() });
  const tickets = useQuery({
    queryKey: ["tickets", "recent"],
    queryFn: () => listTickets({ data: {} }),
  });
  const s = stats.data;
  const recent = (tickets.data ?? []).slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight italic">Today on the desk.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open work, SLA pressure, and the latest threads across every channel.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open"
          value={s?.open}
          icon={<CircleDot className="size-4 text-open" />}
          loading={stats.isPending}
        />
        <StatCard
          label="Waiting"
          value={s?.pending}
          icon={<Building2 className="size-4 text-pending" />}
          loading={stats.isPending}
        />
        <StatCard
          label="SLA overdue"
          value={s?.overdue}
          icon={<AlertTriangle className="size-4 text-urgent" />}
          loading={stats.isPending}
        />
        <StatCard
          label="Resolved today"
          value={s?.resolvedToday}
          icon={<CheckCircle2 className="size-4 text-resolved" />}
          loading={stats.isPending}
        />
      </div>

      <div className="mt-8 flex items-end justify-between">
        <h2 className="text-sm font-semibold">Live queue</h2>
        <Link to="/desk/tickets" className="text-xs text-muted-foreground hover:text-foreground">
          All tickets
        </Link>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {tickets.isPending && <Skeleton className="h-64" />}
        {recent.map((t) => (
          <TicketRow key={t.id} ticket={t} to={`/desk/tickets/${t.id}`} />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value?: number;
  icon: ReactNode;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        {icon}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-12" />
      ) : (
        <p className="mt-3 font-mono text-3xl tabular-nums">{value ?? 0}</p>
      )}
    </div>
  );
}
