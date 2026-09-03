'use client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md break-words text-sm text-muted">{error.message}</p>
      <button type="button" onClick={reset} className="mt-6 inline-flex rounded-full bg-brand px-5 py-2 font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
