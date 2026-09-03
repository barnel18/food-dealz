import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SESSION_COOKIE } from '@/lib/location/cookie';
import { createStaticClient } from '@/lib/supabase/static';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Row {
  id: string;
  business_id: string;
  business: { name: string; address: string | null; website_url: string | null; google_place_id: string | null } | null;
}

/** Logs an outbound click, then redirects to the business website or Google Maps. */
export async function GET(request: NextRequest, ctx: RouteContext<'/out/[id]'>) {
  const { id } = await ctx.params;
  const to = new URL(request.url).searchParams.get('to') === 'maps' ? 'maps' : 'site';
  const home = new URL('/deals', request.url);
  if (!UUID.test(id) || !isSupabaseConfigured()) return NextResponse.redirect(home);

  const supabase = createStaticClient();
  const { data } = await supabase
    .from('deals')
    .select('id, business_id, business:businesses(name, address, website_url, google_place_id)')
    .eq('id', id)
    .maybeSingle();
  const row = data as unknown as Row | null;
  if (!row) return NextResponse.redirect(home);

  const b = row.business;
  let target: string | null = null;
  if (to === 'site' && b?.website_url && /^https?:\/\//i.test(b.website_url)) target = b.website_url;
  if (!target) {
    const q = encodeURIComponent(`${b?.name ?? ''} ${b?.address ?? 'Madison, WI'}`.trim());
    target = `https://www.google.com/maps/search/?api=1&query=${q}${b?.google_place_id ? `&query_place_id=${b.google_place_id}` : ''}`;
  }

  await supabase.from('deal_clicks').insert({
    deal_id: row.id,
    business_id: row.business_id,
    kind: to,
    session_id: request.cookies.get(SESSION_COOKIE)?.value ?? null,
  });

  return NextResponse.redirect(target, 302);
}
