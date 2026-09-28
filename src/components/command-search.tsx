import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { searchDesk } from "@/lib/desk/server";
import type { ClientRecord, TicketRecord } from "@/lib/desk/types";
import { ticketRef } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/status-pills";

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void searchDesk({ data: { q } }).then((r) => {
        setTickets(r.tickets);
        setClients(r.clients);
      });
    }, 160);
    return () => window.clearTimeout(t);
  }, [q, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:border-ring/50"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search tickets and clients</span>
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="border-b border-border p-3">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a ticket, company, or person"
              className="border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {tickets.length === 0 && clients.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {q ? "Nothing matches yet." : "Type to search this desk."}
              </p>
            )}
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/desk/tickets/$ticketId", params: { ticketId: String(t.id) } });
                }}
              >
                <span className="font-mono text-xs text-muted-foreground">{ticketRef(t.number)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{t.subject}</span>
                <StatusPill status={t.status} />
              </button>
            ))}
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/desk/clients/$clientId", params: { clientId: String(c.id) } });
                }}
              >
                <span className="text-xs text-muted-foreground">Client</span>
                <span className="min-w-0 flex-1 truncate text-sm">{c.company}</span>
                <span className="text-xs text-muted-foreground">{c.contactName}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
