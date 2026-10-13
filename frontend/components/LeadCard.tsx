"use client";

import { BellRing, ChevronRight, Clock3, MessageSquareText, Phone } from "lucide-react";
import {
  Lead,
  STATUS_STYLE,
  avatarGradient,
  formatFollowUp,
  initials,
  isOverdue,
  isToday,
  timeAgo,
} from "@/lib/api";
import { cn } from "@/lib/cn";

export function StatusBadge({ status }: { status: Lead["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_STYLE[status]
      )}
    >
      {status}
    </span>
  );
}

export function FollowUpChip({ lead }: { lead: Lead }) {
  if (!lead.follow_up_at) return null;
  const overdue = isOverdue(lead.follow_up_at, lead.status);
  const today = isToday(lead.follow_up_at);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
        overdue
          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
          : today
            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      )}
    >
      <BellRing className="h-3.5 w-3.5" />
      {overdue ? `Overdue · ${formatFollowUp(lead.follow_up_at)}` : `Follow-up ${formatFollowUp(lead.follow_up_at)}`}
    </span>
  );
}

export default function LeadCard({
  lead,
  variant,
  onOpen,
}: {
  lead: Lead;
  variant?: "today" | "overdue" | "default";
  onOpen: (lead: Lead) => void;
}) {
  const overdue = isOverdue(lead.follow_up_at, lead.status);
  return (
    <button
      onClick={() => onOpen(lead)}
      className={cn(
        "group w-full rounded-2xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_-12px_rgba(37,99,235,0.35)]",
        variant === "today" && "border-blue-200 bg-blue-50/60 ring-1 ring-blue-100",
        variant === "overdue" && "border-red-200 bg-red-50/40 ring-1 ring-red-100",
        variant === "default" && "border-slate-200/80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white",
              avatarGradient(lead.name)
            )}
          >
            {initials(lead.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-slate-900">
              {lead.name}{" "}
              {lead.company && <span className="font-normal text-slate-500">({lead.company})</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {lead.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {lead.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MessageSquareText className="h-3 w-3" /> {lead.discussions_count} notes
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={lead.status} />
          <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
        </div>
      </div>

      <div className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-800">Last Note: </span>
        {lead.last_note ? (
          <>
            {lead.last_note}{" "}
            <span className="whitespace-nowrap text-xs text-slate-400">
              · {timeAgo(lead.last_discussion_at)}
            </span>
          </>
        ) : (
          <span className="text-slate-400">No discussions yet — click to log the first one.</span>
        )}
      </div>

      {(lead.follow_up_at || overdue) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FollowUpChip lead={lead} />
          {lead.last_discussion_at && !overdue && !isToday(lead.follow_up_at) && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Clock3 className="h-3.5 w-3.5" /> {timeAgo(lead.last_discussion_at)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
