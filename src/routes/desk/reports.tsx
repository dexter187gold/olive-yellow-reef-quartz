import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDeskStats } from "@/lib/desk/server";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/desk/reports")({ component: ReportsPage });

function ReportsPage() {
  const stats = useQuery({ queryKey: ["desk-stats"], queryFn: () => getDeskStats() });
  const s = stats.data;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight italic">Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">Volume by channel, status, and priority.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="By channel" data={s?.byChannel ?? []} dataKey="channel" />
        <ChartCard title="By status" data={s?.byStatus ?? []} dataKey="status" />
        <ChartCard title="By priority" data={s?.byPriority ?? []} dataKey="priority" />
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Snapshot</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Open</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">{s?.open ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Waiting</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">{s?.pending ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Overdue</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">{s?.overdue ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Clients</dt>
              <dd className="mt-1 font-mono text-2xl tabular-nums">{s?.clients ?? 0}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  dataKey,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey={dataKey} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--color-foreground)",
              }}
            />
            <Bar dataKey="count" fill="var(--color-ring)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
