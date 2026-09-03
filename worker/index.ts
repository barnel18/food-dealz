/**
 * Food Dealz worker: polls the `jobs` table and runs crawls, extractions, and the expiry sweep.
 *   pnpm worker:dev            # keep running
 *   pnpm worker:once           # one pass (schedule + drain queue), then exit
 */
import { loadEnv } from './env';
loadEnv();

import { AdapterError } from '@/lib/adapters';
import { ExtractionError } from '@/lib/extraction/extract';
import { createServiceClient } from '@/lib/supabase/service-client';
import { handleCrawlSource } from './handlers/crawl-source';
import { handleExpireSweep } from './handlers/expire-sweep';
import { handleExtractCapture } from './handlers/extract-capture';
import { claimJobs, completeJob, enqueueJob, rpcNumber, type JobRow } from './queue';

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 5000);
const BATCH = Number(process.env.WORKER_BATCH ?? 5);
const SCHEDULE_EVERY_MS = 60_000;
const SWEEP_EVERY_MS = 60 * 60_000;
const ONCE = process.env.WORKER_ONCE === '1' || process.argv.includes('--once');

const db = createServiceClient();
let running = true;
process.on('SIGINT', () => { running = false; });
process.on('SIGTERM', () => { running = false; });

const log = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runJob(job: JobRow): Promise<void> {
  const started = Date.now();
  try {
    let result: string;
    switch (job.type) {
      case 'crawl_source': result = await handleCrawlSource(db, job.payload); break;
      case 'extract_capture': result = await handleExtractCapture(db, job.payload); break;
      case 'expire_sweep': result = await handleExpireSweep(db); break;
      default: throw new Error(`unknown job type ${job.type}`);
    }
    await completeJob(db, job.id, true);
    log(`job ${job.id} ${job.type} ok (${Date.now() - started}ms): ${result}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const permanent = (e instanceof AdapterError || e instanceof ExtractionError) && !e.retryable;
    // Non-retryable failures burn the remaining attempts so they surface in admin immediately.
    await completeJob(db, job.id, false, permanent ? `[permanent] ${msg}` : msg);
    if (permanent) await db.from('jobs').update({ status: 'failed', locked_at: null, finished_at: new Date().toISOString() }).eq('id', job.id);
    log(`job ${job.id} ${job.type} FAILED${permanent ? ' (permanent)' : ''}: ${msg}`);
  }
}

async function schedule(): Promise<void> {
  const [stale, crawls, extracts] = await Promise.all([
    db.rpc('requeue_stale_jobs').then((r) => Number(r.data ?? 0)),
    rpcNumber(db, 'enqueue_due_crawls'),
    rpcNumber(db, 'enqueue_pending_extractions'),
  ]);
  if (stale || crawls || extracts) log(`schedule: requeued ${stale}, crawls ${crawls}, extractions ${extracts}`);
}

async function main(): Promise<void> {
  log(`worker starting (batch ${BATCH}, poll ${POLL_MS}ms${ONCE ? ', once' : ''})`);
  let lastSchedule = 0;
  let lastSweep = 0;
  while (running) {
    const now = Date.now();
    if (now - lastSchedule > SCHEDULE_EVERY_MS) { await schedule(); lastSchedule = now; }
    if (now - lastSweep > SWEEP_EVERY_MS) { await enqueueJob(db, 'expire_sweep', {}); lastSweep = now; }
    const jobs = await claimJobs(db, BATCH);
    if (jobs.length === 0) {
      if (ONCE) break;
      await sleep(POLL_MS);
      continue;
    }
    await Promise.all(jobs.map(runJob)); // jobs in a batch run concurrently (BATCH controls parallelism)
  }
  log('worker stopped');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
