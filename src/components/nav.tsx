import Link from 'next/link';
import { AccountMenu } from './account-menu';
import { NavTabs } from './nav-tabs';

export function Nav() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-lg text-white">$</span>
            <span>Food Dealz</span>
            <span className="hidden rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand sm:inline">
              Madison
            </span>
          </Link>
          <div className="hidden md:block">
            <NavTabs variant="top" />
          </div>
          <AccountMenu />
        </div>
      </header>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <NavTabs variant="bottom" />
      </div>
    </>
  );
}
