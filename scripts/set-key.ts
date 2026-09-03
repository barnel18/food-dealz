/**
 * Save an API key into .env.local without opening the file or pasting it into chat.
 *
 *   pnpm key ANTHROPIC_API_KEY      # prompts for one key (what you paste is shown on screen)
 *   pnpm key                        # walks through every key that is still empty; Enter skips
 *
 * Pasted values are visible while you type (fine on your own machine) and never written anywhere but .env.local.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const FILE = '.env.local';

const KNOWN: Record<string, { hint: string; prefix?: string; url: string }> = {
  ANTHROPIC_API_KEY: { hint: 'Claude — reads scraped posts and turns them into structured deals', prefix: 'sk-ant-', url: 'https://console.anthropic.com/settings/keys' },
  APIFY_TOKEN: { hint: 'Apify — runs the Instagram scraper', prefix: 'apify_api_', url: 'https://console.apify.com/settings/integrations' },
  FIRECRAWL_API_KEY: { hint: 'Firecrawl — fetches restaurant web pages as clean text', prefix: 'fc-', url: 'https://www.firecrawl.dev/app/api-keys' },
  KROGER_CLIENT_ID: { hint: 'Kroger — official prices for Pick ’n Save / Metro Market', url: 'https://developer.kroger.com/manage/apps' },
  KROGER_CLIENT_SECRET: { hint: 'Kroger — the secret that pairs with the client ID', url: 'https://developer.kroger.com/manage/apps' },
  NEXT_PUBLIC_MAPBOX_TOKEN: { hint: 'Mapbox — address search (public token)', prefix: 'pk.', url: 'https://account.mapbox.com/access-tokens/' },
  MAPBOX_SERVER_TOKEN: { hint: 'Mapbox — same public token is fine here', prefix: 'pk.', url: 'https://account.mapbox.com/access-tokens/' },
  SUPABASE_DB_PASSWORD: { hint: 'Supabase database password (the one you set when creating the project). DATABASE_URL is built from it automatically.', url: 'https://supabase.com/dashboard/project/bsdtucwqxbjypnvkrvyt/settings/database' },
};

function readEnv(): string {
  if (!existsSync(FILE)) throw new Error(`${FILE} not found — run from the project folder`);
  return readFileSync(FILE, 'utf8');
}

function currentValue(env: string, name: string): string {
  const m = env.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return m ? m[1].replace(/^"|"$/g, '') : '';
}

function isPlaceholder(v: string): boolean {
  return v === '' || /YOUR-|PASSWORD|PROJECT/.test(v);
}

function setValue(env: string, name: string, value: string): string {
  const line = `${name}=${value}`;
  return new RegExp(`^${name}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${name}=.*$`, 'm'), line) : `${env.trimEnd()}\n${line}\n`;
}

function mask(v: string): string {
  return v.length <= 10 ? '••••' : `${v.slice(0, 6)}…${v.slice(-4)}`;
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      // strip bracketed-paste markers some terminals add around pasted text
      resolve(answer.replace(/\x1b\[20[01]~/g, '').trim());
    });
  });
}

async function setOne(name: string, env: string): Promise<string> {
  const info = KNOWN[name];
  const existing = currentValue(env, name);
  console.log(`\n${name}${info ? ` — ${info.hint}` : ''}`);
  if (info) console.log(`  get it at: ${info.url}`);
  console.log(`  currently: ${isPlaceholder(existing) ? 'not set' : mask(existing)}`);
  let value = await ask('  paste it here and press Enter (Enter alone = skip): ');
  if (!value) {
    console.log('  skipped');
    return env;
  }
  if (info?.prefix && !value.startsWith(info.prefix)) {
    console.log(`  warning: expected this to start with "${info.prefix}" — saved anyway, double-check it`);
  }
  // Common slip: pasting the whole connection string instead of the password. Pull the password out.
  if (name === 'SUPABASE_DB_PASSWORD' && /^postgres(ql)?:\/\//.test(value)) {
    const m = value.match(/^postgres(?:ql)?:\/\/[^:]+:([^@]*)@/);
    const inner = m ? decodeURIComponent(m[1]) : '';
    if (!inner || /YOUR-PASSWORD|\[.*\]/.test(inner)) {
      console.log('  that is a connection string with a [YOUR-PASSWORD] placeholder — paste just the password');
      return env;
    }
    value = inner;
    console.log('  you pasted a connection string; extracted the password from it');
  }
  let next = setValue(env, name, value);
  if (name === 'SUPABASE_DB_PASSWORD') {
    const url = `postgresql://postgres.bsdtucwqxbjypnvkrvyt:${encodeURIComponent(value)}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;
    next = setValue(next, 'DATABASE_URL', url);
    console.log('  also wrote DATABASE_URL with the password filled in');
  }
  writeFileSync(FILE, next);
  console.log(`  saved ${name} = ${mask(value)}`);
  return next;
}

async function main() {
  let env = readEnv();
  const arg = process.argv[2];
  if (arg) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(arg)) throw new Error(`"${arg}" is not a valid variable name (use UPPER_SNAKE_CASE)`);
    await setOne(arg, env);
    return;
  }
  const missing = Object.keys(KNOWN).filter((k) => isPlaceholder(currentValue(env, k)));
  if (missing.length === 0) {
    console.log('Every known key is already set. Use `pnpm key NAME` to replace one.');
    return;
  }
  console.log(`${missing.length} key(s) still empty. Press Enter to skip any you don’t have yet.`);
  for (const k of missing) env = await setOne(k, env);
  console.log('\nDone. Keys live only in .env.local (gitignored). Tell Claude which ones you added so they get synced to Vercel if needed.');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
