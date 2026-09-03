import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser, type CurrentUser } from './dal';

/** Admin = email listed in ADMIN_EMAILS, or profiles.role = 'admin'. */
export const isAdminUser = cache(async (user: CurrentUser | null): Promise<boolean> => {
  if (!user) return false;
  if (user.email && serverEnv().adminEmails.includes(user.email.toLowerCase())) return true;
  const { data } = await createAdminClient().from('profiles').select('role').eq('id', user.id).maybeSingle();
  return (data as { role?: string } | null)?.role === 'admin';
});

export async function requireAdmin(nextPath = '/admin'): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!(await isAdminUser(user))) redirect('/forbidden');
  return user;
}
