'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/dal';
import { isSupabaseConfigured } from '@/lib/env';
import { SESSION_COOKIE } from '@/lib/location/cookie';
import { createClient } from '@/lib/supabase/server';

const Uuid = z.uuid();

export interface ActionResult {
  ok: boolean;
  needsLogin?: boolean;
  error?: string;
}

export async function toggleSaveAction(dealId: string, save: boolean): Promise<ActionResult> {
  if (!Uuid.safeParse(dealId).success) return { ok: false, error: 'Invalid deal' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsLogin: true };
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from('saved_deals').upsert({ user_id: user.id, deal_id: dealId }, { onConflict: 'user_id,deal_id' })
    : await supabase.from('saved_deals').delete().eq('user_id', user.id).eq('deal_id', dealId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/saved');
  return { ok: true };
}

const ReportInput = z.object({
  dealId: Uuid,
  reason: z.enum(['still_valid', 'expired', 'wrong_price', 'not_a_deal', 'other']),
  note: z.string().trim().max(500).optional(),
});

export async function reportDealAction(input: z.input<typeof ReportInput>): Promise<ActionResult> {
  const parsed = ReportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid report' };
  if (!isSupabaseConfigured()) return { ok: false, error: 'Not configured' };

  const store = await cookies();
  let sid = store.get(SESSION_COOKIE)?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    store.set(SESSION_COOKIE, sid, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true });
  }
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from('deal_reports').insert({
    deal_id: parsed.data.dealId,
    user_id: user?.id ?? null,
    session_id: sid,
    reason: parsed.data.reason,
    note: parsed.data.note || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
