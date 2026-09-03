import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="text-5xl" aria-hidden="true">{'\u{1F37D}️'}</div>
      <h1 className="mt-4 text-2xl font-bold">That page is off the menu</h1>
      <p className="mx-auto mt-2 max-w-sm text-muted">The deal or business you’re looking for doesn’t exist or has expired.</p>
      <Link href="/deals" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2 font-semibold text-white">Browse deals</Link>
    </div>
  );
}
