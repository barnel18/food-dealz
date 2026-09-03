'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isSupabaseConfigured, publicEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/utils/safe-next';

export interface SignInState {
  status: 'idle' | 'sent' | 'error';
  message?: string;
  email?: string;
}

export async function signInWithEmailAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const next = safeNext(formData.get('next'), '/deals');
  if (!z.email().safeParse(email).success) return { status: 'error', message: 'Enter a valid email address.' };
  if (!isSupabaseConfigured()) return { status: 'error', message: 'Sign-in is not configured yet (Supabase keys missing).' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${publicEnv.appUrl}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) return { status: 'error', message: error.message };
  return { status: 'sent', email };
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect('/');
}
