import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pill, btnPrimary, fmt } from '@/components/admin/ui';
import { rerunExtractionAction } from '@/lib/actions/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Capture' };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function CapturePage(props: PageProps<'/admin/captures/[id]'>) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const db = createAdminClient();
  const [{ data }, { data: deals }] = await Promise.all([
    db.from('raw_captures').select('*, business:businesses(id,name)').eq('id', id).maybeSingle(),
    db.from('deals').select('id,title,status,price,extraction_confidence').eq('source_capture_id', id),
  ]);
  if (!data) notFound();
  const c = data as { id: string; captured_at: string; posted_at: string | null; extraction_status: string; extraction_error: string | null; extraction_model: string | null; extraction_tokens: number | null; content_text: string | null; image_urls: string[]; payload: Record<string, unknown>; business: { id: string; name: string } | null };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {c.business && <Link href={`/admin/businesses/${c.business.id}`} className="font-medium hover:underline">{c.business.name}</Link>}
        <Pill tone={c.extraction_status === 'done' ? 'ok' : c.extraction_status === 'failed' ? 'bad' : 'muted'}>{c.extraction_status}</Pill>
        <span className="text-muted">captured {fmt(c.captured_at)}{c.posted_at ? ` · posted ${fmt(c.posted_at)}` : ''}</span>
        {c.extraction_model && <span className="text-muted">· {c.extraction_model}{c.extraction_tokens ? ` · ${c.extraction_tokens} tokens` : ''}</span>}
        <form action={rerunExtractionAction} className="ml-auto"><input type="hidden" name="id" value={c.id} /><button className={btnPrimary}>Re-run extraction</button></form>
      </div>
      {c.extraction_error && <p className="rounded-lg bg-brand-soft p-2 text-xs">{c.extraction_error}</p>}
      <div>
        <h2 className="mb-1 text-sm font-semibold">Deals from this capture ({deals?.length ?? 0})</h2>
        <ul className="text-sm">{((deals ?? []) as { id: string; title: string; status: string; price: number | null; extraction_confidence: number | null }[]).map((d) => <li key={d.id}>· {d.title} — {d.status}{d.price != null ? ` · $${d.price}` : ''}{d.extraction_confidence != null ? ` · conf ${d.extraction_confidence}` : ''}</li>)}</ul>
      </div>
      {c.image_urls?.length ? <div className="flex flex-wrap gap-2">{c.image_urls.map((u) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u} src={u} alt="" className="h-40 rounded-lg object-cover" />
      ))}</div> : null}
      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-line bg-surface p-3 text-xs">{c.content_text}</pre>
      <details className="text-xs"><summary className="cursor-pointer text-muted">payload</summary><pre className="overflow-auto rounded-lg bg-surface-2 p-2">{JSON.stringify(c.payload, null, 2)}</pre></details>
    </div>
  );
}
