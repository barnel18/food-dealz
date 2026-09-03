import type { Metadata } from 'next';
import { safeNext } from '@/lib/utils/safe-next';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LoginPage(props: PageProps<'/login'>) {
  const sp = await props.searchParams;
  const next = safeNext(first(sp.next), '/deals');
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Save deals across devices and get first access to alerts.</p>
      <SignInForm next={next} linkError={first(sp.error) === 'link'} />
    </div>
  );
}
