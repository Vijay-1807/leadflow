"use client";

import { BellRing, ChevronRight, Clock3, MessageSquareText, Phone } from "lucide-react";
import {
  Lead,
  avatarGradient,
  formatFollowUp,
  initials,
  isOverdue,
  isToday,
  statusClass,
  timeAgo,
  untilFollowUp,
} from "@/lib/api";

export function StatusBadge({ status, className = "" }: { status: Lead["status"]; className?: string }) {
  return <span className={`badge ${statusClass(status)} ${className}`}>{status}</span>;
}

function FollowUpChip({ lead }: { lead: Lead }) {
  if (!lead.follow_up_at) return null;
  const overdue = isOverdue(lead.follow_up_at, lead.status);
  const today = isToday(lead.follow_up_at);
  const delta = untilFollowUp(lead.follow_up_at);
  const timeOnly = new Date(lead.follow_up_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const label = overdue
    ? `Overdue · ${formatFollowUp(lead.follow_up_at)}`
    : today
      ? `Today · ${timeOnly}`
      : `Follow-up · ${formatFollowUp(lead.follow_up_at)}`;
  return (
    <span className={`chip ${overdue ? "chip-danger" : today ? "chip-brand" : "chip-quiet"}`}>
      <BellRing className="h-3 w-3" />
      {label}
      {delta && <span className="opacity-60">· {delta}</span>}
    </span>
  );
}

export default function LeadCard({
  lead,
  variant = "default",
  index = 0,
  onOpen,
}: {
  lead: Lead;
  variant?: "today" | "overdue" | "default";
  index?: number;
  onOpen: (lead: Lead) => void;
}) {
  return (
    <button
      type="button"
      data-variant={variant}
      onClick={() => onOpen(lead)}
      aria-label={`Open timeline for ${lead.name}`}
      className="lead-card rise group"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      <div className="flex items-start gap-3.5">
        <span className="lead-avatar" style={{ background: avatarGradient(lead.name) }}>
          {initials(lead.name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="lead-name truncate">
                {lead.name}
                {lead.company && (
                  <span className="ml-1.5 font-normal text-[0.82rem] text-[var(--muted)]">({lead.company})</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] font-medium text-[var(--muted)]">
                {lead.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {lead.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <MessageSquareText className="h-3 w-3" />
                  <span className="num">{lead.discussions_count}</span> notes
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge status={lead.status} />
              <ChevronRight className="h-4 w-4 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5" />
            </div>
          </div>

          <p className="lead-note mt-2.5">
            <span className="font-semibold text-[var(--ink)]">Last note: </span>
            {lead.last_note ? (
              <>
                {lead.last_note}
                <span className="ml-1.5 whitespace-nowrap text-[0.72rem] font-medium text-[var(--muted)]">
                  · {timeAgo(lead.last_discussion_at)}
                </span>
              </>
            ) : (
              <span className="text-slate-400">No discussions yet — click to log the first one.</span>
            )}
          </p>

          {lead.follow_up_at && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <FollowUpChip lead={lead} />
              <span className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-slate-400">
                <Clock3 className="h-3 w-3" /> updated {timeAgo(lead.updated_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
