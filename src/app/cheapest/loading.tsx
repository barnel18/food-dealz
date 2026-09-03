export default function Loading() {
  return (
    <div className="animate-pulse pb-8">
      <div className="my-3 h-9 w-64 rounded-full bg-surface-2" />
      <div className="h-8 w-48 rounded bg-surface-2" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-surface-2" />)}
      </div>
    </div>
  );
}
