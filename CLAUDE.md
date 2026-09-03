@AGENTS.md

# Food Dealz — project notes

Local food deal aggregator: restaurants + grocery within a radius, item-level "cheapest X near me". Launch market is **Madison, WI**.
Full v1 plan (architecture, schema rationale, phases, verification): `/Users/lucas/.claude/plans/my-imagination-for-this-squishy-pony.md`.

## Stack
- Next.js 16 App Router (Turbopack), TypeScript, Tailwind v4. **Read `node_modules/next/dist/docs/` before writing Next code** (see AGENTS.md block above; APIs differ from training data).
- Supabase: Postgres + PostGIS + pg_trgm, Auth, RLS. Migrations in `supabase/migrations/`. The CLI is a dev dependency: use `pnpm exec supabase …` (Homebrew build fails on this Mac).
- Node 24 via fnm (`.node-version`). pnpm 11: packages that need build scripts must be allow-listed in `pnpm-workspace.yaml` (`allowBuilds`).
- Deal extraction: Claude `claude-opus-5`, structured outputs (`output_config.format` / `client.messages.parse()`), `effort: low`, Message Batches for bulk, server-side refusal fallbacks on. Load the `claude-api` skill before editing `src/lib/extraction/`.
- Jobs: Postgres `jobs` table + `claim_jobs()` (FOR UPDATE SKIP LOCKED); a long-lived Node worker in `worker/` (local during dev, Railway at launch).

## Commands
- `pnpm dev` / `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test`
- `pnpm taxonomy:gen [version]` — regenerate the `canonical_items` seed migration after editing `src/lib/taxonomy/canonical-items.ts`. Use a new timestamp once the previous seed migration has been applied.
- `pnpm db:push` / `pnpm db:types` — after `pnpm exec supabase link --project-ref <ref>`.

## Conventions
- `src/lib/taxonomy/canonical-items.ts` is the single source of truth for items. Never hand-edit the generated seed migration.
- Migrations are `YYYYMMDDHHMMSS_name.sql`. Never edit an applied migration; add a new one.
- Prices are `numeric(10,2)`. `deals.unit_price` is per the item's `comparable_unit`; `null` when not computable (excluded from leaderboard, still shown in feed).
- Deal windows are interpreted in `America/Chicago`.
- Browser/RSC code goes through RLS with the anon key. Worker, scripts, and admin mutations use the service role. `SUPABASE_SERVICE_ROLE_KEY` never reaches the client bundle.
- Extraction hallucination gate: every price must appear verbatim in the captured text (or carry an `evidence_quote` and go to manual review). Do not relax it.
- Env: copy `.env.example` → `.env.local`. Launch-market values (`LAUNCH_*`) are already set for Madison.
