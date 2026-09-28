import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  Actor,
  ChannelKind,
  ChannelRecord,
  ClientRecord,
  DeskStats,
  KbArticle,
  Profile,
  TicketDetail,
  TicketMessage,
  TicketRecord,
} from "./types";

type Sql = Awaited<ReturnType<typeof getSql>>;

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return value;
  }
  return new Date().toISOString();
}

function asIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return asIso(value);
}

function deskCodeFrom(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i += 1) h = (h * 33 + userId.charCodeAt(i)) >>> 0;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + i * 17;
  }
  return code;
}

function slaHours(priority: string) {
  if (priority === "urgent") return 2;
  if (priority === "high") return 8;
  if (priority === "medium") return 24;
  return 72;
}

async function loadProfile(sql: Sql, userId: string): Promise<Profile | null> {
  const rows = await sql<{
    user_id: string;
    role: "staff" | "client";
    name: string;
    company: string;
    desk_code: string;
  }>`select user_id, role, name, company, desk_code from profiles where user_id = ${userId}`;
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    role: row.role,
    name: row.name,
    company: row.company,
    deskCode: row.desk_code,
  };
}

async function resolveActor(sql: Sql, userId: string): Promise<Actor | null> {
  const profile = await loadProfile(sql, userId);
  if (!profile) return null;
  if (profile.role === "staff") return { kind: "staff", profile };
  const clients = await sql<{ id: number; user_id: string; company: string }>`
    select id, user_id, company from clients where portal_user_id = ${userId} limit 1
  `;
  const c = clients[0];
  if (!c) return { kind: "client", profile, ownerId: userId, clientId: 0, company: profile.company };
  return {
    kind: "client",
    profile,
    ownerId: c.user_id,
    clientId: c.id,
    company: c.company,
  };
}

function mapClient(row: {
  id: number;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  portal_user_id: string | null;
  status: string;
  plan: string;
  notes: string;
  city: string;
  created_at: unknown;
  open_tickets?: number | string | null;
}): ClientRecord {
  return {
    id: row.id,
    company: row.company,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    portalUserId: row.portal_user_id,
    status: row.status,
    plan: row.plan,
    notes: row.notes,
    city: row.city,
    createdAt: asIso(row.created_at),
    openTickets: Number(row.open_tickets ?? 0),
  };
}

function mapTicket(row: {
  id: number;
  client_id: number;
  number: number;
  subject: string;
  status: TicketRecord["status"];
  priority: TicketRecord["priority"];
  channel: ChannelKind;
  assignee: string;
  requester_name: string;
  requester_email: string;
  sla_due_at: unknown;
  first_response_at: unknown;
  created_at: unknown;
  updated_at: unknown;
  client_company?: string;
  last_message?: string | null;
}): TicketRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    number: row.number,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    channel: row.channel,
    assignee: row.assignee,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    slaDueAt: asIsoOrNull(row.sla_due_at),
    firstResponseAt: asIsoOrNull(row.first_response_at),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
    clientCompany: row.client_company ?? "",
    lastMessage: row.last_message ?? null,
  };
}

async function nextTicketNumber(sql: Sql, userId: string) {
  const rows = await sql<{ last_number: number }>`
    insert into ticket_seq (user_id, last_number) values (${userId}, 1042)
    on conflict (user_id) do update set last_number = ticket_seq.last_number + 1
    returning last_number
  `;
  return rows[0]?.last_number ?? 1042;
}

async function seedWorkspace(sql: Sql, userId: string, name: string, company: string) {
  const { seedDesk } = await import("./seed");
  await seedDesk(sql, {
    userId,
    name,
    company,
    deskCode: deskCodeFrom(userId),
    nextTicketNumber,
    slaHours,
  });
}

const bootstrapInput = z.object({
  displayName: z.string().optional(),
  email: z.string().optional(),
  intent: z.enum(["staff", "client"]).optional(),
  joinCode: z.string().optional(),
  company: z.string().optional(),
});

