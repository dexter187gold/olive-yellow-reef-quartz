import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listTickets, listClients, createTicket } from "@/lib/desk/server";
import { TicketRow, EmptyTickets } from "@/components/ticket-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CHANNELS, PRIORITIES, STATUSES } from "@/lib/desk/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/desk/tickets")({ component: TicketsPage });

function TicketsPage() {
  const [status, setStatus] = useState<string>("");
  const [channel, setChannel] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const tickets = useQuery({
    queryKey: ["tickets", status, channel, priority, query],
    queryFn: () =>
      listTickets({
        data: {
          status: status || undefined,
          channel: channel || undefined,
          priority: priority || undefined,
          query: query || undefined,
        },
      }),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        <h1 className="mr-auto text-sm font-semibold">Tickets</h1>
        <Filter value={status} onChange={setStatus} options={["", ...STATUSES]} labels={{ "": "Status" }} />
        <Filter value={priority} onChange={setPriority} options={["", ...PRIORITIES]} labels={{ "": "Priority" }} />
        <Filter value={channel} onChange={setChannel} options={["", ...CHANNELS]} labels={{ "": "Channel" }} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter"
          className="h-9 w-36"
        />
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          New
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tickets.data?.length === 0 && <EmptyTickets label="No tickets match these filters." />}
        {tickets.data?.map((t) => (
          <TicketRow key={t.id} ticket={t} to={`/desk/tickets/${t.id}`} />
        ))}
      </div>
      <NewTicketDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Filter({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  labels: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {labels[o] ?? o}
        </option>
      ))}
    </select>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients(), enabled: open });
  const [clientId, setClientId] = useState<number | "">("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () =>
      createTicket({
        data: {
          clientId: Number(clientId),
          subject,
          body,
          priority,
          channel: "web",
        },
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries();
      onOpenChange(false);
      setSubject("");
      setBody("");
      void navigate({ to: "/desk/tickets/$ticketId", params: { ticketId: String(res.id) } });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>New ticket</DialogTitle>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!clientId) return;
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Client</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">Select…</option>
              {clients.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>First message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
