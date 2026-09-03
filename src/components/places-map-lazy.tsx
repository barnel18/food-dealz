'use client';

import dynamic from 'next/dynamic';
import { createContext, useContext } from 'react';
import { cn } from '@/lib/utils/cn';
import type { PlaceMapPin, PlacesMapProps } from './places-map';

export type { PlaceMapPin, PlacesMapProps };

// Mirrors the default in places-map.tsx. Not imported from there on purpose: a value import
// would pull mapbox-gl into this chunk and defeat the lazy load.
const DEFAULT_CLASS = 'h-[60vh] min-h-80 w-full overflow-hidden rounded-2xl border border-line';

/** next/dynamic's `loading` component gets no props, so the container class reaches it via context. */
const PlaceholderClass = createContext<string | undefined>(undefined);

function MapPlaceholder() {
  const className = useContext(PlaceholderClass);
  return <div className={cn(className ?? DEFAULT_CLASS, 'animate-pulse bg-surface-2')} aria-busy="true" aria-label="Loading map" />;
}

const PlacesMapDynamic = dynamic(() => import('./places-map').then((m) => m.PlacesMap), {
  ssr: false,
  loading: MapPlaceholder,
});

/**
 * Client-only, code-split `PlacesMap`. Safe to render from Server Components; mapbox-gl
 * (~250 KB gzipped + CSS) is only downloaded when this mounts in the browser.
 */
export function PlacesMapLazy(props: PlacesMapProps) {
  return (
    <PlaceholderClass.Provider value={props.className}>
      <PlacesMapDynamic {...props} />
    </PlaceholderClass.Provider>
  );
}
