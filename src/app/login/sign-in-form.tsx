'use client';

import { useActionState } from 'react';
import { signInWithEmailAction, type SignInState } from '@/lib/auth/actions';

const initial: SignInState = { status: 'idle' };

export function SignInForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action, pending] = useActionState(signInWithEmailAction, initial);

  if (state.status === 'sent') {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted">
          We sent a sign-in link to <span className="font-medium text-foreground">{state.email}</span>. Open it on this device to finish.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-line bg-surface p-6">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="block text-sm font-medium">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-3 text-base outline-none ring-brand/30 focus:ring-2"
      />
      {(state.status === 'error' || linkError) && (
        <p className="mt-2 text-sm text-brand">{state.message ?? 'That sign-in link expired or was already used. Request a new one.'}</p>
      )}
      <button type="submit" disabled={pending} className="mt-4 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
        {pending ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      <p className="mt-3 text-xs text-muted">No password. We email a one-time link; that’s it.</p>
    </form>
  );
}
