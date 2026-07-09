# PLAN — מה-בלוז (Mabaluz)

Smart training-schedule builder. Electron desktop app, React + TypeScript + Vite, Hebrew-only RTL UI, light mode, mock data (no real DB/auth/Outlook/AI in v1).

## Architecture

```
mabaluz/
  electron/
    main/            # Electron main process (window, lifecycle)
    preload/         # contextBridge (minimal surface)
  src/
    app/             # App root, router, providers, Zustand store
    components/      # Reusable UI kit (Button, Card, Modal, Select, Badge, ...)
    features/
      auth/              # Role switcher / dev login entry screen
      dashboard/         # Per-role dashboards (soldier / commander / senior / admin)
      trainings/         # Training list + create-training wizard
      schedule/          # Weekly builder, month view, event editor, drag/drop
      scheduling-engine/ # PURE TS: scheduler, conflicts, impact report, suggestions
      excel-import/      # Upload, parser, review screen, learning (rule-based)
      shared-events/     # Shared schedule groups, approvals, contacts
      peak-days/         # Full-day hard events
      guest-lecturers/   # Lecturer DB, lecture events, cancellation flow
      message-center/    # Mock email bot, reminder scheduler, templates, logs
      conflict-center/   # Conflict list, severities, suggestions
      versions/          # Draft / published / previous versions
      admin/             # Users, toggles, approvals, logs, FAQ editor
      faq/               # FAQ + contact pages
      settings/          # Training/system settings pages
    data/
      mock/          # Seed data: users, trainings, events, lecturers, ...
      services/      # Mock service layer (async API shape, future DB swap)
    lib/             # hebrewCopy.ts, theme.ts, date/time utils, id utils
    styles/          # Tailwind entry + global RTL styles
    types/           # All domain models (single source of truth)
    assets/icons/    # Placeholder icon components (custom icons come later)
  scripts/           # generate-sample-excel.ts
  tests/             # engine + smoke tests (Vitest)
  public/sample-excel/
```

## Key design decisions

- **Engine purity**: `scheduling-engine` has zero React/Electron imports. Input → output objects only. Fully unit-tested.
- **Draft/publish**: commanders mutate a DRAFT schedule; soldiers read only the PUBLISHED one. Publish archives previous version (keep last 2 previous).
- **Service layer**: UI talks to `data/services/*` (Promise-based). Today they hit an in-memory Zustand store seeded from `data/mock`; later they can hit MongoDB without UI changes.
- **Providers**: `EmailProvider` interface with `MockEmailProvider` implemented and `OutlookEmailProvider` disabled placeholder.
- **Hebrew copy**: every user-facing string lives in `src/lib/hebrewCopy.ts`. No English UI, no emojis.
- **State**: Zustand store = the in-memory "database" + session (current mock user). Deterministic seed data.
- **Routing**: HashRouter (safe under `file://` in packaged Electron).
- **Styling**: Tailwind 3 with the spec's indigo/light token palette; glassy rounded panels; light mode only; `dir="rtl"` at document root.

## Delivery order (see CHECKPOINTS.md for live status)

0. Scaffold: electron-vite, Tailwind, RTL shell, theme tokens, role switcher, planning files.
1. Types + mock data + mock services + store.
2. App shell (sidebar/topbar) + 4 role dashboards.
3. Weekly schedule grid (RTL, 15-min slots, colored blocks, click modal, draft/publish indicators).
4. Event editor (create/edit, type, flexibility, visibility, lock).
5. Scheduling engine + conflict detector + impact report + suggestions + tests.
6. Generate-schedule flow + create-training wizard + publish flow.
7. Excel import architecture + sample generator + parser + review screen + locked AI card.
8. Shared events (link, approvals, stuck state, contacts).
9. Peak days (full-day, overrides, warnings).
10. Guest lecturers + message center (mock reminder bot, confirmation route, logs).
11. Conflict center, versions page, admin, FAQ/contact/settings, polish, smoke test.

## Verification per checkpoint

`npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`. Fix before moving on. Update CHECKPOINTS.md.
