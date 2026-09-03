export default function Loading() {
  return (
    <div className="animate-pulse pb-8">
      <div className="my-3 h-9 w-64 rounded-full bg-surface-2" />
      <div className="mb-4 flex gap-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-9 w-24 rounded-full bg-surface-2" />)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-surface-2" />)}
      </div>
    </div>
  );
}
