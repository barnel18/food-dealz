import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">Admins only</h1>
      <p className="mx-auto mt-2 max-w-sm text-muted">This account isn’t on the admin list. Add its email to ADMIN_EMAILS or set the profile role to admin.</p>
      <Link href="/deals" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2 font-semibold text-white">Back to deals</Link>
    </div>
  );
}
