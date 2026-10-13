# LeadFlow — AI-smart Lead Management (PravarAI Assessment)

Single-screen Lead Management tool: track leads, log every discussion, and never miss a follow-up.

**Stack:** Next.js 16 (App Router + Tailwind v4) · FastAPI + SQLite (SQLAlchemy) · Docker Compose

> Built for the PravarAI **AI-smart fullstack intern** coding assessment.
> AI assistance (OpenCode / Muse Spark) was used to fast-track scaffolding and UI polish — all code was reviewed, run, and verified locally. See [AI usage](#ai-usage) below.

---

## ✨ Features (maps to evaluation matrix)

**Functional**
- [x] Lead list shows name, status badge, last note, time-ago
- [x] Today's follow-ups pinned at top (`isToday` on `follow_up_at`)
- [x] Timeline dialog loads discussions in reverse-chronological order
- [x] Adding a discussion updates the list immediately (refetch + optimistic reset)
- [x] Add new lead works (name required, company/phone optional, defaults to `New`)
- [x] Status update from dialog persists (`PATCH /api/leads/{id}`)

**Bonus**
- [x] Search leads by name (debounced, server-side `?search=`)
- [x] Overdue follow-ups highlighted in red (separate section + red chip)
- [x] Docker Compose setup (`docker compose up --build`)
- [x] Seed script with 7 leads + 17 discussions (`backend/seed.py`)
- [x] Status filters with live counts (`All / New / Contacted / Qualified / Proposal Sent / Won / Lost`)

**UX extras (to stand out)**
- Design system in `globals.css`: tokens (color/elevation/motion/radius), expo easings, layered shadows
- Stats bar with **animated count-up** numbers: Total · Due today · Overdue · Won rate
- Staggered list entrance, card hover lift + growing accent bar, avatar micro-tilt
- Dialogs: blurred backdrop, desktop scale-in / mobile bottom-sheet, focus trap, scroll lock
- Timeline: animated rail draw, pulsing "latest" dot, slide-in items, latest badge
- Composer: animated follow-up switch, char counter, `Ctrl/⌘ + Enter` to save
- Status dropdown with animated menu; shake-on-invalid in Add Lead; Enter to submit
- Shimmer skeletons (not pulse), refined empty/error states, auto-dismiss toast with progress bar
- Keyboard shortcuts: `/` search · `n` new lead · `Esc` close dialogs
- Responsive: mobile bottom sheets, scrollable filter pills, 2-col stats, touch-sized targets
- A11y: focus-visible rings, aria labels/live regions, `prefers-reduced-motion` support
- Sticky glass header with live status dot; deterministic avatar gradients

---

## 🗂 Repo structure

```
.
├── backend/
│   ├── main.py           # FastAPI app + all /api routes
│   ├── models.py         # Lead, Discussion (SQLAlchemy)
│   ├── schemas.py        # Pydantic validation
│   ├── database.py       # SQLite (DATABASE_URL-ready for Postgres)
│   ├── seed.py           # 7 leads + discussions (today + overdue + won/lost)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/page.tsx      # single-screen app
│   ├── app/layout.tsx / globals.css   # design system: tokens, motion, components
│   ├── components/LeadCard.tsx
│   ├── components/TimelineDialog.tsx
│   ├── components/AddLeadDialog.tsx
│   ├── components/Modal.tsx           # shared dialog shell (focus trap, sheet-on-mobile)
│   ├── lib/api.ts        # typed client + time helpers
│   ├── lib/hooks.ts      # useCountUp, useDebounced
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quick start

### Option A — Docker (recommended for reviewers)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend → http://localhost:8000 (`/api/health`, `/api/leads`, docs at `/docs`)

The backend container auto-runs `python seed.py` on start.

### Option B — Local dev (two terminals)

**1. Backend**
```bash
cd backend
cp .env.example .env        # optional
pip install -r requirements.txt
python seed.py              # seeds 7 leads
uvicorn main:app --reload --port 8000
```

**2. Frontend**
```bash
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                 # http://localhost:3000
```

Production check: `npm run build && npm start`.

---

## 🔌 API reference

| Method | Endpoint | Codes | Description |
|---|---|---|---|
| GET | `/api/health` | 200 | Liveness probe |
| GET | `/api/leads?status=&search=` | 200, 400 | List leads w/ `last_note`, `last_discussion_at`, `discussions_count` |
| POST | `/api/leads` | 201, 422 | Create lead `{name*, company?, phone?}` → status `New` |
| GET | `/api/leads/{id}` | 200, 404 | Lead + `discussions` (newest first) |
| PATCH | `/api/leads/{id}` | 200, 400, 404, 422 | Update `status / name / company / phone / follow_up_at` |
| POST | `/api/leads/{id}/discussions` | 201, 404, 422 | Add note `{note*, follow_up_at?}` → also bumps `lead.follow_up_at` |
| DELETE | `/api/leads/{id}` | 204, 404 | Delete lead |
| GET | `/api/stats` | 200 | `{total, by_status}` |

Statuses: `New, Contacted, Qualified, Proposal Sent, Won, Lost`.

---

## 🌱 Seed data

`backend/seed.py` creates (relative to *today*, so Today/Overdue sections always demo well):

- **Sarah Connor (Acme)** — Proposal Sent, follow-up **today 2 PM**
- **Bill Lumbergh (Initech)** — Contacted, follow-up **today 5:30 PM**
- **Hank Scorpio (Globex)** — New, inbound 2h ago
- **Ananya Sharma (Zerodha)** — Qualified, **overdue** (yesterday)
- **Rohan Mehta (HDFC Wealth)** — Contacted, **overdue** (2 days ago)
- **Bruce Wayne (Wayne Ent.)** — Won
- **Priya Nair (FinEdge)** — Lost

Re-run anytime: `python seed.py` (clears + reseeds).

---

## 📸 Screenshots / video

Add your run-through here before submitting (required by the brief):

- `docs/lead-list.png` — list with Today's + Overdue pinned
- `docs/timeline-dialog.png` — discussion history + add-note form
- `docs/add-lead.png` — add-lead dialog
- `docs/demo.mp4` — 60–90s click-through (list → filter → search → open timeline → add note with follow-up → status change → add lead)

Quick capture: run Docker, open http://localhost:3000, use Win+Shift+S / OBS.

---

## 🧠 AI usage

Per the brief ("please be very clear on any and all output you share with us"):

- AI pair-programmer (OpenCode + Muse Spark) generated initial scaffolding, Tailwind styling, and doc drafts.
- I (the applicant) reviewed every file, fixed Python 3.9 compat (`Optional` vs `X|Y`), pinned working `requirements.txt` (prebuilt `greenlet` wheel), ran `seed.py`, hit `/api/health` + `/api/leads`, and ran `npm run build` successfully.
- No AI-generated code was submitted blindly — all flows were executed locally.

---

## 📦 Submission checklist

- [ ] Public GitHub repo (this folder, without `*.png / *.pdf` brief assets, `node_modules`, `*.db`)
- [ ] `.env.example` present (root + backend + frontend)
- [ ] README with working setup steps (this file)
- [ ] Meaningful git history (`git log --oneline`)
- [ ] Video / screenshots linked above

Suggested commits:
```
feat: scaffold FastAPI backend (models, CRUD, seed)
feat: scaffold Next.js frontend (Tailwind, api client)
feat: lead list with pinned todays + overdue + filters + search
feat: timeline dialog with add-note + status update
feat: add-lead dialog + stats + toasts + polish
chore: docker compose, env examples, README
```

---

## 🛠 Troubleshooting

| Symptom | Fix |
|---|---|
| `Backend not reachable` in UI | Start backend on `:8000` or set `NEXT_PUBLIC_API_URL` + restart frontend |
| `Failed building wheel for greenlet` (Win, Py 3.9) | `requirements.txt` already pins `greenlet==2.0.2` (prebuilt wheel) — `pip install -r requirements.txt` |
| `TypeError: unsupported operand for \|` | Use Python 3.9-compatible code (already fixed via `Optional`) |
| Port in use | Change `BACKEND_PORT / FRONTEND_PORT` in `.env` |
| Empty list after restart | Re-run `python seed.py` (SQLite file is git-ignored) |
