import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listTickets } from "@/lib/desk/server";
import { TicketRow, EmptyTickets } from "@/components/ticket-list";
import { CHANNELS } from "@/lib/desk/types";
import { cn } from "@/lib/utils";
import { ChannelPill } from "@/components/status-pills";

export const Route = createFileRoute("/desk/inbox")({ component: InboxPage });

function InboxPage() {
  const [channel, setChannel] = useState<string>("");
  const tickets = useQuery({
    queryKey: ["inbox", channel],
    queryFn: () =>
      listTickets({
        data: { channel: channel || undefined, status: undefined },
      }),
  });
  const openish = (tickets.data ?? []).filter((t) =>
    ["open", "pending", "waiting"].includes(t.status),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h1 className="font-display text-2xl tracking-tight italic">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          WhatsApp, Facebook, email, portal and web — one queue.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setChannel("")}
            className={cn(
              "h-8 rounded-full px-3 text-xs",
              channel === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            All
          </button>
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cn(
                "h-8 rounded-full px-2 text-xs",
                channel === c ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              <ChannelPill channel={c} />
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {openish.length === 0 && <EmptyTickets label="Inbox is clear." />}
        {openish.map((t) => (
          <TicketRow key={t.id} ticket={t} to={`/desk/tickets/${t.id}`} />
        ))}
      </div>
    </div>
  );
}
