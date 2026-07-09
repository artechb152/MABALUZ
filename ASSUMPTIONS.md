# ASSUMPTIONS

Running log of product/technical assumptions made without asking. Newest last.

1. **Build tooling**: `electron-vite` is used to bundle main/preload/renderer instead of hand-rolled concurrently+wait-on scripts. It keeps the spec's `electron/main`, `electron/preload` layout via config.
2. **Router**: HashRouter instead of BrowserRouter so routes work under `file://` in a packaged Electron app.
3. **Tailwind 3.x** (not 4.x) for the classic, well-documented config format and stable RTL behavior.
4. **UI kit**: instead of installing shadcn/ui (heavy generator workflow), a small in-repo Radix-style component set is written under `src/components/` with the same look-and-feel goals.
5. **Fonts**: no external font fetching (future classified/offline network). System Hebrew stack: `"Segoe UI", "Assistant", "Rubik", "Heebo", Arial, sans-serif`.
6. **Lint**: ESLint flat config with typescript-eslint recommended + react-hooks. `lint` script exists from checkpoint 0.
7. **IDs/timestamps in mock data** are deterministic literals so tests and demos are reproducible.
8. **Personal numbers** in mock data are obviously fake (7-digit starting 90000xx).
9. **Time model**: all times are `"HH:mm"` strings on a 15-minute grid; dates are `"yyyy-MM-dd"` strings. Timezone-free by design (single-base usage).
10. **Saturday**: default disabled except the configurable 19:15-20:00 post-Shabbat slot; no automatic Shabbat-end calculation (per spec).
11. **Guest-lecture reserve** when no imported data exists: default 2 blocks of 90 minutes in the last week of the training, commander-overridable. Documented in engine.
12. **Version retention**: exactly current published + 2 previous; older versions are dropped silently.
13. **Soldier next-week visibility**: controlled by `allowSoldiersToSeeNextWeek`; default true in mock settings.
14. **Attendance for יום גיבוש**: modeled as a field but UI is a small optional toggle only (future feature per spec).
15. **PDF export**: v1 ships a UI placeholder + print-based export foundation (browser print to PDF of the schedule view); full styled PDF generation is a TODO.
16. **Display mode (תצוגה להקרנה)**: implemented as a full-screen read-only weekly view route.
17. **Excel parsing**: assumes days in columns (ראשון..שבת), first column = times in rows, 15-min or hourly rows; merged cells handled best-effort by forward-filling; cell colors ignored.
18. **Mock "now"**: the app treats the real system date as now; seed trainings are generated relative to today so dashboards always show live-looking data.
19. **Shared-event approval**: approval requests expire when the proposed date passes; expired requests are labeled פג תוקף and do not apply.
20. **Notifications**: in-app only (bell in topbar) backed by the store; no OS notifications in v1.
21. **Support phone**: read from `VITE_SUPPORT_PHONE` (see `.env.example`); UI shows a neutral fallback text if unset.
22. **Environment file**: Vite exposes only `VITE_*` vars to the renderer; all mock-mode flags default to safe values without any .env present.
23. **Month view**: read-only foundation (event chips per day, click opens editor); no drag/drop in month view v1.
24. **Resize by edge**: v1 edits duration via the event modal; visual edge-resize is a TODO (per spec's fallback permission).
25. **Feature-local copy**: strings unique to one feature live in a `copy.ts` inside that feature directory; `src/lib/hebrewCopy.ts` remains the shared dictionary. Same Hebrew-only rule applies.
26. **Shared-change application**: when every commander approves a shared-event change, it is applied to each linked training's DRAFT (not directly to published) and each commander is notified to publish — preserving the draft/publish invariant.
27. **Rejected shared change**: any rejection marks the request "שינוי תקוע" (stuck) and surfaces the pending commanders' phone numbers; there is no auto-retry.
28. **Peak-day overrides**: continuing past the override warning keeps the overlapped events in the draft (as conflicts to resolve via the conflict center) rather than silently deleting them.
29. **Editing locked events**: locked events cannot be dragged; editing them through the event modal is the explicit "override flow" for commanders.
30. **Wizard generation**: the create-training wizard can generate immediately using default reserve values (no imported template yet); import can be attached later and regeneration re-run from the builder.
31. **PDF export v1**: the "ייצוא ל-PDF" button uses the browser/Electron print dialog (print-to-PDF); styled PDF generation is a future TODO.
32. **Publish override**: publishing with BLOCKING conflicts requires ticking an explicit "אישור חריג של המפקד" checkbox in the publish flow (per spec's manual-confirmation requirement).

## Patch 1 — design system, login, soldier polish, calendar (2026-07-08)

33. **Brand**: the app wordmark is **MABALUZ** (Latin, Cherry Bomb One), rendered by `src/components/Wordmark.tsx`. It replaces the old "מב" box + "מה-בלוז" text everywhere it was the product mark (sidebar, login, demo picker, projection, lecturer confirmation, email sender line). All other copy stays Hebrew. `app.name` is now `'MABALUZ'`.
34. **Fonts**: self-hosted via `@fontsource/{assistant,heebo,cherry-bomb-one}` (no CDN, offline-safe), imported in `src/main.tsx`.
35. **Type tiers** (four, fixed, via `.t-display/.t-subhead/.t-body/.t-detail` in `index.css`): Heebo 26/500 · Assistant 20/600 · Assistant 16/400 · Assistant 13/500. `PageHeader`, dashboard `SectionCard`/`EventRow`, and the calendar use them; other feature pages still carry legacy `text-sm/xs` and will be migrated in later per-role passes.
36. **Palette**: app shell is warm mono (`#FFFCF2/#CCC5B9/#403D39/#252422`) + one indigo accent (`#4F46E5`, soft `#E9E7FC`). The five rich colors `#C81D4B/#CC4800/#0F766E/#185FA5/#7209B7` are used ONLY inside calendar blocks (white titles). Token KEYS were kept and only VALUES changed, so most components repainted for free.
37. **Status colors**: danger/warning/success reuse crimson/orange/teal as thin accents (borders, text, icons). `Badge` renders status tones as outline (no fill). Callout `-soft` tokens are whisper-faint 6% tints (kept to avoid a 30-file sweep) — effectively tinted-cream, not saturated fills.
38. **Buttons**: `Button` primary = graphite→indigo skew-wipe (adamgiebl); `publish` variant = dark arrow-slide (Peary74) used for פרסם; `loading` prop shows a spinner and disables (wired on publish/generate-apply/import/reminders). Consistent radius/height across variants. (Bugfix: action-button content is wrapped in a positioned span so the label sits above the `::before` overlay.)
39. **Entry flow**: `/` = cosmetic `LoginScreen` (login/register/forgot tabs; nothing persisted) with a "דלג על ההתחברות" button → `/select-account` (the demo picker, formerly at `/`) → app. Admin area has a "PREVIEW — מסך התחברות" button → `/`.
40. **Soldier role**: label is now "חייל בהכשרה"; FAQ + contact removed from the soldier sidebar; dashboard drops the redundant header button (kept only the in-card link + sidebar); "ההכשרה שלי" is compact with `label - value` rows and "הערות המפקד" beneath it.
41. **Calendar**: two-part blocks (colored header + white detail strip); stronger 2px day dividers; `useNow()` drives a live red now-line + current-block ring; `hideHardIndicators` (soldier) hides lock/eye-off but keeps the shared marker; soldier click-details shows which training a shared block/lecture is shared with.
42. **Drag/drop**: swap-based (`scheduleService.swapDraftEvents`). Dropping a flexible block on another swaps them; the hovered target lifts (translateY + ring). Locked/full-day blocks are fixed; empty-slot drops relocate; occupied-slot drops swap — so blocks can never overlap/stack. Publish keeps the override escape-hatch (unchanged, per user decision).
43. **Grid density**: `PX_PER_HOUR` raised 48→60 for more breathing room.
44. **Deferred to later patches**: applying the four type tiers to every non-soldier page, and per-role dashboard restructuring for commander/senior/admin (this patch did global tokens + the soldier role only).
