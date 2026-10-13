"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Lead, STATUSES, api, isOverdue, isToday } from "@/lib/api";
import { cn } from "@/lib/cn";
import LeadCard from "@/components/LeadCard";
import AddLeadDialog from "@/components/AddLeadDialog";
import TimelineDialog from "@/components/TimelineDialog";

const FILTERS = ["All", ...STATUSES];

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await api.listLeads({ search: debounced || undefined });
      setLeads(data);
    } catch (e: any) {
      setError(e.message || "Could not reach the API. Is the backend running on :8000?");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debounced]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const filtered = useMemo(() => {
    if (filter === "All") return leads;
    return leads.filter((l) => l.status === filter);
  }, [leads, filter]);

  const todays = useMemo(
    () => filtered.filter((l) => l.follow_up_at && isToday(l.follow_up_at)),
    [filtered]
  );
  const overdue = useMemo(
    () => filtered.filter((l) => isOverdue(l.follow_up_at, l.status)),
    [filtered]
  );
  const overdueIds = useMemo(() => new Set(overdue.map((l) => l.id)), [overdue]);
  const todayIds = useMemo(() => new Set(todays.map((l) => l.id)), [todays]);
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

  const createLead = async (v: { name: string; company: string; phone: string }) => {
    setSavingLead(true);
    setAddError(null);
    try {
      await api.createLead({
        name: v.name,
        company: v.company || undefined,
        phone: v.phone || undefined,
      });
      setAddOpen(false);
      await fetchLeads(true);
      showToast("Lead added successfully");
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setSavingLead(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-lg font-extrabold tracking-tight text-blue-700">LeadFlow</div>
              <div className="hidden text-[11px] font-medium text-slate-500 sm:block">
                AI-smart CRM · PravarAI assessment
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads by name…"
                className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 lg:w-64"
              />
            </div>
            <button
              onClick={() => fetchLeads(true)}
              title="Refresh"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-blue-600"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add New Lead</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-3 sm:hidden sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6">
        {/* stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Users, label: "Total leads", value: stats.total, tint: "text-blue-600 bg-blue-50" },
            { icon: BellRing, label: "Due today", value: stats.today, tint: "text-violet-600 bg-violet-50" },
            { icon: AlertTriangle, label: "Overdue", value: stats.overdue, tint: "text-red-600 bg-red-50" },
            { icon: Trophy, label: "Won rate", value: `${stats.wonRate}%`, tint: "text-emerald-600 bg-emerald-50" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm"
            >
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", s.tint)}>
                <s.icon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="text-xl font-extrabold text-slate-900">{s.value}</div>
                <div className="text-xs font-medium text-slate-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* filters */}
        <div className="mt-6 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Filters:</span>
          <div className="flex flex-1 flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all",
                  filter === f
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                )}
              >
                {f}
                <span className={cn("ml-1.5 text-xs", filter === f ? "text-slate-300" : "text-slate-400")}>
                  {counts[f] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* content */}
        {loading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-2 font-semibold text-red-800">Backend not reachable</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-600">{error}</p>
            <p className="mt-2 text-xs text-red-500">
              Run <code className="rounded bg-red-100 px-1">uvicorn main:app --reload</code> in{" "}
              <code className="rounded bg-red-100 px-1">backend/</code> or{" "}
              <code className="rounded bg-red-100 px-1">docker compose up</code>
            </p>
            <button
              onClick={() => fetchLeads()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
            <Inbox className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No leads found</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {debounced ? `Nothing matches “${debounced}”. Try another search.` : "Add your first lead to get started."}
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add New Lead
            </button>
          </div>
        ) : (
          <>
            {todays.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
                  <BellRing className="h-3.5 w-3.5 text-blue-600" /> Today&apos;s follow-ups
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">{todays.length}</span>
                </h2>
                <div className="space-y-3">
                  {todays.map((l) => (
                    <LeadCard key={l.id} lead={l} variant="today" onOpen={(x) => setActiveId(x.id)} />
                  ))}
                </div>
              </section>
            )}

            {overdue.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" /> Overdue follow-ups
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700">{overdue.length}</span>
                </h2>
                <div className="space-y-3">
                  {overdue.map((l) => (
                    <LeadCard key={l.id} lead={l} variant="overdue" onOpen={(x) => setActiveId(x.id)} />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                {todays.length > 0 || overdue.length > 0 ? "All leads" : "Leads"}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {rest.length || filtered.length}
                </span>
              </h2>
              <div className="space-y-3">
                {(todays.length > 0 || overdue.length > 0 ? rest : filtered).map((l) => (
                  <LeadCard key={l.id} lead={l} variant="default" onOpen={(x) => setActiveId(x.id)} />
                ))}
              </div>
            </section>
          </>
        )}

        <p className="mt-10 text-center text-xs text-slate-400">
          LeadFlow · Built for the PravarAI AI-smart fullstack intern assessment · Next.js + FastAPI
        </p>
      </main>

      <AddLeadDialog
        open={addOpen}
        saving={savingLead}
        error={addError}
        onClose={() => setAddOpen(false)}
        onSave={createLead}
      />
      <TimelineDialog leadId={activeId} onClose={() => setActiveId(null)} onChanged={() => fetchLeads(true)} />

      {toast && (
        <div className="animate-rise fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}
