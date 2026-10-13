"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Lead, STATUSES, api, isOverdue, isToday } from "@/lib/api";
import { useCountUp, useDebounced } from "@/lib/hooks";
import LeadCard from "@/components/LeadCard";
import AddLeadDialog from "@/components/AddLeadDialog";
import TimelineDialog from "@/components/TimelineDialog";

const FILTERS = ["All", ...STATUSES];

function SectionHeader({
  label,
  count,
  tone = "neutral",
}: {
  label: string;
  count: number;
  tone?: "neutral" | "brand" | "danger";
}) {
  const chip =
    tone === "brand"
      ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
      : tone === "danger"
        ? "bg-[#fff1f2] text-[#b91c1c]"
        : "bg-slate-100 text-[var(--ink-2)]";
  const text = tone === "danger" ? "text-[#b91c1c]" : tone === "brand" ? "text-[var(--brand-ink)]" : "";
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className={`eyebrow ${text}`}>{label}</h2>
      <span className={`num rounded-full px-2 py-0.5 text-[10px] font-bold ${chip}`}>{count}</span>
      <div className="hairline" />
    </div>
  );
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounced = useDebounced(search.trim(), 300);

  const fetchLeads = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const data = await api.listLeads({ search: debounced || undefined });
        setLeads(data);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not reach the API. Is the backend running on :8000?"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debounced]
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* keyboard shortcuts: / search · n new lead */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if ((e.key === "n" || e.key === "N") && !addOpen && activeId == null) {
        e.preventDefault();
        setAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, activeId]);

  /* derived data */
  const filtered = useMemo(
    () => (filter === "All" ? leads : leads.filter((l) => l.status === filter)),
    [leads, filter]
  );
  const todays = useMemo(() => filtered.filter((l) => l.follow_up_at && isToday(l.follow_up_at)), [filtered]);
  const overdue = useMemo(() => filtered.filter((l) => isOverdue(l.follow_up_at, l.status)), [filtered]);
  const todayIds = useMemo(() => new Set(todays.map((l) => l.id)), [todays]);
  const overdueIds = useMemo(() => new Set(overdue.map((l) => l.id)), [overdue]);
  const rest = useMemo(
    () => filtered.filter((l) => !todayIds.has(l.id) && !overdueIds.has(l.id)),
    [filtered, todayIds, overdueIds]
  );
  const counts = useMemo(() => {
    const m: Record<string, number> = { All: leads.length };
    for (const s of STATUSES) m[s] = leads.filter((l) => l.status === s).length;
    return m;
  }, [leads]);
  const stats = useMemo(() => {
    const total = leads.length;
    const today = leads.filter((l) => l.follow_up_at && isToday(l.follow_up_at)).length;
    const od = leads.filter((l) => isOverdue(l.follow_up_at, l.status)).length;
    const won = leads.filter((l) => l.status === "Won").length;
    return { total, today, overdue: od, wonRate: total ? Math.round((won / total) * 100) : 0 };
  }, [leads]);

  const cTotal = useCountUp(stats.total);
  const cToday = useCountUp(stats.today);
  const cOverdue = useCountUp(stats.overdue);
  const cWon = useCountUp(stats.wonRate);

  const statTiles = [
    { icon: Users, label: "Total leads", value: Math.round(cTotal), suffix: "", tint: "bg-[var(--brand-soft)] text-[var(--brand)]" },
    { icon: BellRing, label: "Due today", value: Math.round(cToday), suffix: "", tint: "bg-[#f3f0ff] text-[#5b21b6]" },
    { icon: AlertTriangle, label: "Overdue", value: Math.round(cOverdue), suffix: "", tint: "bg-[#fff1f2] text-[var(--rose)]" },
    { icon: Trophy, label: "Won rate", value: Math.round(cWon), suffix: "%", tint: "bg-[#ecfdf5] text-[#047857]" },
  ];

  /* actions */
  const createLead = async (v: { name: string; company: string; phone: string }) => {
    setSavingLead(true);
    setAddError(null);
    try {
      await api.createLead({ name: v.name, company: v.company || undefined, phone: v.phone || undefined });
      setAddOpen(false);
      await fetchLeads(true);
      showToast(`${v.name} added to your pipeline`);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not save the lead");
    } finally {
      setSavingLead(false);
    }
  };

  const animationKey = `${filter}|${debounced}`;
  const renderCards = (items: Lead[], variant: "today" | "overdue" | "default") =>
    items.map((l, i) => (
      <LeadCard
        key={`${animationKey}|${l.id}`}
        lead={l}
        variant={variant}
        index={i}
        onOpen={(x) => setActiveId(x.id)}
      />
    ));

  return (
    <div className="min-h-screen">
      {/* ═══ header ═══ */}
      <header className="topbar sticky top-0 z-40 relative">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="brandmark flex h-10 w-10 items-center justify-center rounded-[13px] text-white">
              <TrendingUp className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div className="leading-tight">
              <div className="text-[17px] font-extrabold tracking-tight text-[var(--brand-ink)]">LeadFlow</div>
              <div className="hidden items-center gap-1.5 text-[10.5px] font-semibold text-[var(--muted)] sm:flex">
                <span className="dot-live" aria-hidden />
                AI-smart CRM · PravarAI assessment
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads…"
                aria-label="Search leads by name"
                className="field field-with-icon w-52 py-2 pr-9 lg:w-64"
              />
              {!search && (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:block">
                  /
                </kbd>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchLeads(true)}
              title="Refresh leads"
              aria-label="Refresh leads"
              className="btn btn-quiet btn-icon"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "spin" : ""}`} />
            </button>

            <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary">
              <Plus className="h-4 w-4" strokeWidth={2.6} />
              <span className="hidden sm:inline">Add new lead</span>
              <span className="sm:hidden">Add</span>
              <kbd className="hidden bg-white/15 !text-white/80 !border-white/20 lg:inline-block">n</kbd>
            </button>
          </div>
        </div>

        {/* mobile search */}
        <div className="px-4 pb-3 sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name…"
              aria-label="Search leads by name"
              className="field field-with-icon py-2"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        {/* ═══ stats ═══ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statTiles.map((s, i) => (
            <div key={s.label} className="card stat rise flex items-center gap-3 px-4 py-3.5" style={{ animationDelay: `${i * 60}ms` }}>
              <span className={`stat-icon flex h-10 w-10 items-center justify-center rounded-xl ${s.tint}`}>
                <s.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="leading-tight">
                <div className="num text-[22px] font-extrabold text-[var(--ink)]">
                  {s.value}
                  {s.suffix}
                </div>
                <div className="text-[11px] font-semibold text-[var(--muted)]">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ filters ═══ */}
        <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Filters</span>
            <span className="num text-[11px] font-semibold text-slate-400">
              {filtered.length} lead{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-1 sm:flex-wrap sm:px-0 sm:pb-0">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                data-active={filter === f}
                aria-pressed={filter === f}
                className="pill"
              >
                {f}
                <span className="pill-count">{counts[f] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ content ═══ */}
        {loading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skel h-[116px]" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        ) : error ? (
          <div className="card rise mt-8 flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1f2] text-[var(--rose)]">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <p className="mt-3 text-base font-bold text-[var(--ink)]">Backend not reachable</p>
            <p className="mt-1 max-w-md text-sm text-[var(--muted)]">{error}</p>
            <p className="mt-3 max-w-md rounded-xl bg-slate-50 px-3 py-2 text-xs text-[var(--muted)]">
              Run <code className="font-mono text-[var(--ink-2)]">uvicorn main:app --reload</code> in{" "}
              <code className="font-mono text-[var(--ink-2)]">backend/</code> or{" "}
              <code className="font-mono text-[var(--ink-2)]">docker compose up</code>
            </p>
            <button type="button" onClick={() => fetchLeads()} className="btn btn-primary mt-5">
              <RefreshCw className="h-4 w-4" /> Retry connection
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card rise mt-8 flex flex-col items-center px-6 py-14 text-center">
            <svg width="120" height="90" viewBox="0 0 120 90" fill="none" aria-hidden className="floaty">
              <rect x="14" y="16" width="92" height="60" rx="12" fill="#eef4ff" stroke="#c7d7ff" />
              <rect x="28" y="32" width="46" height="6" rx="3" fill="#c7d7ff" />
              <rect x="28" y="44" width="64" height="6" rx="3" fill="#dbe6ff" />
              <rect x="28" y="56" width="34" height="6" rx="3" fill="#dbe6ff" />
              <circle cx="94" cy="64" r="14" fill="#2f6bff" />
              <path
                d="M94 58v6M94 68.5v.5"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <p className="mt-4 text-base font-bold text-[var(--ink)]">
              {debounced ? `No leads match “${debounced}”` : filter !== "All" ? `No ${filter} leads yet` : "Your pipeline is empty"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
              {debounced
                ? "Try a different name, or clear the search."
                : filter !== "All"
                  ? "Switch back to All to see every lead."
                  : "Add your first lead and start logging conversations."}
            </p>
            {debounced ? (
              <button type="button" onClick={() => setSearch("")} className="btn btn-quiet mt-5">
                Clear search
              </button>
            ) : filter !== "All" ? (
              <button type="button" onClick={() => setFilter("All")} className="btn btn-quiet mt-5">
                Show all leads
              </button>
            ) : (
              <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary mt-5">
                <Plus className="h-4 w-4" /> Add new lead
              </button>
            )}
          </div>
        ) : (
          <>
            {todays.length > 0 && (
              <section className="mt-8">
                <SectionHeader label="Today’s follow-ups" count={todays.length} tone="brand" />
                <div className="space-y-3">{renderCards(todays, "today")}</div>
              </section>
            )}

            {overdue.length > 0 && (
              <section className="mt-8">
                <SectionHeader label="Overdue — chase these" count={overdue.length} tone="danger" />
                <div className="space-y-3">{renderCards(overdue, "overdue")}</div>
              </section>
            )}

            <section className="mt-8">
              <SectionHeader
                label={todays.length > 0 || overdue.length > 0 ? "All leads" : "Leads"}
                count={rest.length > 0 ? rest.length : filtered.length}
              />
              <div className="space-y-3">
                {renderCards(rest.length > 0 || todays.length > 0 || overdue.length > 0 ? rest : filtered, "default")}
              </div>
            </section>
          </>
        )}

        {/* ═══ footer ═══ */}
        <footer className="mt-14 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <kbd>/</kbd> search
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd>n</kbd> new lead
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd>Esc</kbd> close
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            LeadFlow · Next.js + FastAPI · built for the PravarAI assessment
          </p>
        </footer>
      </main>

      {/* ═══ dialogs ═══ */}
      <AddLeadDialog
        open={addOpen}
        saving={savingLead}
        error={addError}
        onClose={() => setAddOpen(false)}
        onSave={createLead}
      />
      <TimelineDialog leadId={activeId} onClose={() => setActiveId(null)} onChanged={() => fetchLeads(true)} />

      {/* ═══ toast ═══ */}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
          <span className="toast-bar" aria-hidden />
        </div>
      )}

      {refreshing && (
        <div className="sr-only" aria-live="polite">
          Refreshing leads
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {loading ? "Loading leads" : `${leads.length} leads loaded`}
      </span>
    </div>
  );
}
