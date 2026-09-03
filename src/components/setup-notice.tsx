/** Shown when a query fails. 'not_configured' means Supabase keys are still placeholders. */
export function SetupNotice({ error }: { error: string }) {
  if (error === 'not_configured') {
    return (
      <div className="rounded-2xl border border-accent/50 bg-accent/10 p-4 text-sm">
        <p className="font-semibold">Database not connected yet</p>
        <p className="mt-1 text-muted">
          Add your Supabase URL and keys to <code className="rounded bg-surface-2 px-1">.env.local</code>, run{' '}
          <code className="rounded bg-surface-2 px-1">pnpm db:push</code>, then restart the dev server. Sample Madison data:{' '}
          <code className="rounded bg-surface-2 px-1">pnpm seed:dev</code>.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-brand/40 bg-brand-soft p-4 text-sm">
      <p className="font-semibold">Couldn’t load deals</p>
      <p className="mt-1 break-words text-muted">{error}</p>
    </div>
  );
}
