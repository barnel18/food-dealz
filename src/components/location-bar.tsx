import Link from 'next/link';
import type { UserLocation } from '@/lib/location/cookie';
import { MapPinIcon } from './icons';
import { RadiusControl } from './radius-control';

export function LocationBar({ location, isDefault }: { location: UserLocation; isDefault: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <MapPinIcon className="h-4 w-4 shrink-0 text-brand" />
        <span className="truncate text-sm">
          {isDefault ? 'Near downtown Madison' : `Near ${location.label}`}
          {isDefault && <span className="text-muted"> (default)</span>}
        </span>
        <Link href="/" className="shrink-0 text-sm font-medium text-brand hover:underline">
          Change
        </Link>
      </div>
      <RadiusControl value={location.radiusM} />
    </div>
  );
}