export const bootstrapDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => bootstrapInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    let profile = await loadProfile(sql, context.userId);
    if (!profile) {
      const actorName = (data.displayName || "You").trim() || "You";
      if (data.intent === "client" && data.joinCode) {
        const code = data.joinCode.trim().toUpperCase();
        const owners = await sql<{ user_id: string; company: string }>`
          select user_id, company from profiles where desk_code = ${code} and role = 'staff' limit 1
        `;
        const owner = owners[0];
        if (!owner) {
          return { ok: false as const, error: "That desk code was not found." };
        }
        const companyName = (data.company || actorName).trim();
        await sql`
          insert into profiles (user_id, role, name, company, desk_code)
          values (${context.userId}, 'client', ${actorName}, ${companyName}, '')
        `;
        await sql`
          insert into clients (user_id, company, contact_name, email, phone, portal_user_id, status, plan, notes, city)
          values (${owner.user_id}, ${companyName}, ${actorName}, ${data.email ?? ""}, '', ${context.userId}, 'active', 'managed', 'Joined via client portal.', '')
        `;
      } else {
        const companyName = (data.company || `${actorName.split(" ")[0]} IT`).trim();
        await seedWorkspace(sql, context.userId, actorName, companyName);
      }
      profile = await loadProfile(sql, context.userId);
    } else if (profile.role === "staff") {
      const n = await sql<{ n: number }>`select count(*)::int as n from clients where user_id = ${context.userId}`;
      if ((n[0]?.n ?? 0) === 0) {
        await seedWorkspace(sql, context.userId, profile.name, profile.company);
      }
    }
    const actor = await resolveActor(sql, context.userId);
    return { ok: true as const, actor };
  });

export const getActor = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return resolveActor(sql, context.userId);
  });

const ticketListInput = z.object({
  status: z.string().optional(),
  channel: z.string().optional(),
  priority: z.string().optional(),
  clientId: z.number().optional(),
  query: z.string().optional(),
  previewClientId: z.number().optional(),
});

async function ticketsForOwner(sql: Sql, ownerId: string, filters: z.infer<typeof ticketListInput>) {
  const rows = await sql.query<{
    id: number;
    client_id: number;
    number: number;
    subject: string;
    status: TicketRecord["status"];
    priority: TicketRecord["priority"];
    channel: ChannelKind;
    assignee: string;
    requester_name: string;
    requester_email: string;
    sla_due_at: unknown;
    first_response_at: unknown;
    created_at: unknown;
    updated_at: unknown;
    client_company: string;
    last_message: string | null;
  }>(
    `select t.id, t.client_id, t.number, t.subject, t.status, t.priority, t.channel, t.assignee,
            t.requester_name, t.requester_email, t.sla_due_at, t.first_response_at, t.created_at, t.updated_at,
            c.company as client_company,
            (select m.body from ticket_messages m where m.ticket_id = t.id order by m.created_at desc limit 1) as last_message
     from tickets t
     join clients c on c.id = t.client_id
     where t.user_id = $1
       and ($2::text is null or t.status = $2)
       and ($3::text is null or t.channel = $3)
       and ($4::text is null or t.priority = $4)
       and ($5::int is null or t.client_id = $5)
       and ($6::text is null or t.subject ilike '%' || $6 || '%' or c.company ilike '%' || $6 || '%' or t.requester_name ilike '%' || $6 || '%')
     order by t.updated_at desc
     limit 200`,
    [
      ownerId,
      filters.status || null,
      filters.channel || null,
      filters.priority || null,
      filters.clientId ?? null,
      filters.query?.trim() || null,
    ],
  );
  return rows.map(mapTicket);
}

export const listTickets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => ticketListInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor) return [] as TicketRecord[];
    if (actor.kind === "staff") return ticketsForOwner(sql, context.userId, data);
    if (!actor.clientId) return [];
    return ticketsForOwner(sql, actor.ownerId, { ...data, clientId: actor.clientId });
  });

