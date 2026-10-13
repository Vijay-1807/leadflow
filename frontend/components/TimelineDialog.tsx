"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, ChevronDown, Loader2, Phone, StickyNote, X } from "lucide-react";
import {
  LeadDetail,
  LeadStatus,
  STATUSES,
  STATUS_STYLE,
  api,
  avatarGradient,
  formatFollowUp,
  formatFull,
  initials,
  timeAgo,
} from "@/lib/api";
import { cn } from "@/lib/cn";

export default function TimelineDialog({
  leadId,
  onClose,
  onChanged,
}: {
  leadId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [withFollowUp, setWithFollowUp] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (leadId == null) {
      setDetail(null);
      setNote("");
      setWithFollowUp(false);
      setDate("");
      setTime("");
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .getLead(leadId)
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leadId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (leadId != null) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leadId, onClose]);

  if (leadId == null) return null;

  const saveNote = async () => {
    if (!detail || !note.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      let followUp: string | null = null;
      if (withFollowUp && date) {
        const t = time || "09:00";
        followUp = new Date(`${date}T${t}`).toISOString();
      }
      await api.addDiscussion(detail.id, { note: note.trim(), follow_up_at: followUp });
      const fresh = await api.getLead(detail.id);
      setDetail(fresh);
      setNote("");
      setWithFollowUp(false);
      setDate("");
      setTime("");
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (s: LeadStatus) => {
    if (!detail || s === detail.status) {
      setStatusOpen(false);
      return;
    }
    setStatusSaving(true);
    try {
      const updated = await api.updateLead(detail.id, { status: s });
      setDetail({ ...detail, status: updated.status });
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatusSaving(false);
      setStatusOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-fade absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-rise relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="border-b border-slate-100 px-6 py-4">
          {loading || !detail ? (
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white",
                    avatarGradient(detail.name)
                  )}
                >
                  {initials(detail.name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold text-slate-900">
                    {detail.name}{" "}
                    {detail.company && <span className="font-normal text-slate-500">({detail.company})</span>}
                  </div>
                  {detail.phone && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                      <Phone className="h-3.5 w-3.5" /> {detail.phone}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setStatusOpen((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                      STATUS_STYLE[detail.status]
                    )}
                  >
                    {statusSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {detail.status}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                  {statusOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                      <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => changeStatus(s)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            {s}
                            {s === detail.status && <Check className="h-4 w-4 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
          {detail?.follow_up_at && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
              <BellRing className="h-3.5 w-3.5" /> Follow-up set for: {formatFollowUp(detail.follow_up_at)} ·{" "}
              {formatFull(detail.follow_up_at)}
            </div>
          )}
        </div>

        {/* timeline */}
        <div className="nice-scroll min-h-[200px] flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-50" />
              ))}
            </div>
          ) : error && !detail ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : detail && detail.discussions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <StickyNote className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No discussions yet. Log the first one below.</p>
            </div>
          ) : (
            <ol className="relative space-y-5 border-l-2 border-slate-100 pl-0">
              {detail?.discussions.map((d, i) => (
                <li key={d.id} className="relative pl-8">
                  <span
                    className={cn(
                      "absolute -left-[7px] top-1 h-3 w-3 rounded-full ring-4 ring-white",
                      i === 0 ? "bg-blue-600" : "bg-slate-300"
                    )}
                  />
                  <div className="text-xs text-slate-500">
                    {formatFull(d.created_at)}{" "}
                    <span className="text-slate-400">({timeAgo(d.created_at)})</span>
                  </div>
                  <div className="mt-1.5 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">
                    {d.note}
                    {d.follow_up_at && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        <BellRing className="h-3.5 w-3.5" /> Follow-up set for: {formatFollowUp(d.follow_up_at)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Log a new discussion..."
            rows={3}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={withFollowUp}
                onChange={(e) => setWithFollowUp(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-blue-600"
              />
              Set Follow-up
            </label>
            {withFollowUp && (
              <>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </>
            )}
            <div className="ml-auto" />
            {error && detail && <span className="text-xs text-red-600">{error}</span>}
            <button
              onClick={saveNote}
              disabled={!note.trim() || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
