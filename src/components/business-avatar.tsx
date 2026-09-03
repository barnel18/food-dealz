import { cn } from '@/lib/utils/cn';

const PALETTE = ['#e4572e', '#c2410c', '#b45309', '#15803d', '#0f766e', '#1d4ed8', '#6d28d9', '#be185d', '#7c2d12', '#4d7c0f'];

function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !/^(the|a|an|of|and|&)$/i.test(w));
  return (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? name).slice(0, 2)).toUpperCase();
}
function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Real logo when we have one; otherwise a lettered mark in a stable brand color. */
export function BusinessAvatar({ name, logoUrl, size = 44, className }: { name: string; logoUrl: string | null | undefined; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  if (logoUrl) {
    return (
      <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white', className)} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" width={size} height={size} className="h-full w-full object-contain" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-xl font-bold text-white', className)} style={{ ...style, background: colorFor(name) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
