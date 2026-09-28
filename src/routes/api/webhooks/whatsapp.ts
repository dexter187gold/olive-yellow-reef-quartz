import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { ingestChannelWebhook } from "@/lib/desk/webhook.server";

export const Route = createFileRoute("/api/webhooks/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode !== "subscribe" || !token || !challenge) {
          return new Response("forbidden", { status: 403 });
        }
        const sql = await getSql();
        const rows = await sql<{ id: number }>`
          select id from channels where verify_token = ${token} and kind = 'whatsapp'
        `;
        if (!rows[0]) return new Response("forbidden", { status: 403 });
        return new Response(challenge, { status: 200 });
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const payload = (await request.json().catch(() => null)) as {
          entry?: Array<{
            changes?: Array<{
              value?: {
                messages?: Array<{ from?: string; text?: { body?: string } }>;
                contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
              };
            }>;
          }>;
        } | null;
        const change = payload?.entry?.[0]?.changes?.[0]?.value;
        const message = change?.messages?.[0];
        const contact = change?.contacts?.[0];
        const text = message?.text?.body?.trim();
        const verifyToken =
          token ||
          request.headers.get("x-hub-signature-token") ||
          "";
        if (!text) return new Response(JSON.stringify({ ok: true }), { status: 200 });
        const result = await ingestChannelWebhook({
          kind: "whatsapp",
          verifyToken,
          fromName: contact?.profile?.name || "WhatsApp",
          fromId: message?.from || contact?.wa_id || "",
          text,
        });
        return Response.json(result, { status: result.ok ? 200 : 403 });
      },
    },
  },
});
