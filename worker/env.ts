import { existsSync } from 'node:fs';
import { config } from 'dotenv';

/** Local runs read .env.local; on Railway/Vercel the platform injects variables. */
export function loadEnv(): void {
  if (existsSync('.env.local')) config({ path: '.env.local' });
}
