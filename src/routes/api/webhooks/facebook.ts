import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { ingestChannelWebhook } from "@/lib/desk/webhook.server";

export const Route = createFileRoute("/api/webhooks/facebook")({
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
          select id from channels where verify_token = ${token} and kind = 'facebook'
        `;
        if (!rows[0]) return new Response("forbidden", { status: 403 });
        return new Response(challenge, { status: 200 });
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const payload = (await request.json().catch(() => null)) as {
          entry?: Array<{
            messaging?: Array<{
              sender?: { id?: string };
              message?: { text?: string };
            }>;
          }>;
        } | null;
        const msg = payload?.entry?.[0]?.messaging?.[0];
        const text = msg?.message?.text?.trim();
        if (!text) return new Response(JSON.stringify({ ok: true }), { status: 200 });
        const result = await ingestChannelWebhook({
          kind: "facebook",
          verifyToken: token,
          fromName: "Facebook",
          fromId: msg?.sender?.id || "",
          text,
        });
        return Response.json(result, { status: result.ok ? 200 : 403 });
      },
    },
  },
});
