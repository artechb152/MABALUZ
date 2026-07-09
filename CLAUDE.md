# CLAUDE.md — project rules for מה-בלוז (Mabaluz)

## Language
- The app is Hebrew-only, RTL. Every user-facing string must be Hebrew.
- All user-facing copy lives in `src/lib/hebrewCopy.ts` — never hardcode UI strings in components.
- Code identifiers, comments, commit messages: English.
- No emojis anywhere (UI, copy, docs).
- Unavoidable technical terms (PDF, Excel) may stay Latin.

## Architecture
- Scheduling logic lives ONLY in `src/features/scheduling-engine/` as pure TypeScript. No React, no Electron, no store imports there.
- UI reads/writes data through `src/data/services/` (Promise-based mock services). Never mutate mock arrays directly from components.
- The Zustand store in `src/app/store.ts` is the in-memory database + session. Seed data comes from `src/data/mock/`.
- Keep business logic decoupled from Electron — a future web refactor must be possible.
- Domain models live in `src/types/` and are the single source of truth.

## Mock-first policy
- No real authentication (role switcher only).
- No real MongoDB, no Microsoft Graph/Outlook, no external/AI APIs, no network calls.
- Real integrations exist only as typed provider interfaces + disabled placeholders behind feature toggles.
- AI analysis appears only as a locked "בפיתוח" card.

## Security
- No hardcoded secrets, phone numbers, or emails. Use `.env.example` / `import.meta.env.VITE_*`.
- Mock data must be obviously fake (example.org emails, fake personal numbers).

## Draft/publish invariant
- Commanders edit DRAFT schedules. Soldiers see PUBLISHED only. No exception.
- Publishing archives the previous published version (retain 2).

## Workflow
- Work in small checkpoints (see CHECKPOINTS.md). After each: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. Fix failures before continuing, then update CHECKPOINTS.md.
- Any missing product detail: make a reasonable assumption and append it to ASSUMPTIONS.md. Do not ask.
- Deterministic mock data only (fixed ids; dates computed relative to today via one helper).

## UI direction
- Light mode only. Google-Calendar-inspired scheduling UX, SaaS-dashboard feel.
- Pale indigo accents, rounded cards, subtle glass panels, soft shadows, generous whitespace.
- Theme tokens live in `src/lib/theme.ts` + `tailwind.config.js` — use token classes, not ad-hoc hex values.
- Icons: placeholder components under `src/assets/icons/` (custom icons arrive later). Never emojis.
