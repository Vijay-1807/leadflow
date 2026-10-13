"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, CalendarClock, Check, ChevronDown, Loader2, Phone, Send, X } from "lucide-react";
import {
  LeadDetail,
  LeadStatus,
  STATUSES,
  api,
  avatarGradient,
  formatFollowUp,
  formatFull,
  initials,
  statusClass,
  timeAgo,
} from "@/lib/api";
import Modal from "@/components/Modal";

const MAX_NOTE = 2000;

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
  const [shake, setShake] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const open = leadId != null;

  useEffect(() => {
    if (leadId == null) {
      setDetail(null);
      setNote("");
      setWithFollowUp(false);
      setDate("");
      setTime("");
      setError(null);
      setStatusOpen(false);
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

  const saveNote = async (opts?: { silent?: boolean }) => {
    if (!detail) return null;
    if (!note.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return null;
    }
    if (saving) return null;
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
      if (!opts?.silent) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      onChanged();
      return fresh;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the note");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (s: LeadStatus) => {
    if (!detail || s === detail.status || statusSaving) {
      setStatusOpen(false);
      return;
    }
    setStatusSaving(true);
    try {
      const updated = await api.updateLead(detail.id, { status: s });
      setDetail({ ...detail, status: updated.status });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setStatusSaving(false);
      setStatusOpen(false);
    }
  };

  const onComposerKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      saveNote();
    }
  };

  const discussions = detail?.discussions ?? [];

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-2xl" ariaLabelledBy="timeline-title">
      {/* ── header ─────────────────────────────── */}
      <div className="border-b border-[var(--line)] px-5 pb-4 pt-2 sm:px-6 sm:pt-5">
        {loading || !detail ? (
          <div className="flex items-center gap-3">
            <div className="skel h-12 w-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="skel h-4 w-44 rounded-md" />
              <div className="skel h-3 w-28 rounded-md" />
            </div>
            <div className="skel h-8 w-24 rounded-full" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="lead-avatar h-12 w-12 rounded-2xl text-base"
                style={{ background: avatarGradient(detail.name) }}
              >
                {initials(detail.name)}
              </span>
              <div className="min-w-0">
                <h2 id="timeline-title" className="truncate text-lg font-bold tracking-tight text-[var(--ink)]">
                  {detail.name}
                  {detail.company && (
                    <span className="ml-1.5 font-medium text-[var(--muted)]">({detail.company})</span>
                  )}
                </h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
                  {detail.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {detail.phone}
                    </span>
                  ) : (
                    <span>No phone on file</span>
                  )}
                  <span className="num">
                    {discussions.length} discussion{discussions.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* status dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={statusOpen}
                  className={`badge ${statusClass(detail.status)} cursor-pointer pr-2`}
                >
                  {statusSaving && <Loader2 className="spin h-3 w-3" />}
                  {detail.status}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
                {statusOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                    <div
                      role="listbox"
                      className="menu absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-1.5"
                    >
                      <div className="eyebrow px-2.5 pb-1 pt-1.5">Move to</div>
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          role="option"
                          aria-selected={s === detail.status}
                          onClick={() => changeStatus(s)}
                          className="menu-item"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${s === detail.status ? "bg-[var(--brand)]" : "bg-slate-300"}`}
                            />
                            {s}
                          </span>
                          {s === detail.status && <Check className="h-4 w-4 text-[var(--brand)]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button type="button" onClick={onClose} aria-label="Close" className="btn btn-quiet btn-icon">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {detail?.follow_up_at && (
          <div className="chip chip-brand mt-3.5 py-1.5 text-[0.78rem]">
            <CalendarClock className="h-3.5 w-3.5" />
            Follow-up set for {formatFull(detail.follow_up_at)}
          </div>
        )}
      </div>

      {/* ── timeline ───────────────────────────── */}
      <div ref={scrollRef} className="min-h-[220px] flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skel h-[86px] rounded-2xl" />
            ))}
          </div>
        ) : error && !detail ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : discussions.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="floaty flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Send className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[var(--ink)]">No discussions yet</p>
            <p className="mt-1 max-w-[16rem] text-xs text-[var(--muted)]">
              Log the first touch — a call, email or meeting — to start this timeline.
            </p>
          </div>
        ) : (
          <ol className="timeline space-y-4">
            {discussions.map((d, i) => (
              <li key={d.id} className="tl-item" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="tl-dot" aria-hidden />
                <div className="flex flex-wrap items-baseline gap-x-2 text-[0.72rem] font-semibold text-[var(--muted)]">
                  <span className="num text-[var(--ink-2)]">{formatFull(d.created_at)}</span>
                  <span className="opacity-70">· {timeAgo(d.created_at)}</span>
                  {i === 0 && (
                    <span className="rounded-full bg-[var(--brand-soft)] px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--brand-ink)]">
                      latest
                    </span>
                  )}
                </div>
                <div className="tl-card mt-1.5 text-sm leading-relaxed text-[var(--ink-2)]">
                  {d.note}
                  {d.follow_up_at && (
                    <div className="chip chip-brand mt-2.5">
                      <BellRing className="h-3 w-3" />
                      Follow-up {formatFollowUp(d.follow_up_at)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── composer ───────────────────────────── */}
      <div className="border-t border-[var(--line)] bg-[#fafbfd] px-5 pb-5 pt-4 sm:px-6">
        <div className={shake ? "shake" : ""}>
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
            onKeyDown={onComposerKeyDown}
            placeholder="Log a new discussion… (call, email, demo, objection…)"
            rows={3}
            aria-label="Discussion note"
            className="field resize-none leading-relaxed"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <button
            type="button"
            onClick={() => setWithFollowUp((v) => !v)}
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--ink-2)]"
            aria-pressed={withFollowUp}
          >
            <span className="switch" data-on={withFollowUp} aria-hidden />
            Set follow-up
          </button>

          {withFollowUp && (
            <div className="fade flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Follow-up date"
                className="field w-auto py-1.5"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="Follow-up time"
                className="field w-auto py-1.5"
              />
            </div>
          )}

          <span className="num ml-auto hidden text-[0.7rem] text-slate-400 sm:inline">
            {note.length}/{MAX_NOTE}
          </span>

          <button
            type="button"
            onClick={() => saveNote()}
            disabled={!note.trim() || saving}
            className="btn btn-dark"
          >
            {saving ? <Loader2 className="spin h-4 w-4" /> : <Send className="h-4 w-4" />}
            Save note
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span className="text-[0.7rem] text-slate-400">
            <kbd>Ctrl</kbd> <span className="mx-0.5">+</span> <kbd>Enter</kbd> to save quickly
          </span>
          {error && <span className="text-[0.72rem] font-medium text-red-600">{error}</span>}
        </div>
      </div>
    </Modal>
  );
}
