import Link from 'next/link';

export function EmptyState({
  title,
  description,
  action,
  emoji = '\u{1F37D}️',
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  emoji?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden="true">{emoji}</div>
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
          {action.label}
        </Link>
      )}
    </div>
  );
}