export const getTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.number(), previewClientId: z.number().optional() }).parse(d))
  .handler(async ({ context, data }): Promise<TicketDetail | null> => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor) return null;
    const ownerId = actor.kind === "staff" ? context.userId : actor.ownerId;
    const rows = await sql`
      select t.id, t.client_id, t.number, t.subject, t.status, t.priority, t.channel, t.assignee,
             t.requester_name, t.requester_email, t.sla_due_at, t.first_response_at, t.created_at, t.updated_at,
             c.company as client_company
      from tickets t
      join clients c on c.id = t.client_id
      where t.id = ${data.id} and t.user_id = ${ownerId}
    `;
    const row = rows[0] as
      | {
          id: number;
          client_id: number;
          number: number;
          subject: string;
          status: TicketRecord["status"];
          priority: TicketRecord["priority"];
          channel: ChannelKind;
          assignee: string;
          requester_name: string;
          requester_email: string;
          sla_due_at: unknown;
          first_response_at: unknown;
          created_at: unknown;
          updated_at: unknown;
          client_company: string;
        }
      | undefined;
    if (!row) return null;
    if (actor.kind === "client" && row.client_id !== actor.clientId) return null;

    const clientRows = await sql`
      select c.*, (
        select count(*)::int from tickets t2
        where t2.client_id = c.id and t2.status in ('open','pending','waiting')
      ) as open_tickets
      from clients c where c.id = ${row.client_id} and c.user_id = ${ownerId}
    `;
    const clientRow = clientRows[0] as Parameters<typeof mapClient>[0] | undefined;
    if (!clientRow) return null;

    const msgs = await sql<{
      id: number;
      author_type: TicketMessage["authorType"];
      author_name: string;
      body: string;
      is_internal: boolean;
      channel: ChannelKind;
      created_at: unknown;
    }>`
      select id, author_type, author_name, body, is_internal, channel, created_at
      from ticket_messages
      where ticket_id = ${data.id} and user_id = ${ownerId}
      order by created_at asc
    `;
    const messages = msgs
      .filter((m) => actor.kind === "staff" || !m.is_internal)
      .map((m) => ({
        id: m.id,
        authorType: m.author_type,
        authorName: m.author_name,
        body: m.body,
        isInternal: m.is_internal,
        channel: m.channel,
        createdAt: asIso(m.created_at),
      }));

    return {
      ...mapTicket({ ...row, last_message: messages.at(-1)?.body ?? null }),
      messages,
      client: mapClient(clientRow),
    };
  });

const replyInput = z.object({
  ticketId: z.number(),
  body: z.string().min(1),
  isInternal: z.boolean().optional(),
});

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => replyInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor) throw new Error("No workspace");
    const body = data.body.trim();
    if (!body) throw new Error("Message is empty");
    const ownerId = actor.kind === "staff" ? context.userId : actor.ownerId;
    const tickets = await sql<{ id: number; client_id: number; channel: ChannelKind; first_response_at: unknown }>`
      select id, client_id, channel, first_response_at from tickets where id = ${data.ticketId} and user_id = ${ownerId}
    `;
    const t = tickets[0];
    if (!t) throw new Error("Ticket not found");
    if (actor.kind === "client" && t.client_id !== actor.clientId) throw new Error("Ticket not found");
    const isInternal = actor.kind === "staff" && Boolean(data.isInternal);
    const authorType = actor.kind === "staff" ? "agent" : "client";
    const authorName = actor.profile.name;
    await sql`
      insert into ticket_messages (user_id, ticket_id, author_type, author_name, body, is_internal, channel)
      values (${ownerId}, ${data.ticketId}, ${authorType}, ${authorName}, ${body}, ${isInternal}, ${t.channel})
    `;
    if (actor.kind === "staff" && !t.first_response_at && !isInternal) {
      await sql`update tickets set first_response_at = now(), updated_at = now() where id = ${data.ticketId} and user_id = ${ownerId}`;
    } else {
      await sql`update tickets set updated_at = now() where id = ${data.ticketId} and user_id = ${ownerId}`;
    }
    if (actor.kind === "client") {
      await sql`update tickets set status = 'open', updated_at = now() where id = ${data.ticketId} and user_id = ${ownerId} and status in ('pending','resolved')`;
    }
    return { ok: true };
  });

