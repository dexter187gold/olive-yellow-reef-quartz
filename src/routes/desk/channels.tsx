import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { connectChannel, listChannels, listClients, simulateInbound } from "@/lib/desk/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChannelPill } from "@/components/status-pills";
import type { ChannelKind } from "@/lib/desk/types";

export const Route = createFileRoute("/desk/channels")({ component: ChannelsPage });

const COPY: Record<string, { title: string; body: string; placeholder: string }> = {
  whatsapp: {
    title: "WhatsApp Business",
    body: "Point Meta's WhatsApp Cloud API webhook at Helix. Incoming chats become tickets in the inbox.",
    placeholder: "+27 60 555 0199",
  },
  facebook: {
    title: "Facebook Messenger",
    body: "Page messages land as tickets. Verify the token in Meta's developer console.",
    placeholder: "Page name",
  },
  email: {
    title: "Support email",
    body: "Forward support@ to Helix, or post to the inbound webhook with the verify token.",
    placeholder: "support@yourdesk.com",
  },
  web: {
    title: "Web widget",
    body: "The browser widget is live on your client portal and this desk.",
    placeholder: "helix.app",
  },
  portal: {
    title: "Client portal",
    body: "Share your desk code. Clients sign in and open tickets without emailing you.",
    placeholder: "Portal",
  },
};

function ChannelsPage() {
  const channels = useQuery({ queryKey: ["channels"], queryFn: () => listChannels() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight italic">Channels</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Helix is built to run in the browser, on WhatsApp, and on Facebook. Windows users can
        install the desk as an app from Chrome — no separate executable required.
      </p>
      <div className="mt-6 grid gap-4">
        {channels.data?.map((ch) => {
          const meta = COPY[ch.kind];
          return (
            <section key={ch.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ChannelPill channel={ch.kind} />
                    <span className="text-xs text-muted-foreground">{ch.status}</span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold">{meta?.title ?? ch.kind}</h2>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{meta?.body}</p>
                </div>
                <p className="text-sm text-muted-foreground">{ch.handle}</p>
              </div>
              {(ch.kind === "whatsapp" || ch.kind === "facebook") && (
                <div className="mt-4 rounded-xl bg-muted p-3 font-mono text-[11px] leading-relaxed break-all text-muted-foreground">
                  POST {origin}/api/webhooks/{ch.kind}?token={ch.verifyToken}
                </div>
              )}
              {(ch.kind === "whatsapp" || ch.kind === "facebook" || ch.kind === "email") && (
                <SimulateForm
                  kind={ch.kind}
                  clients={clients.data ?? []}
                />
              )}
            </section>
          );
        })}
      </div>
      <ConnectForm />
    </div>
  );
}

function SimulateForm({
  kind,
  clients,
}: {
  kind: "whatsapp" | "facebook" | "email";
  clients: { id: number; company: string }[];
}) {
  const [clientId, setClientId] = useState<number | "">(clients[0]?.id ?? "");
  const [text, setText] = useState(
    kind === "whatsapp"
      ? "Hi, the VPN just dropped again for the Sandton office."
      : kind === "facebook"
        ? "Guest posted: Wi-Fi splash page is still last year's offer."
        : "Please reset MFA for finance@ before 09:00.",
  );
  const navigate = useNavigate();
  const qc = useQueryClient();
  const send = useMutation({
    mutationFn: () =>
      simulateInbound({
        data: { kind, clientId: Number(clientId), text },
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries();
      void navigate({ to: "/desk/tickets/$ticketId", params: { ticketId: String(res.id) } });
    },
  });
  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!clientId) return;
        send.mutate();
      }}
    >
      <Label>Simulate an inbound {kind} message</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-56"
          value={clientId}
          onChange={(e) => setClientId(Number(e.target.value))}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company}
            </option>
          ))}
        </select>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="min-h-10 flex-1"
        />
        <Button type="submit" disabled={send.isPending} className="sm:self-end">
          {send.isPending ? "…" : "Receive"}
        </Button>
      </div>
    </form>
  );
}

function ConnectForm() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<ChannelKind>("whatsapp");
  const [handle, setHandle] = useState("");
  const save = useMutation({
    mutationFn: () => connectChannel({ data: { kind, handle } }),
    onSuccess: () => {
      void qc.invalidateQueries();
      setHandle("");
    },
  });
  return (
    <form
      className="mt-6 rounded-2xl border border-dashed border-border p-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 className="text-sm font-semibold">Connect or update a channel</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as ChannelKind)}
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="facebook">Facebook</option>
          <option value="email">Email</option>
          <option value="web">Web</option>
          <option value="portal">Portal</option>
        </select>
        <Input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={COPY[kind]?.placeholder}
          required
        />
        <Button type="submit" disabled={save.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
