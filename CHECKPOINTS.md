# CHECKPOINTS — live status

| # | Checkpoint | Status | typecheck | lint | test | build |
|---|-----------|--------|-----------|------|------|-------|
| 0 | Project setup (electron-vite, Tailwind, RTL, theme, role switcher, planning files) | DONE | PASS | PASS | n/a | PASS |
| 1 | Data models + mock data + mock services + store | DONE | PASS | PASS | PASS (17) | PASS |
| 2 | Layout + dashboards (4 roles) | DONE | PASS | PASS | n/a | PASS |
| 3 | Weekly schedule UI | DONE | PASS | PASS | n/a | PASS |
| 4 | Event editor | DONE | PASS | PASS | n/a | PASS |
| 5 | Scheduling engine + tests | DONE | PASS | PASS | PASS (13) | PASS |
| 6 | Generate schedule flow + wizard + publish | DONE | PASS | PASS | n/a | PASS |
| 7 | Excel import architecture | DONE | PASS | PASS | PASS (6) | PASS |
| 8 | Shared events | DONE | PASS | PASS | PASS (services) | PASS |
| 9 | Peak days | DONE | PASS | PASS | n/a | PASS |
| 10 | Guest lecturers + message center | DONE | PASS | PASS | PASS (5) | PASS |
| 11 | Conflict center, versions, admin, FAQ, polish | DONE | PASS | PASS | PASS (41 total) | PASS |

Final verification (2026-07-07): `npm run typecheck` PASS, `npm run lint` PASS, `npm run test` 41/41 PASS, `npm run build` PASS. Live browser smoke test (Vite dev + Playwright) passed: entry, commander dashboard, weekly builder (RTL grid, drag-locked hard events), event editor, publish flow step 1-2, soldier preview (published-only), message center (reminder sent + logged in Hebrew), sample Excel import (parse + learn + review), all other routes render without page errors.

## Patch 1 — design system, login, soldier polish, calendar (2026-07-08) — DONE

Verification: typecheck PASS, lint PASS, tests 41/41 PASS, build PASS. Live Playwright smoke: login screen (MABALUZ wordmark, cream+indigo, 4 type tiers) → skip → demo picker → soldier dashboard (new layout, no redundant button, `-` rows, "הערות המפקד" beneath) → soldier calendar (two-part blocks, rich palette, no lock icons) → commander builder (lock icons visible, styled action + publish buttons) → publish flow (Peary74 publish button) → admin PREVIEW → back to login. See ASSUMPTIONS.md #33–44.
- Global: MABALUZ wordmark, self-hosted fonts, four type tiers, two-palette repaint, reworked Button (action/publish/loading) + outline Badge.
- Login flow: cosmetic LoginScreen at `/`, demo picker at `/select-account`, admin PREVIEW → `/`.
- Soldier role: "חייל בהכשרה", FAQ/contact hidden, dashboard restructured.
- Calendar (shared): two-part blocks, live now-line + current-block highlight, role-aware indicators, shared-with detail, swap-based Lego drag/drop (`swapDraftEvents`).
- Deferred to next patches: type-tier migration on non-soldier pages; per-role dashboard restructuring for commander/senior/admin.

## Notes per checkpoint

### Checkpoint 0
- electron-vite 5 + Vite 7 + React 19 + TS 6 + Tailwind 3.4. RTL `index.html`, theme tokens, glass styles, role-switcher entry screen, session store, guarded routes.
- Fixes: TS6 deprecates `baseUrl` (relative `paths`); lint script `eslint .`; standalone `vite.config.ts` so `dev:web` resolves the `@` alias.

### Checkpoint 1
- Zustand `useDb` in-memory database seeded from `src/data/mock/` (users, 2 trainings, programmatic schedules with shared/guest/peak specials, lecturers, shared group + pending change request, FAQ, presets, toggles).
- Services: user, training (role-scoped visibility), schedule (draft/publish/versions/revert-safety), lecturer (add/cancel/confirm-by-token), shared events (create/link/change-request/approve/stuck/expire), notifications, admin, import.

### Checkpoint 5 (pulled ahead of 2-4 — pure engine, feature UIs depend on it)
- `src/features/scheduling-engine/`: constraints (day windows, meal windows, reserve), scheduler (hard-first placement: shared -> peak -> guest -> reserve -> meals -> imported flexible -> manual flexible; balanced least-loaded-day spread; impossible-items reporting), conflictDetector, impactReport (id + title/type matching, shared-change approvals, canUndo), suggestions (auto-fix, manual, full not-enough-time menu). Deterministic.

### Checkpoints 2-4, 6-11 (feature build-out)
- Schedule module: reusable `WeekGrid` (RTL 7-day, 15-min proportional blocks, dnd-kit drag/drop with hard-event and locked-day guards, lock/shared/hidden icons, legend), `EventEditorModal`, `PublishFlow` (conflicts -> impact -> confirm; override checkbox for blocking conflicts), `GenerateFlow` (engine preview -> apply to draft), soldier page (published-only + next-week gate + basic-details-only), month view foundation, projection display mode.
- Dashboards per role (soldier read-only, commander stats+quick actions, senior SaaS cards, admin).
- Excel import: browser parser (merged-cell fill, block coalescing), rule-based learner (confidence, type heuristics, guest-lecture average, meal patterns), review table, sample generator (`npm run generate:sample-excel` -> public/sample-excel), locked AI card.
- Shared events: create modal (active trainings at base + search + unsynced), link approvals, change requests (approve/reject/stuck/expired), contacts modal.
- Peak days: full-day creation with dropdown types, override warnings (guest lecture / shared / generic), visibility controls.
- Guest lecturers: lecturer DB, add-lecture modal (search-or-create, warn-before options), guided cancel flow, mock confirmation route; message center: Hebrew email templates, Mock/Outlook providers, 24h reminder + thank-you + no-confirmation-warning scheduler, log UI.
- Conflict center (severity, suggestions, auto-fix move-to-free-slot), versions (retention labels, safe-revert gating, compare via impact report), trainings list + presets placeholder, 6-step creation wizard with generation, admin (users/trainings/toggles/approvals/FAQ editor/logs/settings), FAQ accordion, contact (env phone), training settings page.
- Post-review fixes: react-hooks set-state-in-effect (3 components restructured to mount-time init), tiny-block text rendering in WeekGrid, favicon.
