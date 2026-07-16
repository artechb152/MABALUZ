# מה-בלוז (Mabaluz)

מערכת חכמה לבניית לו״זי הכשרה — a web app (desktop-oriented) for building and managing training schedules.
Developed by ARTECH (יחידת ARTECH במערך ההדרכה של חיל המודיעין — בה״ד 15). First target: trainings at בה״ד 15; architected to generalize to other units and repeated training programs.

The UI is **Hebrew, RTL, light mode only**. Internal code is English.

## What this version is

A polished local prototype/MVP. **Everything runs locally with mock data** — there is no server, no database, no real email. See "What is mocked" below.

## Requirements

- Node.js 20+ (developed on Node 26)
- npm 10+
- A modern desktop browser (the UI targets desktop widths)

## Install

```bash
npm install
```

## Run (development)

```bash
npm run dev        # Vite dev server with hot reload — open the printed localhost URL
```

## Build

```bash
npm run build      # type-checks, then bundles static files into dist/
npm run preview    # serve the production build locally
```

## Checks

```bash
npm run typecheck  # tsc over renderer + scripts/configs
npm run lint       # eslint
npm run test       # vitest (scheduling engine + smoke tests)
```

## Role switcher / dev login

There is **no real authentication** in this version. The entry screen (`/`) lets you pick a mock user:

- רב״ט יואב כהן — חייל
- רב״ט מאיה פרץ — חיילת
- סגן נועם לוי — מפקד הכשרה
- סגן שירה אמסלם — מפקדת הכשרה
- רס״ן דניאל מזרחי — מפקד בכיר
- מנהל מערכת ARTECH — מנהל מערכת

You can switch users at any time from the topbar (עבור לתצוגת חייל / החלף משתמש).

### איך נכנסים כמנהל מערכת (admin mode)

בשלב הפיתוח אין התחברות אמיתית.
כדי להיכנס כאדמין, יש לבחור במסך הכניסה את המשתמש "מנהל מערכת ARTECH".

## What is mocked (v1)

| Area | Now | Future |
|------|-----|--------|
| Auth | Role switcher, mock users | Personal number + password, hashing, approval flow |
| Database | In-memory Zustand store seeded from `src/data/mock/` | MongoDB |
| Email / Outlook | `MockEmailProvider` + message-center log | Microsoft Graph via `OutlookEmailProvider` |
| Excel "learning" | Rule-based parser over sample sheets | Optional local mini-AI (no online APIs) |
| AI analysis | Locked "בפיתוח" card only | TBD |

Feature toggles for the future integrations exist in the admin area and default to **off**.

## Where things live

- Domain types: `src/types/`
- Hebrew UI copy (all of it): `src/lib/hebrewCopy.ts`
- Mock data: `src/data/mock/`
- Mock services (future DB seam): `src/data/services/`
- Scheduling engine (pure TS, tested): `src/features/scheduling-engine/`
- Mock email bot: `src/features/message-center/`
- Sample Excel files: `public/sample-excel/`

## Sample Excel sheets

Pre-generated samples ship in `public/sample-excel/`. To regenerate:

```bash
npm run generate:sample-excel
```

Expected format: 7 day columns (ראשון..שבת), time rows in the first column, Hebrew cell text. Merged cells are handled best-effort; colors are ignored.

## .env configuration

Copy `.env.example` to `.env`. Nothing is required — the app runs with safe defaults. `VITE_SUPPORT_PHONE` feeds the contact/FAQ pages (never hardcode it).

## Architecture overview

A plain Vite single-page web app (desktop-oriented); no Electron, no server:

- `src/features/*` — feature modules; UI talks to Promise-based mock services.
- `src/features/scheduling-engine` — pure TypeScript: slot building, hard-first placement (shared → peak days → guest lectures → reserve → meals → imported flexible → manual flexible), conflict detection, impact reports, suggestions.
- Draft/publish model: commanders edit drafts; soldiers see published schedules only; last 2 published versions are retained.

## Checkpoint workflow

Work proceeds in small checkpoints (see `PLAN.md`, live status in `CHECKPOINTS.md`). After each checkpoint: typecheck → lint → test → build; failures are fixed before moving on. Product assumptions are logged in `ASSUMPTIONS.md`.

## Manual smoke test

See `SMOKE_TEST.md` for the full walkthrough (commander builds and publishes a schedule; soldier sees published only; reminder bot logs a reminder; lecturer confirms; admin sees logs).
