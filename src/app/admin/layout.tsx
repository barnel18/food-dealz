import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/admin';

const NAV = [
  ['/admin', 'Dashboard'],
  ['/admin/review', 'Review'],
  ['/admin/businesses', 'Businesses'],
  ['/admin/sources', 'Sources'],
  ['/admin/jobs', 'Jobs'],
] as const;

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin();
  return (
    <div className="py-4">
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <span className="mr-2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-background">Admin</span>
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full px-3 py-1 text-sm font-medium hover:bg-surface-2">
            {label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
