import Link from 'next/link';
import { reviewDealAction } from '@/lib/actions/admin';
import { dateInTz } from '@/lib/deals/dates';
import { formatUnitPrice, sourceLabel } from '@/lib/deals/format';
import type { DealRow, SourceType } from '@/lib/deals/types';
import { CANONICAL_ITEMS, CANONICAL_ITEM_BY_SLUG, type BusinessCategory } from '@/lib/taxonomy/canonical-items';
import { Field, Pill, btnDanger, btnGhost, btnPrimary, fmt, input } from './ui';

export type ReviewDeal = DealRow & {
  business: { id: string; name: string; slug: string; category: BusinessCategory } | null;
  capture: { content_text: string | null; image_urls: string[]; payload: { source_url?: string | null } | null; posted_at: string | null } | null;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEAL_TYPES = ['fixed_price', 'bundle', 'percent_off', 'amount_off', 'bogo', 'free_item'];
const UNITS = ['each', 'slice', 'lb', 'oz', 'kg', 'g', 'dozen', 'pack', 'gallon', 'liter', 'fl_oz'];

function excerpt(text: string | null, quote: string | null): string {
  if (!text) return '';
  if (quote) {
    const i = text.toLowerCase().indexOf(quote.toLowerCase().slice(0, 30));
    if (i >= 0) return `…${text.slice(Math.max(0, i - 200), i + 300)}…`;
  }
  return text.slice(0, 500);
}

export function DealReviewCard({ deal }: { deal: ReviewDeal }) {
  const category = deal.business?.category ?? 'restaurant';
  const items = CANONICAL_ITEMS.filter((i) => i.businessCategory === category);
  const item = deal.canonical_item_slug ? CANONICAL_ITEM_BY_SLUG.get(deal.canonical_item_slug) : undefined;
  const sourceUrl = deal.capture?.payload?.source_url ?? null;
  const tone = deal.status === 'approved' ? 'ok' : deal.status === 'pending' ? 'warn' : 'bad';

  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Pill tone={tone}>{deal.status}</Pill>
        {deal.extraction_confidence != null && <Pill>conf {Number(deal.extraction_confidence).toFixed(2)}</Pill>}
        <Pill>{sourceLabel(deal.source_type as SourceType)}</Pill>
        {deal.business && <Link href={`/b/${deal.business.slug}`} className="font-medium hover:underline">{deal.business.name}</Link>}
        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener" className="text-brand hover:underline">source ↗</a>}
        <span className="ml-auto text-xs text-muted">seen {fmt(deal.last_seen_at)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2 text-xs">
          {deal.evidence_quote && <p className="rounded-lg bg-deal-soft p-2 italic">“{deal.evidence_quote}”</p>}
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-[11px] leading-snug text-muted">{excerpt(deal.capture?.content_text ?? null, deal.evidence_quote)}</pre>
          {deal.capture?.image_urls?.length ? (
            <div className="flex gap-2">
              {deal.capture.image_urls.slice(0, 3).map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" className="h-24 w-24 rounded-lg object-cover" />
              ))}
            </div>
          ) : null}
          {item && deal.unit_price != null && <p>Unit price: <b>{formatUnitPrice(Number(deal.unit_price), item.comparableUnit)}</b></p>}
        </div>

        <form action={reviewDealAction} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input type="hidden" name="id" value={deal.id} />
          <Field label="Title" className="col-span-2 sm:col-span-4"><input name="title" defaultValue={deal.title} className={input} required /></Field>
          <Field label="Item name" className="col-span-2"><input name="item_name" defaultValue={deal.item_name} className={input} /></Field>
          <Field label="Canonical item" className="col-span-2">
            <select name="canonical_item_slug" defaultValue={deal.canonical_item_slug ?? ''} className={input}>
              <option value="">— none —</option>
              {items.map((i) => <option key={i.slug} value={i.slug}>{i.displayName}</option>)}
            </select>
          </Field>
          <Field label="Type"><select name="deal_type" defaultValue={deal.deal_type} className={input}>{DEAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Price"><input name="price" type="number" step="0.01" defaultValue={deal.price ?? ''} className={input} /></Field>
          <Field label="Regular"><input name="regular_price" type="number" step="0.01" defaultValue={deal.regular_price ?? ''} className={input} /></Field>
          <Field label="% off"><input name="percent_off" type="number" step="1" defaultValue={deal.percent_off ?? ''} className={input} /></Field>
          <Field label="Qty"><input name="quantity" type="number" step="0.001" defaultValue={deal.quantity} className={input} /></Field>
          <Field label="Unit"><select name="unit" defaultValue={deal.unit} className={input}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
          <Field label="Starts"><input name="starts_at" type="date" defaultValue={deal.starts_at ? dateInTz(new Date(deal.starts_at)) : ''} className={input} /></Field>
          <Field label="Ends"><input name="ends_at" type="date" defaultValue={deal.ends_at ? dateInTz(new Date(deal.ends_at)) : ''} className={input} /></Field>
          <div className="col-span-2 flex flex-wrap items-center gap-2 text-xs sm:col-span-4">
            <span className="font-medium text-muted">Days</span>
            {DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1"><input type="checkbox" name="dow" value={i} defaultChecked={deal.days_of_week?.includes(i) ?? false} />{d}</label>
            ))}
            <Field label="Time window" className="ml-auto w-36"><input name="time_window" defaultValue={deal.time_window ?? ''} className={input} /></Field>
          </div>
          <Field label="Conditions" className="col-span-2 sm:col-span-4"><input name="conditions" defaultValue={deal.conditions ?? ''} className={input} /></Field>
          <div className="col-span-2 flex flex-wrap items-center gap-2 pt-1 sm:col-span-4">
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_featured" defaultChecked={deal.is_featured} /> Featured</label>
            <span className="ml-auto" />
            <button name="op" value="save" className={btnGhost}>Save</button>
            {deal.status !== 'approved' && <button name="op" value="approve" className={btnPrimary}>Approve</button>}
            {deal.status === 'approved' && <button name="op" value="expire" className={btnDanger}>Expire</button>}
            {deal.status !== 'rejected' && <button name="op" value="reject" className={btnDanger}>Reject</button>}
          </div>
        </form>
      </div>
    </article>
  );
}
