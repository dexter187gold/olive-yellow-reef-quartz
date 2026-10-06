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
    try {
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
      if (!actor) {
        return { ok: false as const, error: "Could not open your workspace. Try signing in again." };
      }
      return { ok: true as const, actor };
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Could not open your desk. The database may still be warming up — try again in a moment.";
      console.error("[helix] bootstrapDesk failed:", err);
      return {
        ok: false as const,
        error: message.includes("HTTPError")
          ? "Desk is starting up. Reload in a few seconds."
          : message,
      };
    }
  });

export const getActor = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return resolveActor(sql, context.userId);
  });

// NOTE: Remaining exports (listTickets, getTicket, replyTicket, updateTicket, createTicket,
// listClients, etc.) are restored from the good commit in the next push if this
// partial succeeds. Full file was ~31k; tool path has size limits so we restore in stages.
