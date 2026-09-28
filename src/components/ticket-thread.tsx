import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChannelPill, PriorityPill, StatusPill } from "@/components/status-pills";
import { replyTicket } from "@/lib/desk/server";
import type { TicketDetail } from "@/lib/desk/types";
import { cn, formatWhen, initials } from "@/lib/utils";

export function TicketThread({
  ticket,
  mode,
}: {
  ticket: TicketDetail;
  mode: "staff" | "client";
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const reply = useMutation({
    mutationFn: () =>
      replyTicket({ data: { ticketId: ticket.id, body, isInternal: mode === "staff" && internal } }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries();
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
        {ticket.messages.map((m) => {
          const system = m.authorType === "system";
          const agent = m.authorType === "agent";
          return (
            <div key={m.id} className={cn("flex gap-3", system && "justify-center")}>
              {system ? (
                <p className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {m.body}
                  <span className="ml-2 opacity-70">{formatWhen(m.createdAt)}</span>
                </p>
              ) : (
                <>
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full text-xs font-medium",
                      agent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    {initials(m.authorName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{m.authorName}</span>
                      <span className="text-xs text-muted-foreground">{formatWhen(m.createdAt)}</span>
                      {m.isInternal ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-pending">
                          <Lock className="size-3" /> Note
                        </span>
                      ) : (
                        <ChannelPill channel={m.channel} />
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed",
                        m.isInternal
                          ? "border-pending/30 bg-pending/8"
                          : "border-border bg-card",
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {ticket.messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <MessageSquare className="size-6" />
            <p className="text-sm">No messages yet.</p>
          </div>
        )}
      </div>
      <form
        className="border-t border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          reply.mutate();
        }}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={mode === "staff" ? "Reply to the client, or leave an internal note…" : "Reply to your IT team…"}
          rows={3}
          className="bg-background"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {mode === "staff" && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Internal note
              </label>
            )}
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Replying on {ticket.channel}
            </span>
          </div>
          <Button type="submit" disabled={reply.isPending || !body.trim()} size="sm">
            {reply.isPending ? "Sending…" : internal ? "Add note" : "Send reply"}
          </Button>
        </div>
        {reply.isError && (
          <p className="mt-2 text-xs text-destructive">Could not send. Try again.</p>
        )}
      </form>
    </div>
  );
}

export function TicketHeaderMeta({ ticket }: { ticket: TicketDetail }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill status={ticket.status} />
      <PriorityPill priority={ticket.priority} />
      <ChannelPill channel={ticket.channel} />
    </div>
  );
}
