import { NextResponse, type NextRequest } from 'next/server';
import { fromDetail } from '@/lib/deals/card-data';
import type { DealDetail } from '@/lib/deals/types';
import { isSupabaseConfigured } from '@/lib/env';
import { createStaticClient } from '@/lib/supabase/static';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/deals?ids=a,b,c → approved deals by id (used for device-local saves). */
export async function GET(request: NextRequest) {
  const ids = (new URL(request.url).searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID.test(s))
    .slice(0, 50);
  if (ids.length === 0 || !isSupabaseConfigured()) return NextResponse.json({ deals: [] });

  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from('deals')
    .select('*, business:businesses(id,name,slug,category,chain_key,address,city,state,postal_code,phone,website_url,google_place_id,featured_until,is_active,lat,lng)')
    .in('id', ids);
  if (error) return NextResponse.json({ deals: [], error: error.message }, { status: 500 });
  const rows = (data ?? []) as unknown as DealDetail[];
  const byId = new Map(rows.map((d) => [d.id, d]));
  const deals = ids.map((id) => byId.get(id)).filter((d): d is DealDetail => !!d).map((d) => fromDetail(d));
  return NextResponse.json({ deals });
}
