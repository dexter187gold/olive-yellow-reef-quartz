import { Badge } from "@/components/ui/badge";
import type { ChannelKind, TicketPriority, TicketStatus } from "@/lib/desk/types";

const statusTone = {
  open: "open",
  pending: "pending",
  waiting: "waiting",
  resolved: "resolved",
  closed: "closed",
} as const;

const priorityTone = {
  low: "low",
  medium: "medium",
  high: "high",
  urgent: "urgent",
} as const;

const channelTone = {
  web: "web",
  portal: "portal",
  email: "email",
  whatsapp: "whatsapp",
  facebook: "facebook",
} as const;

const channelLabel: Record<ChannelKind, string> = {
  web: "Web",
  portal: "Portal",
  email: "Email",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
};

export function StatusPill({ status }: { status: TicketStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>;
}

export function PriorityPill({ priority }: { priority: TicketPriority }) {
  return <Badge tone={priorityTone[priority]}>{priority}</Badge>;
}

export function ChannelPill({ channel }: { channel: ChannelKind }) {
  return <Badge tone={channelTone[channel]}>{channelLabel[channel]}</Badge>;
}

export { channelLabel };
