import { AdapterError, requireEnv } from './types';

export interface RunOptions {
  /** Actor run timeout in seconds (Apify side). */
  timeoutSec?: number;
  memoryMb?: number;
  pollMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Start an Actor run, poll until it finishes, return its dataset. Survives long runs unlike run-sync. */
export async function runActor<T>(actor: string, input: unknown, opts: RunOptions = {}): Promise<T[]> {
  const token = requireEnv('APIFY_TOKEN');
  const timeoutSec = opts.timeoutSec ?? 600;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const start = await fetch(`https://api.apify.com/v2/acts/${actor}/runs?timeout=${timeoutSec}&memory=${opts.memoryMb ?? 1024}`, {
    method: 'POST', headers, body: JSON.stringify(input),
  });
  if (!start.ok) throw new AdapterError(`apify start ${start.status}: ${(await start.text()).slice(0, 200)}`, start.status === 429 || start.status >= 500, start.status === 402 || start.status === 403 ? 'quota' : 'other');
  const { data: run } = (await start.json()) as { data: { id: string; status: string; defaultDatasetId: string } };

  const deadline = Date.now() + (timeoutSec + 90) * 1000;
  let status = run.status;
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    if (Date.now() > deadline) throw new AdapterError(`apify run ${run.id} did not finish in time`, true);
    await sleep(opts.pollMs ?? 5000);
    const r = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}`, { headers });
    if (!r.ok) continue;
    status = ((await r.json()) as { data: { status: string } }).data.status;
  }
  if (status !== 'SUCCEEDED') throw new AdapterError(`apify run ${run.id} ended ${status}`, status === 'TIMED-OUT');

  const items = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true&format=json`, { headers });
  if (!items.ok) throw new AdapterError(`apify dataset ${items.status}`, true);
  return (await items.json()) as T[];
}
