import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export const input = 'w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm';
export const btn = 'inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition disabled:opacity-50';
export const btnPrimary = cn(btn, 'bg-brand text-white hover:bg-brand-strong');
export const btnGhost = cn(btn, 'border border-line bg-surface hover:border-brand hover:text-brand');
export const btnDanger = cn(btn, 'border border-line bg-surface text-brand hover:bg-brand-soft');

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block text-xs', className)}>
      <span className="mb-0.5 block font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'ok' | 'warn' | 'bad' }) {
  const tones = { muted: 'bg-surface-2 text-muted', ok: 'bg-deal-soft text-deal', warn: 'bg-accent/20 text-foreground', bad: 'bg-brand-soft text-brand' };
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>{children}</span>;
}

export function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const body = (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
  return href ? <Link href={href} className="block hover:shadow-md">{body}</Link> : body;
}

export function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
