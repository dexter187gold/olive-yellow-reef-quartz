import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listClients, saveClient } from "@/lib/desk/server";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLANS } from "@/lib/desk/types";
import { initials } from "@/lib/utils";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/desk/clients")({ component: ClientsPage });

function ClientsPage() {
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight italic">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Companies you keep on the desk.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {clients.data?.map((c) => (
          <Link
            key={c.id}
            to="/desk/clients/$clientId"
            params={{ clientId: String(c.id) }}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-accent/40"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-xs font-medium">
                {initials(c.company)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.company}</p>
                <p className="text-sm text-muted-foreground">
                  {c.contactName} · {c.city}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.plan} · {c.openTickets} open tickets
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <ClientDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function ClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [plan, setPlan] = useState("managed");
  const [notes, setNotes] = useState("");
  const save = useMutation({
    mutationFn: () =>
      saveClient({ data: { company, contactName, email, phone, city, plan, notes } }),
    onSuccess: () => {
      void qc.invalidateQueries();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>New client</DialogTitle>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Primary contact</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Internal notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              Save client
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
