import Link from 'next/link';
import { Field, Pill, btnGhost, btnPrimary, input } from '@/components/admin/ui';
import { createBusinessAction, setBusinessActiveAction } from '@/lib/actions/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Businesses' };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

interface Row { id: string; name: string; slug: string; category: string; address: string | null; is_active: boolean; featured_until: string | null; sources: { count: number }[]; deals: { count: number }[] }

export default async function BusinessesPage(props: PageProps<'/admin/businesses'>) {
  const sp = await props.searchParams;
  const q = (first(sp.q) ?? '').trim();
  const status = first(sp.status) === 'inactive' ? 'inactive' : 'active';
  const db = createAdminClient();
  let query = db.from('businesses').select('id,name,slug,category,address,is_active,featured_until,sources(count),deals(count)').eq('is_active', status === 'active').order('name').limit(300);
  if (q) query = query.ilike('name', `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <form action={createBusinessAction} className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-6">
        <h2 className="col-span-2 font-semibold sm:col-span-6">Add a business</h2>
        <Field label="Name" className="col-span-2"><input name="name" className={input} required /></Field>
        <Field label="Type"><select name="category" className={input}><option value="restaurant">restaurant</option><option value="grocery">grocery</option></select></Field>
        <Field label="Chain key"><input name="chain_key" placeholder="kroger, hyvee…" className={input} /></Field>
        <Field label="Phone"><input name="phone" className={input} /></Field>
        <Field label="Website"><input name="website_url" type="url" className={input} /></Field>
        <Field label="Address (geocoded if lat/lng blank)" className="col-span-2 sm:col-span-3"><input name="address" className={input} /></Field>
        <Field label="Lat"><input name="lat" type="number" step="any" className={input} /></Field>
        <Field label="Lng"><input name="lng" type="number" step="any" className={input} /></Field>
        <div className="flex items-end"><button className={btnPrimary}>Add</button></div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/businesses" className={status === 'active' ? btnPrimary : btnGhost}>Active</Link>
        <Link href="/admin/businesses?status=inactive" className={status === 'inactive' ? btnPrimary : btnGhost}>Inactive / to review</Link>
        <form className="ml-auto flex gap-2"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={q} placeholder="Search name…" className={input + ' max-w-xs'} /><button className={btnPrimary}>Search</button></form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted"><tr><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Address</th><th className="p-2">Sources</th><th className="p-2">Deals</th><th className="p-2">Status</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-line">
                <td className="p-2"><Link href={`/admin/businesses/${b.id}`} className="font-medium hover:underline">{b.name}</Link></td>
                <td className="p-2">{b.category}</td>
                <td className="p-2 text-muted">{b.address}</td>
                <td className="p-2">{b.sources?.[0]?.count ?? 0}</td>
                <td className="p-2">{b.deals?.[0]?.count ?? 0}</td>
                <td className="p-2 space-x-1">
                  {b.featured_until && new Date(b.featured_until) > new Date() && <Pill tone="warn">featured</Pill>}
                  <form action={setBusinessActiveAction} className="inline"><input type="hidden" name="id" value={b.id} /><input type="hidden" name="active" value={b.is_active ? '0' : '1'} /><button className={btnGhost}>{b.is_active ? 'Deactivate' : 'Activate'}</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
