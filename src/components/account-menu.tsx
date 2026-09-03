'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOutAction } from '@/lib/auth/actions';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';
import { UserIcon } from './icons';

export function AccountMenu() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!email) {
    return (
      <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2">
        <UserIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <form action={signOutAction} className="flex items-center gap-2">
      <span className="hidden max-w-[180px] truncate text-sm text-muted sm:inline" title={email}>{email}</span>
      <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2">
        Sign out
      </button>
    </form>
  );
}
