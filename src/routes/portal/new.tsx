import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createTicket } from "@/lib/desk/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES } from "@/lib/desk/types";

export const Route = createFileRoute("/portal/new")({ component: NewPortalTicket });

function NewPortalTicket() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () =>
      createTicket({ data: { subject, body, priority, channel: "portal" } }),
    onSuccess: (res) => {
      void qc.invalidateQueries();
      void navigate({ to: "/portal/tickets/$ticketId", params: { ticketId: String(res.id) } });
    },
  });

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="font-display text-3xl tracking-tight italic">New ticket</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tell us what broke. We'll pick it up on the desk.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
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
          <Label>What happened</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={6} />
        </div>
        {create.isError && (
          <p className="text-sm text-destructive">Could not open the ticket. Try again.</p>
        )}
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Opening…" : "Submit ticket"}
        </Button>
      </form>
    </div>
  );
}
