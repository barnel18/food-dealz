import Link from 'next/link';
import { DealReviewCard, type ReviewDeal } from '@/components/admin/deal-review-card';
import { btnPrimary } from '@/components/admin/ui';
import { bulkApproveAction } from '@/lib/actions/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { cn } from '@/lib/utils/cn';

export const metadata = { title: 'Review deals' };

const STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ReviewPage(props: PageProps<'/admin/review'>) {
  const sp = await props.searchParams;
  const status = (STATUSES as readonly string[]).includes(first(sp.status) ?? '') ? (first(sp.status) as (typeof STATUSES)[number]) : 'pending';
  const db = createAdminClient();
  const { data, error } = await db
    .from('deals')
    .select('*, business:businesses(id,name,slug,category), capture:raw_captures(content_text,image_urls,payload,posted_at)')
    .eq('status', status)
    .order(status === 'pending' ? 'extraction_confidence' : 'updated_at', { ascending: false, nullsFirst: false })
    .limit(60);
  const deals = (data ?? []) as unknown as ReviewDeal[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/review?status=${s}`} className={cn('rounded-full border px-3 py-1 text-sm', s === status ? 'border-brand bg-brand text-white' : 'border-line bg-surface')}>
            {s}
          </Link>
        ))}
        {status === 'pending' && deals.length > 0 && (
          <form action={bulkApproveAction} className="ml-auto flex items-center gap-2 text-xs">
            <label>min confidence <input name="min_confidence" type="number" step="0.05" min="0" max="1" defaultValue="0.9" className="w-16 rounded border border-line bg-background px-1 py-0.5" /></label>
            <button className={btnPrimary}>Approve all matching</button>
          </form>
        )}
      </div>
      {error && <p className="text-sm text-brand">{error.message}</p>}
      {deals.length === 0 ? <p className="text-sm text-muted">Nothing {status}.</p> : deals.map((d) => <DealReviewCard key={d.id} deal={d} />)}
    </div>
  );
}
