'use client';

import { useRef, useState, useTransition } from 'react';
import { reportDealAction } from '@/lib/actions/deals';
import { REPORT_REASONS, type ReportReason } from '@/lib/deals/types';
import { FlagIcon } from './icons';

export function ReportDealDialog({ dealId }: { dealId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReportReason>('expired');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await reportDealAction({ dealId, reason, note });
      if (r.ok) setDone(true);
      else setError(r.error ?? 'Could not send report.');
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-muted hover:text-foreground"
      >
        <FlagIcon className="h-4 w-4" />
        Report
      </button>
      <dialog
        ref={ref}
        onClose={() => {
          setDone(false);
          setError(null);
        }}
        className="w-[min(92vw,26rem)] rounded-2xl border border-line bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40"
      >
        <form method="dialog" className="p-5">
          <h2 className="text-lg font-semibold">Is this deal still good?</h2>
          {done ? (
            <p className="mt-3 text-sm">Thanks! Reports keep the feed honest for everyone.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-brand" />
                  {r.label}
                </label>
              ))}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="Anything else? (optional)"
                className="mt-1 w-full rounded-lg border border-line bg-background p-2 text-sm"
                rows={2}
              />
              {error && <p className="text-sm text-brand">{error}</p>}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="submit" className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-foreground">
              {done ? 'Close' : 'Cancel'}
            </button>
            {!done && (
              <button type="button" onClick={submit} disabled={pending} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {pending ? 'Sending…' : 'Send report'}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
