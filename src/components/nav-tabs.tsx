'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { BookmarkIcon, CompassIcon, MapPinIcon, TagIcon } from './icons';

const TABS = [
  { href: '/deals', label: 'Deals', Icon: TagIcon },
  { href: '/cheapest', label: 'Cheapest', Icon: CompassIcon },
  { href: '/compare', label: 'Compare', Icon: TagIcon },
  { href: '/saved', label: 'Saved', Icon: BookmarkIcon },
  { href: '/', label: 'Location', Icon: MapPinIcon },
] as const;

export function NavTabs({ variant }: { variant: 'top' | 'bottom' }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  if (variant === 'top') {
    return (
      <nav className="flex items-center gap-1" aria-label="Primary">
        {TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition',
              isActive(href) ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="grid grid-cols-5" aria-label="Primary">
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
            isActive(href) ? 'text-brand' : 'text-muted',
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
