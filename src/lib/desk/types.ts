export const STATUSES = ["open", "pending", "waiting", "resolved", "closed"] as const;
export type TicketStatus = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof PRIORITIES)[number];

export const CHANNELS = ["web", "portal", "email", "whatsapp", "facebook"] as const;
export type ChannelKind = (typeof CHANNELS)[number];

export const PLANS = ["managed", "break-fix", "project", "sla-gold"] as const;

export type Profile = {
  userId: string;
  role: "staff" | "client";
  name: string;
  company: string;
  deskCode: string;
};

export type ClientRecord = {
  id: number;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  portalUserId: string | null;
  status: string;
  plan: string;
  notes: string;
  city: string;
  createdAt: string;
  openTickets: number;
};

export type TicketRecord = {
  id: number;
  clientId: number;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: ChannelKind;
  assignee: string;
  requesterName: string;
  requesterEmail: string;
  slaDueAt: string | null;
  firstResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  clientCompany: string;
  lastMessage: string | null;
};

export type TicketMessage = {
  id: number;
  authorType: "agent" | "client" | "system" | "channel";
  authorName: string;
  body: string;
  isInternal: boolean;
  channel: ChannelKind;
  createdAt: string;
};

export type TicketDetail = TicketRecord & {
  messages: TicketMessage[];
  client: ClientRecord;
};

export type KbArticle = {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  published: boolean;
  createdAt: string;
};

export type ChannelRecord = {
  id: number;
  kind: ChannelKind;
  status: "connected" | "pending" | "disconnected";
  handle: string;
  verifyToken: string;
  createdAt: string;
};

export type DeskStats = {
  open: number;
  pending: number;
  overdue: number;
  resolvedToday: number;
  clients: number;
  byChannel: { channel: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
};

export type Actor =
  | { kind: "staff"; profile: Profile }
  | { kind: "client"; profile: Profile; ownerId: string; clientId: number; company: string };
