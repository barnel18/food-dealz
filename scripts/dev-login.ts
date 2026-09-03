/**
 * Print a one-time sign-in link for local development (no email needed).
 *   pnpm dev:login you@example.com [http://localhost:3000] [/admin]
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { createServiceClient } from '../src/lib/supabase/service-client';

async function main() {
  const [email, base = 'http://localhost:3000', next = '/admin'] = process.argv.slice(2);
  if (!email) throw new Error('usage: pnpm dev:login <email> [baseUrl] [nextPath]');
  const db = createServiceClient();
  const { error: createErr } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (createErr && !/already|exists/i.test(createErr.message)) throw createErr;
  const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const token = data.properties?.hashed_token;
  if (!token) throw new Error('no token returned');
  console.log(`${base}/auth/confirm?token_hash=${token}&type=magiclink&next=${encodeURIComponent(next)}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
