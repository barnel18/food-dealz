import { defineRailway, github, preserve, project, service } from "railway/iac";

// Food Dealz job worker (worker/index.ts): polls the Supabase `jobs` table 24/7.
// The web app lives on Vercel; this Railway project only hosts the worker.
// Change settings here, then: `npx @railway/cli config plan` → `npx @railway/cli config apply`.
// Variables are managed with `bash scripts/railway-env.sh --service worker` (from .env.local); `preserve()` keeps them out of this file.
export default defineRailway(() => {
  const worker = service("worker", {
    source: github("barnel18/food-dealz", { branch: "main" }),
    build: {
      builder: "RAILPACK",
      // tsx runs the TypeScript directly; never run `next build` for the worker.
      buildCommand: "echo 'worker: no build step'",
    },
    deploy: {
      startCommand: "pnpm worker:dev",
      restartPolicyType: "ALWAYS",
    },
    replicas: { "us-east4-eqdc4a": 1 },
    env: {
      ADMIN_EMAILS: preserve(), ANTHROPIC_API_KEY: preserve(), APIFY_TOKEN: preserve(),
      EXTRACTION_AUTO_APPROVE_THRESHOLD: preserve(), EXTRACTION_EFFORT: preserve(), EXTRACTION_MODEL: preserve(),
      FIRECRAWL_API_KEY: preserve(), FLIPP_ENABLED: preserve(), KROGER_CLIENT_ID: preserve(), KROGER_CLIENT_SECRET: preserve(),
      LAUNCH_BBOX: preserve(), LAUNCH_CENTER_LAT: preserve(), LAUNCH_CENTER_LNG: preserve(), LAUNCH_CITY: preserve(),
      LAUNCH_CITY_SLUG: preserve(), LAUNCH_RADIUS_KM: preserve(), LAUNCH_TZ: preserve(),
      MAPBOX_SERVER_TOKEN: preserve(), NEXT_PUBLIC_APP_URL: preserve(), NEXT_PUBLIC_MAPBOX_TOKEN: preserve(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: preserve(), NEXT_PUBLIC_SUPABASE_URL: preserve(), NODE_ENV: preserve(),
      RAILPACK_BUILD_CMD: preserve(), RAILPACK_START_CMD: preserve(), SUPABASE_SERVICE_ROLE_KEY: preserve(),
      WORKER_BATCH: preserve(), WORKER_POLL_MS: preserve(),
    },
  });

  return project("food-dealz", {
    resources: [worker],
  });
});
