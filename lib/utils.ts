import {
  EventType,
  LeadStatus,
  MatterStatus,
  PracticeArea,
  Priority,
} from "./types";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

let counter = 0;
export function uid(prefix = "id") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}${Math.floor(
    Math.random() * 1e4
  ).toString(36)}`;
}

export function todayISO(): string {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function stampDaysAgo(n: number, hh = 10, mm = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

export function stampDaysAhead(n: number, hh = 10, mm = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

export function parseISO(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return parseISO(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateShort(iso?: string): string {
  if (!iso) return "—";
  return parseISO(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  return parseISO(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function fmtMoney(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function isTodayISO(iso: string): boolean {
  return iso.slice(0, 10) === todayISO();
}

export function isPastDate(iso: string): boolean {
  return iso.slice(0, 10) < todayISO();
}

export function daysUntil(iso: string): number {
  const a = parseISO(iso.slice(0, 10)).getTime();
  const b = parseISO(todayISO()).getTime();
  return Math.round((a - b) / 86400000);
}

export function isThisWeek(iso: string): boolean {
  const d = daysUntil(iso);
  return d >= 0 && d <= 7;
}

export type Tone =
  | "accent"
  | "ok"
  | "warn"
  | "bad"
  | "viol"
  | "neutral"
  | "ink";

export const LEAD_STATUS_TONE: Record<LeadStatus, Tone> = {
  "New Lead": "accent",
  Contacted: "viol",
  Qualified: "ink",
  "Consultation Scheduled": "warn",
  "Consultation Completed": "warn",
  "Retainer Sent": "viol",
  "Retainer Signed": "ok",
  Converted: "ok",
  Lost: "bad",
};

export const MATTER_STATUS_TONE: Record<MatterStatus, Tone> = {
  New: "accent",
  Open: "accent",
  Discovery: "viol",
  Negotiation: "warn",
  "Court Pending": "warn",
  Settlement: "ok",
  Closed: "neutral",
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  Low: "neutral",
  Medium: "accent",
  High: "warn",
  Urgent: "bad",
};

export const PA_COLORS: Record<PracticeArea, string> = {
  "Personal Injury": "#2f6bff",
  "Family Law": "#7a5af8",
  "Criminal Defense": "#d05555",
  Immigration: "#2f9e77",
  "Business Law": "#c9862b",
  "Estate Planning": "#5d6b8c",
};

export const EVENT_COLORS: Record<EventType, string> = {
  Consultation: "#2f6bff",
  "Court Hearing": "#d05555",
  Deposition: "#7a5af8",
  "Filing Deadline": "#c9862b",
  "Client Meeting": "#2f9e77",
  "Internal Meeting": "#5d6b8c",
  "Follow-up": "#0e9bb5",
};

export const AVATAR_COLORS = [
  "#2f6bff",
  "#7a5af8",
  "#2f9e77",
  "#c9862b",
  "#d05555",
  "#0e9bb5",
  "#5d6b8c",
  "#b065d8",
];

export function csv(list: string[]): string {
  return list.join(", ");
}
