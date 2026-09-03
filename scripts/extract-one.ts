/** Run extraction for one capture right now (bypasses the queue). pnpm extract:one <captureId> */
import { loadEnv } from '../worker/env';
loadEnv();
import { createServiceClient } from '../src/lib/supabase/service-client';
import { handleExtractCapture } from '../worker/handlers/extract-capture';

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error('usage: pnpm extract:one <captureId>');
  const db = createServiceClient();
  await db.from('raw_captures').update({ extraction_status: 'pending', extraction_error: null }).eq('id', id);
  console.log(await handleExtractCapture(db, { capture_id: id }));
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
