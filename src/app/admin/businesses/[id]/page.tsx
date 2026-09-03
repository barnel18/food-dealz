import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Field, Pill, btnDanger, btnGhost, btnPrimary, fmt, input } from '@/components/admin/ui';
import { addSourceAction, sourceOpAction, updateBusinessAction } from '@/lib/actions/admin';
import { dateInTz } from '@/lib/deals/dates';
import type { BusinessRow } from '@/lib/deals/types';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Business' };
const UUID = /^[0-9a-f-]{36}$/i;

interface SourceRow { id: string; type: string; url: string | null; handle: string | null; external_id: string | null; crawl_interval_hours: number; last_crawled_at: string | null; consecutive_failures: number; is_active: boolean }
interface CaptureRow { id: string; captured_at: string; extraction_status: string; extraction_error: string | null; payload: { source_url?: string | null } | null }

export default async function BusinessDetail(props: PageProps<'/admin/businesses/[id]'>) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const db = createAdminClient();
  const [{ data: b }, { data: sources }, { data: captures }, { data: dealCounts }] = await Promise.all([
    db.from('businesses').select('*, lat, lng, is_aggregator').eq('id', id).maybeSingle(),
    db.from('sources').select('*').eq('business_id', id).order('type'),
    db.from('raw_captures').select('id, captured_at, extraction_status, extraction_error, payload').eq('business_id', id).order('captured_at', { ascending: false }).limit(10),
    db.from('deals').select('status').eq('business_id', id),
  ]);
  if (!b) notFound();
  const biz = b as BusinessRow & { is_aggregator: boolean };
  const counts = ((dealCounts ?? []) as { status: string }[]).reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.status]: (acc[d.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/businesses" className="text-sm text-muted">← Businesses</Link>
        <h1 className="text-xl font-bold">{biz.name}</h1>
        <Link href={`/b/${biz.slug}`} className="text-sm text-brand hover:underline">public page ↗</Link>
        <span className="ml-auto text-xs text-muted">deals: {Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(' · ') || 'none'}</span>
      </div>

      <form action={updateBusinessAction} className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-6">
        <input type="hidden" name="id" value={biz.id} />
        <Field label="Name" className="col-span-2"><input name="name" defaultValue={biz.name} className={input} required /></Field>
        <Field label="Type"><select name="category" defaultValue={biz.category} className={input}><option value="restaurant">restaurant</option><option value="grocery">grocery</option></select></Field>
        <Field label="Chain key"><input name="chain_key" defaultValue={biz.chain_key ?? ''} className={input} /></Field>
        <Field label="Phone"><input name="phone" defaultValue={biz.phone ?? ''} className={input} /></Field>
        <Field label="Website"><input name="website_url" defaultValue={biz.website_url ?? ''} className={input} /></Field>
        <Field label="Address" className="col-span-2 sm:col-span-3"><input name="address" defaultValue={biz.address ?? ''} className={input} /></Field>
        <Field label="Lat"><input name="lat" type="number" step="any" defaultValue={biz.lat ?? ''} className={input} /></Field>
        <Field label="Lng"><input name="lng" type="number" step="any" defaultValue={biz.lng ?? ''} className={input} /></Field>
        <Field label="Featured until"><input name="featured_until" type="date" defaultValue={biz.featured_until ? dateInTz(new Date(biz.featured_until)) : ''} className={input} /></Field>
        <div className="col-span-2 flex items-center gap-4 text-xs sm:col-span-5">
          <label className="flex items-center gap-1"><input type="checkbox" name="is_active" defaultChecked={biz.is_active} /> Active</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="is_aggregator" defaultChecked={biz.is_aggregator} /> Aggregator account (deals re-attributed by hand)</label>
        </div>
        <div className="flex items-end justify-end"><button className={btnPrimary}>Save</button></div>
      </form>

      <section>
        <h2 className="mb-2 font-semibold">Sources</h2>
        <div className="space-y-2">
          {((sources ?? []) as SourceRow[]).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
              <Pill>{s.type}</Pill>
              <span className="truncate font-medium">{s.url ?? (s.handle ? `@${s.handle}` : s.external_id)}</span>
              <span className="text-xs text-muted">every {s.crawl_interval_hours}h · last {fmt(s.last_crawled_at)}</span>
              {s.consecutive_failures > 0 && <Pill tone="bad">{s.consecutive_failures} failures</Pill>}
              {!s.is_active && <Pill tone="bad">disabled</Pill>}
              <form action={sourceOpAction} className="ml-auto flex gap-1">
                <input type="hidden" name="id" value={s.id} />
                <button name="op" value="crawl" className={btnGhost}>Crawl now</button>
                <button name="op" value={s.is_active ? 'disable' : 'enable'} className={btnGhost}>{s.is_active ? 'Disable' : 'Enable'}</button>
                <button name="op" value="delete" className={btnDanger}>Delete</button>
              </form>
            </div>
          ))}
        </div>
        <form action={addSourceAction} className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-dashed border-line p-3 sm:grid-cols-6">
          <input type="hidden" name="business_id" value={biz.id} />
          <Field label="Type"><select name="type" className={input}><option value="website">website (URL)</option><option value="instagram">instagram (handle)</option><option value="kroger_api">kroger_api (locationId)</option><option value="facebook">facebook (URL)</option></select></Field>
          <Field label="URL / handle / id" className="col-span-2 sm:col-span-3"><input name="value" className={input} required /></Field>
          <Field label="Every (h)"><input name="interval" type="number" className={input} placeholder="24" /></Field>
          <div className="flex items-end gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" name="crawl_now" defaultChecked /> crawl now</label><button className={btnPrimary}>Add</button></div>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Recent captures</h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
          {((captures ?? []) as CaptureRow[]).map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2">
              <Link href={`/admin/captures/${c.id}`} className="text-muted hover:underline">{fmt(c.captured_at)}</Link>
              <Pill tone={c.extraction_status === 'done' ? 'ok' : c.extraction_status === 'failed' ? 'bad' : 'muted'}>{c.extraction_status}</Pill>
              <span className="truncate">{c.payload?.source_url ?? ''}</span>
              <span className="truncate text-xs text-muted">{c.extraction_error ?? ''}</span>
            </li>
          ))}
          {!captures?.length && <li className="px-3 py-2 text-muted">No captures yet.</li>}
        </ul>
      </section>
    </div>
  );
}
