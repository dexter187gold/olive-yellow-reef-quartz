import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "H";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function slaLabel(iso: string | null, status: string) {
  if (!iso || status === "resolved" || status === "closed") return null;
  const due = new Date(iso).getTime();
  const mins = Math.round((due - Date.now()) / 60000);
  if (mins < 0) return { kind: "overdue" as const, text: `${Math.abs(mins) < 60 ? `${Math.abs(mins)}m` : `${Math.round(Math.abs(mins) / 60)}h`} overdue` };
  if (mins < 60) return { kind: "soon" as const, text: `${mins}m left` };
  const hours = Math.round(mins / 60);
  if (hours < 48) return { kind: "ok" as const, text: `${hours}h left` };
  return { kind: "ok" as const, text: `${Math.round(hours / 24)}d left` };
}

export function ticketRef(n: number) {
  return `HX-${String(n).padStart(4, "0")}`;
}