const updateTicketInput = z.object({
  id: z.number(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
});

export const updateTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => updateTicketInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") throw new Error("Forbidden");
    const current = await sql<{ id: number; status: string }>`
      select id, status from tickets where id = ${data.id} and user_id = ${context.userId}
    `;
    if (!current[0]) throw new Error("Ticket not found");
    if (data.status) {
      await sql`update tickets set status = ${data.status}, updated_at = now() where id = ${data.id} and user_id = ${context.userId}`;
      if (data.status !== current[0].status) {
        await sql`
          insert into ticket_messages (user_id, ticket_id, author_type, author_name, body, is_internal, channel)
          values (${context.userId}, ${data.id}, 'system', 'Helix', ${`Status set to ${data.status}.`}, false, 'portal')
        `;
      }
    }
    if (data.priority) {
      await sql`update tickets set priority = ${data.priority}, updated_at = now() where id = ${data.id} and user_id = ${context.userId}`;
    }
    if (data.assignee != null) {
      await sql`update tickets set assignee = ${data.assignee}, updated_at = now() where id = ${data.id} and user_id = ${context.userId}`;
    }
    return { ok: true };
  });

const createTicketInput = z.object({
  clientId: z.number().optional(),
  subject: z.string().min(3),
  body: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  channel: z.enum(["web", "portal", "email", "whatsapp", "facebook"]).optional(),
});

export const createTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => createTicketInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor) throw new Error("No workspace");
    const ownerId = actor.kind === "staff" ? context.userId : actor.ownerId;
    let clientId = actor.kind === "staff" ? data.clientId : actor.clientId;
    if (!clientId) {
      const first = await sql<{ id: number }>`
        select id from clients where user_id = ${ownerId} order by id asc limit 1
      `;
      clientId = first[0]?.id;
    }
    if (!clientId) throw new Error("Pick a client");
    const clients = await sql<{
      id: number;
      contact_name: string;
      email: string;
      company: string;
    }>`select id, contact_name, email, company from clients where id = ${clientId} and user_id = ${ownerId}`;
    const client = clients[0];
    if (!client) throw new Error("Client not found");
    const number = await nextTicketNumber(sql, ownerId);
    const priority = data.priority ?? "medium";
    const channel = data.channel ?? "portal";
    const hours = slaHours(priority);
    const created = await sql<{ id: number }>`
      insert into tickets (
        user_id, client_id, number, subject, status, priority, channel, assignee,
        requester_name, requester_email, sla_due_at
      ) values (
        ${ownerId}, ${clientId}, ${number}, ${data.subject.trim()}, 'open', ${priority}, ${channel},
        ${actor.kind === "staff" ? actor.profile.name : "Unassigned"},
        ${actor.kind === "client" ? actor.profile.name : client.contact_name}, ${client.email},
        now() + ${`${hours} hours`}::interval
      ) returning id
    `;
    const id = created[0]!.id;
    await sql`
      insert into ticket_messages (user_id, ticket_id, author_type, author_name, body, is_internal, channel)
      values (${ownerId}, ${id}, ${actor.kind === "staff" ? "agent" : "client"}, ${actor.profile.name}, ${data.body.trim()}, false, ${channel})
    `;
    return { id, number };
  });

export const listClients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") return [] as ClientRecord[];
    const rows = await sql`
      select c.*, (
        select count(*)::int from tickets t
        where t.client_id = c.id and t.status in ('open','pending','waiting')
      ) as open_tickets
      from clients c
      where c.user_id = ${context.userId}
      order by c.company asc
    `;
    return (rows as Parameters<typeof mapClient>[0][]).map(mapClient);
  });

export const getClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") return null;
    const rows = await sql`
      select c.*, (
        select count(*)::int from tickets t
        where t.client_id = c.id and t.status in ('open','pending','waiting')
      ) as open_tickets
      from clients c
      where c.id = ${data.id} and c.user_id = ${context.userId}
    `;
    const row = rows[0] as Parameters<typeof mapClient>[0] | undefined;
    if (!row) return null;
    const tickets = await ticketsForOwner(sql, context.userId, { clientId: data.id });
    return { client: mapClient(row), tickets };
  });

