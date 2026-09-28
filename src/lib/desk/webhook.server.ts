import { getSql } from "@/lib/db";

export async function ingestChannelWebhook(input: {
  kind: "whatsapp" | "facebook";
  verifyToken: string;
  fromName: string;
  fromId: string;
  text: string;
}) {
  const sql = await getSql();
  const chans = await sql<{ user_id: string; kind: string }>`
    select user_id, kind from channels
    where verify_token = ${input.verifyToken} and kind = ${input.kind} and status = 'connected'
    limit 1
  `;
  const ch = chans[0];
  if (!ch) return { ok: false as const };
  const matched = await sql<{ id: number; contact_name: string; email: string }>`
    select id, contact_name, email from clients
    where user_id = ${ch.user_id}
      and (phone ilike '%' || ${input.fromId} || '%' or contact_name ilike '%' || ${input.fromName} || '%')
    limit 1
  `;
  let client = matched[0];
  if (!client) {
    const created = await sql<{ id: number; contact_name: string; email: string }>`
      insert into clients (user_id, company, contact_name, email, phone, status, plan, notes, city)
      values (
        ${ch.user_id}, ${input.fromName || "Inbound"}, ${input.fromName || "Unknown"},
        '', ${input.fromId}, 'active', 'break-fix', ${`Arrived via ${input.kind}.`}, ''
      )
      returning id, contact_name, email
    `;
    client = created[0];
  }
  if (!client) return { ok: false as const };
  const seq = await sql<{ last_number: number }>`
    insert into ticket_seq (user_id, last_number) values (${ch.user_id}, 1042)
    on conflict (user_id) do update set last_number = ticket_seq.last_number + 1
    returning last_number
  `;
  const number = seq[0]?.last_number ?? 1042;
  const subject = input.text.slice(0, 80) || `${input.kind} message`;
  const createdT = await sql<{ id: number }>`
    insert into tickets (
      user_id, client_id, number, subject, status, priority, channel, assignee,
      requester_name, requester_email, sla_due_at
    ) values (
      ${ch.user_id}, ${client.id}, ${number}, ${subject}, 'open', 'high', ${input.kind}, 'Unassigned',
      ${client.contact_name}, ${client.email}, now() + interval '8 hours'
    ) returning id
  `;
  const ticketId = createdT[0]!.id;
  await sql`
    insert into ticket_messages (user_id, ticket_id, author_type, author_name, body, is_internal, channel)
    values (${ch.user_id}, ${ticketId}, 'channel', ${client.contact_name}, ${input.text}, false, ${input.kind})
  `;
  return { ok: true as const, id: ticketId, number };
}
