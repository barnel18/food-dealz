/**
 * Loads supabase/seed/dev_deals.sql (SAMPLE data) into the database in DATABASE_URL.
 *   pnpm seed:dev
 * Refuses to run when NODE_ENV=production.
 */
import { execFileSync } from 'node:child_process';
import { config } from 'dotenv';

config({ path: '.env.local' });

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed sample data with NODE_ENV=production.');
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url || url.includes('PASSWORD') || url.includes('PROJECT')) {
  console.error('Set DATABASE_URL in .env.local first (Supabase → Project Settings → Database → Session pooler).');
  process.exit(1);
}
console.warn(`Seeding SAMPLE Madison deals into ${url.replace(/:[^:@/]+@/, ':***@')}`);
execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', 'supabase/seed/dev_deals.sql'], { stdio: 'inherit' });