const upsertClientInput = z.object({
  id: z.number().optional(),
  company: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  plan: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

export const saveClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => upsertClientInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") throw new Error("Forbidden");
    if (data.id) {
      await sql`
        update clients set
          company = ${data.company.trim()},
          contact_name = ${data.contactName.trim()},
          email = ${data.email ?? ""},
          phone = ${data.phone ?? ""},
          plan = ${data.plan ?? "managed"},
          city = ${data.city ?? ""},
          notes = ${data.notes ?? ""},
          status = ${data.status ?? "active"}
        where id = ${data.id} and user_id = ${context.userId}
      `;
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into clients (user_id, company, contact_name, email, phone, plan, city, notes, status)
      values (
        ${context.userId}, ${data.company.trim()}, ${data.contactName.trim()},
        ${data.email ?? ""}, ${data.phone ?? ""}, ${data.plan ?? "managed"},
        ${data.city ?? ""}, ${data.notes ?? ""}, ${data.status ?? "active"}
      ) returning id
    `;
    return { id: rows[0]!.id };
  });

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor) return [] as KbArticle[];
    const ownerId = actor.kind === "staff" ? context.userId : actor.ownerId;
    const publishedOnly = actor.kind !== "staff";
    const rows = await sql<{
      id: number;
      title: string;
      category: string;
      excerpt: string;
      body: string;
      published: boolean;
      created_at: unknown;
    }>`
      select id, title, category, excerpt, body, published, created_at
      from kb_articles
      where user_id = ${ownerId}
        and (${publishedOnly} = false or published = true)
      order by category, title
    `;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      excerpt: r.excerpt,
      body: r.body,
      published: r.published,
      createdAt: asIso(r.created_at),
    }));
  });

const saveKbInput = z.object({
  id: z.number().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  excerpt: z.string().optional(),
  body: z.string().min(1),
  published: z.boolean().optional(),
});

export const saveKnowledge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => saveKbInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") throw new Error("Forbidden");
    if (data.id) {
      await sql`
        update kb_articles set title = ${data.title}, category = ${data.category},
          excerpt = ${data.excerpt ?? ""}, body = ${data.body}, published = ${data.published ?? true}
        where id = ${data.id} and user_id = ${context.userId}
      `;
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into kb_articles (user_id, title, category, excerpt, body, published)
      values (${context.userId}, ${data.title}, ${data.category}, ${data.excerpt ?? ""}, ${data.body}, ${data.published ?? true})
      returning id
    `;
    return { id: rows[0]!.id };
  });

export const listChannels = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") return [] as ChannelRecord[];
    const rows = await sql<{
      id: number;
      kind: ChannelKind;
      status: ChannelRecord["status"];
      handle: string;
      verify_token: string;
      created_at: unknown;
    }>`select id, kind, status, handle, verify_token, created_at from channels where user_id = ${context.userId} order by kind`;
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      handle: r.handle,
      verifyToken: r.verify_token,
      createdAt: asIso(r.created_at),
    }));
  });

const connectChannelInput = z.object({
  kind: z.enum(["web", "portal", "email", "whatsapp", "facebook"]),
  handle: z.string().min(1),
});

export const connectChannel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => connectChannelInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") throw new Error("Forbidden");
    const token = `${data.kind}-${context.userId.slice(0, 8)}-${Math.random().toString(36).slice(2, 12)}`;
    await sql`
      insert into channels (user_id, kind, status, handle, verify_token)
      values (${context.userId}, ${data.kind}, 'connected', ${data.handle.trim()}, ${token})
      on conflict (user_id, kind) do update set status = 'connected', handle = excluded.handle
    `;
    const rows = await sql<{ verify_token: string }>`
      select verify_token from channels where user_id = ${context.userId} and kind = ${data.kind}
    `;
    return { verifyToken: rows[0]?.verify_token ?? token };
  });

const simulateInput = z.object({
  kind: z.enum(["whatsapp", "facebook", "email"]),
  clientId: z.number(),
  text: z.string().min(1),
});

