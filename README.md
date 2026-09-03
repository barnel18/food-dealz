# Food Dealz

Every current food deal near you, from restaurants and grocery stores, compared at the item level.
Set a location and radius; see the cheapest pizza slice, fish fry, or pound of ground beef within reach.
Launch market: Madison, WI.

## Setup

Prereqs: Node 24 (`fnm use` picks it up from `.node-version`), pnpm 11.

```bash
pnpm install
cp .env.example .env.local        # then fill in the keys below
```

Accounts and keys you need (all have free tiers):

| Env var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | supabase.com → new project → Project Settings → API / Database |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_SERVER_TOKEN` | mapbox.com → Tokens |
| `APIFY_TOKEN` | console.apify.com → Settings → Integrations |
| `FIRECRAWL_API_KEY` | firecrawl.dev → API keys |
| `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET` | developer.kroger.com → create app (Pick 'n Save / Metro Market prices) |

Push the database schema and generate types:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <your-project-ref>
pnpm db:push
pnpm db:types
```

Make yourself an admin (Supabase SQL editor, after your first login to the app):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Run it:

```bash
pnpm dev            # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test
```

## Layout

```
src/app/                    routes (App Router)
src/lib/taxonomy/           canonical item taxonomy (source of truth)
src/lib/extraction/         Claude structured extraction (Phase 2)
src/lib/adapters/           scrapers: websites, Instagram, Kroger, Flipp (Phase 2)
worker/                     job runner for crawl / extract / expire (Phase 2)
supabase/migrations/        schema, RLS, RPC functions, taxonomy seed
scripts/                    seeding + codegen
```

## Scripts

- `pnpm taxonomy:gen [version]` regenerates the `canonical_items` seed migration from the TypeScript taxonomy.
- `pnpm db:push` applies migrations to the linked Supabase project; `pnpm db:types` regenerates `src/lib/supabase/types.ts`.
