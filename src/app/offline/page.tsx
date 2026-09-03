import Link from 'next/link';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <div className="py-20 text-center">
      <div className="text-5xl" aria-hidden="true">{'\u{1F4F5}'}</div>
      <h1 className="mt-4 text-2xl font-bold">You’re offline</h1>
      <p className="mx-auto mt-2 max-w-sm text-muted">Deals need a connection to load. Reconnect and try again.</p>
      <Link href="/deals" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2 font-semibold text-white">Retry</Link>
    </div>
  );
}
