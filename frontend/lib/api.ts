export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal Sent" | "Won" | "Lost";

export const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];

export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  last_note: string | null;
  last_discussion_at: string | null;
  discussions_count: number;
}

export interface Discussion {
  id: number;
  lead_id: number;
  note: string;
  follow_up_at: string | null;
  created_at: string;
}

export interface LeadDetail extends Lead {
  discussions: Discussion[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (typeof j?.detail === "string") msg = j.detail;
      else if (Array.isArray(j?.detail)) msg = j.detail.map((d: any) => d.msg).join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listLeads: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "All") q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    return fetch(`${API_BASE}/api/leads?${q.toString()}`).then(handle<Lead[]>);
  },
  getLead: (id: number) => fetch(`${API_BASE}/api/leads/${id}`).then(handle<LeadDetail>),
  createLead: (body: { name: string; company?: string; phone?: string }) =>
    fetch(`${API_BASE}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handle<Lead>),
  updateLead: (id: number, body: Partial<{ status: LeadStatus; follow_up_at: string | null; name: string; company: string; phone: string }>) =>
    fetch(`${API_BASE}/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handle<Lead>),
  addDiscussion: (id: number, body: { note: string; follow_up_at?: string | null }) =>
    fetch(`${API_BASE}/api/leads/${id}/discussions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handle<Discussion>),
  health: () => fetch(`${API_BASE}/api/health`).then(handle<{ status: string }>),
};

// ---------- time helpers ----------

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.floor((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  return `${Math.floor(mo / 12)} year${Math.floor(mo / 12) === 1 ? "" : "s"} ago`;
}

export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function isOverdue(iso: string | null | undefined, status?: string): boolean {
  if (!iso) return false;
  if (status === "Won" || status === "Lost") return false;
  const d = new Date(iso);
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  return d.getTime() < startToday.getTime();
}

export function formatFollowUp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday(iso)) return `today at ${time}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate();
  if (isTomorrow) return `tomorrow at ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

export function formatFull(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

/** Countdown copy: "in 2h 15m" / "3h 10m ago" for a follow-up instant. */
export function untilFollowUp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 60_000) return "due now";
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const unit = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
  "linear-gradient(135deg, #f43f5e 0%, #db2777 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
];

export function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

const STATUS_CLASS: Record<LeadStatus, string> = {
  New: "badge-new",
  Contacted: "badge-contacted",
  Qualified: "badge-qualified",
  "Proposal Sent": "badge-proposal",
  Won: "badge-won",
  Lost: "badge-lost",
};

export function statusClass(status: string): string {
  return STATUS_CLASS[status as LeadStatus] ?? "badge-lost";
}