export const simulateInbound = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => simulateInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") throw new Error("Forbidden");
    const clients = await sql<{ id: number; contact_name: string; email: string; company: string }>`
      select id, contact_name, email, company from clients where id = ${data.clientId} and user_id = ${context.userId}
    `;
    const client = clients[0];
    if (!client) throw new Error("Client not found");
    const subject =
      data.kind === "facebook" ? `Facebook message from ${client.company}` : data.text.slice(0, 72);
    const number = await nextTicketNumber(sql, context.userId);
    const created = await sql<{ id: number }>`
      insert into tickets (
        user_id, client_id, number, subject, status, priority, channel, assignee,
        requester_name, requester_email, sla_due_at
      ) values (
        ${context.userId}, ${client.id}, ${number}, ${subject}, 'open', 'high', ${data.kind}, 'Unassigned',
        ${client.contact_name}, ${client.email}, now() + interval '8 hours'
      ) returning id
    `;
    const id = created[0]!.id;
    await sql`
      insert into ticket_messages (user_id, ticket_id, author_type, author_name, body, is_internal, channel)
      values (${context.userId}, ${id}, 'channel', ${client.contact_name}, ${data.text.trim()}, false, ${data.kind})
    `;
    return { id, number };
  });

export const getDeskStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DeskStats> => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    const empty: DeskStats = {
      open: 0,
      pending: 0,
      overdue: 0,
      resolvedToday: 0,
      clients: 0,
      byChannel: [],
      byStatus: [],
      byPriority: [],
    };
    if (!actor || actor.kind !== "staff") return empty;
    const uid = context.userId;
    const open = await sql<{ n: number }>`select count(*)::int as n from tickets where user_id = ${uid} and status = 'open'`;
    const pending = await sql<{ n: number }>`select count(*)::int as n from tickets where user_id = ${uid} and status in ('pending','waiting')`;
    const overdue = await sql<{ n: number }>`
      select count(*)::int as n from tickets
      where user_id = ${uid} and status in ('open','pending','waiting') and sla_due_at < now()
    `;
    const resolvedToday = await sql<{ n: number }>`
      select count(*)::int as n from tickets
      where user_id = ${uid} and status in ('resolved','closed') and updated_at::date = now()::date
    `;
    const clients = await sql<{ n: number }>`select count(*)::int as n from clients where user_id = ${uid}`;
    const byChannel = await sql<{ channel: string; count: number }>`
      select channel, count(*)::int as count from tickets where user_id = ${uid} group by channel order by count desc
    `;
    const byStatus = await sql<{ status: string; count: number }>`
      select status, count(*)::int as count from tickets where user_id = ${uid} group by status
    `;
    const byPriority = await sql<{ priority: string; count: number }>`
      select priority, count(*)::int as count from tickets where user_id = ${uid} group by priority
    `;
    return {
      open: open[0]?.n ?? 0,
      pending: pending[0]?.n ?? 0,
      overdue: overdue[0]?.n ?? 0,
      resolvedToday: resolvedToday[0]?.n ?? 0,
      clients: clients[0]?.n ?? 0,
      byChannel,
      byStatus,
      byPriority,
    };
  });

export const searchDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ q: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await resolveActor(sql, context.userId);
    if (!actor || actor.kind !== "staff") return { tickets: [] as TicketRecord[], clients: [] as ClientRecord[] };
    const q = data.q.trim();
    if (!q) return { tickets: [], clients: [] };
    const tickets = await ticketsForOwner(sql, context.userId, { query: q });
    const clients = await sql`
      select c.*, (
        select count(*)::int from tickets t
        where t.client_id = c.id and t.status in ('open','pending','waiting')
      ) as open_tickets
      from clients c
      where c.user_id = ${context.userId}
        and (c.company ilike '%' || ${q} || '%' or c.contact_name ilike '%' || ${q} || '%' or c.email ilike '%' || ${q} || '%')
      order by c.company
      limit 12
    `;
    return {
      tickets: tickets.slice(0, 12),
      clients: (clients as Parameters<typeof mapClient>[0][]).map(mapClient),
    };
  });

