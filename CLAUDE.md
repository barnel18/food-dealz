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
- `pnpm dev` / `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test` (vitest: unit-price, kroger size parsing, postprocess)
- `pnpm worker:dev` (poll jobs forever) / `pnpm worker:once` (drain queue, exit) — the pipeline only moves while a worker runs (locally or on Railway via `railway.json`).
- `pnpm crawl:enqueue [sourceId]` — queue crawls now. `pnpm kroger:sync [zip] [miles]` — upsert Kroger-banner stores + price-feed sources.
- `pnpm osm:seed [--from-file f]` — seed every restaurant/bar/cafe/grocery in the bbox from OpenStreetMap (website sources for independents, weekly). `pnpm flipp:sync [zip]` — one Flipp weekly-ad source per grocery chain (fans out to every store via `chain_key`). `pnpm logos:fetch [--all]` — store logos/photos from site icons into the `logos` bucket.
- `pnpm discover:instagram [tags…]` / `pnpm discover:reddit [--from-file f]` — find Madison food businesses; inserted INACTIVE for review at `/admin/businesses?status=inactive`. Apify free tier is $5/mo — cap result counts.
- `pnpm key [NAME]` — save an API key into `.env.local` from a terminal prompt (`SUPABASE_DB_PASSWORD` also builds `DATABASE_URL`). `pnpm dev:login <email> [base] [next]` — one-time sign-in link, no email needed.
- `pnpm taxonomy:gen [version]` — regenerate the `canonical_items` seed migration after editing `src/lib/taxonomy/canonical-items.ts`. Use a new timestamp once the previous seed migration has been applied.
- `pnpm db:push` / `pnpm db:types` / `pnpm db:query "<sql>"` — project ref is pinned in the scripts. If `db push` fails on the DB password, apply a migration with `pnpm db:query -f supabase/migrations/<file>.sql` (Management API) and fix the keyring later via `supabase link -p`.

## Production
- https://fooddealz.site (Vercel project `food-dealz`, team `barnes-inc1`; GitHub `barnel18/food-dealz` auto-deploys `main`; manual: `vercel deploy --prod --yes`). Deployment Protection is on, so `*.vercel.app` URLs need a Vercel login; the custom domain is public.
- Supabase ref `bsdtucwqxbjypnvkrvyt`; auth redirect URLs live in `supabase/config.toml` (`supabase config push`).
- Admin: `/admin` (email in `ADMIN_EMAILS` or `profiles.role='admin'`). Website/Kroger/portal deals auto-approve when checks pass; Instagram always goes to review.

## Conventions
- `src/lib/taxonomy/canonical-items.ts` is the single source of truth for items. Never hand-edit the generated seed migration.
- Migrations are `YYYYMMDDHHMMSS_name.sql`. Never edit an applied migration; add a new one.
- Prices are `numeric(10,2)`. `deals.unit_price` is per the item's `comparable_unit`; `null` when not computable (excluded from leaderboard, still shown in feed).
- Deal windows are interpreted in `America/Chicago`.
- Browser/RSC code goes through RLS with the anon key. Worker, scripts, and admin mutations use the service role. `SUPABASE_SERVICE_ROLE_KEY` never reaches the client bundle.
- Sources: `website` (Firecrawl, adaptive interval up to 30d when dry), `instagram` (Apify), `kroger_api` (per store), `flipp` (per chain, fan-out). Deal photos: `deals.image_url` (Kroger/Flipp product images, Instagram post image); business logos/photos in Storage bucket `logos`.
- Extraction hallucination gate: every price must appear verbatim in the captured text (or carry an `evidence_quote` and go to manual review). Do not relax it.
- Env: copy `.env.example` → `.env.local`. Launch-market values (`LAUNCH_*`) are already set for Madison.
