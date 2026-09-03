'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { setLocationAction } from '@/lib/location/actions';
import type { UserLocation } from '@/lib/location/cookie';
import { cn } from '@/lib/utils/cn';
import { LocateIcon, MapPinIcon, SearchIcon } from './icons';

interface Preset { label: string; lat: number; lng: number }
interface GeocodeResponse { results: Preset[]; reason?: string }

export function LocationPicker({
  initial,
  presets,
  nextPath = '/deals',
}: {
  initial: UserLocation | null;
  presets: ReadonlyArray<Preset>;
  nextPath?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Preset[]>([]);
  const [searching, setSearching] = useState(false);
  const [noToken, setNoToken] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      if (q.length < 3) {
        setResults([]);
        setSearching(false);
        return;
      }
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = (await res.json()) as GeocodeResponse;
        setNoToken(json.reason === 'no_token');
        setResults(json.results ?? []);
      } catch {
        /* aborted or offline */
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function choose(p: Preset) {
    startTransition(async () => {
      await setLocationAction({ lat: p.lat, lng: p.lng, label: p.label }, nextPath);
    });
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('Your browser does not support location.');
      return;
    }
    setGeoError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = 'Current location';
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          const json = (await res.json()) as { label?: string | null };
          if (json.label) label = json.label;
        } catch {
          /* keep generic label */
        }
        setLocating(false);
        choose({ lat, lng, label });
      },
      () => {
        setLocating(false);
        setGeoError('Could not get your location. Pick a spot below or search an address.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const busy = pending || locating;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={useMyLocation}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-strong disabled:opacity-60 sm:w-auto"
      >
        <LocateIcon className="h-5 w-5" />
        {locating ? 'Finding you…' : 'Use my location'}
      </button>
      {geoError && <p className="text-sm text-brand">{geoError}</p>}

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search an address or neighborhood"
          autoComplete="off"
          disabled={busy}
          className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3 text-base outline-none ring-brand/30 focus:ring-2"
        />
        {query.trim().length >= 3 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {searching && <div className="px-3 py-2 text-sm text-muted">Searching…</div>}
            {!searching && noToken && (
              <div className="px-3 py-2 text-sm text-muted">Address search isn’t set up yet. Use GPS or pick a spot below.</div>
            )}
            {!searching && !noToken && results.length === 0 && <div className="px-3 py-2 text-sm text-muted">No matches.</div>}
            {results.map((r) => (
              <button
                key={`${r.lat},${r.lng}`}
                type="button"
                onClick={() => choose(r)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <MapPinIcon className="h-4 w-4 shrink-0 text-brand" />
                <span className="truncate">{r.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Or pick a spot</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => choose(p)}
              disabled={busy}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition hover:border-brand hover:text-brand disabled:opacity-60',
                initial?.label === p.label ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {pending && <p className="text-sm text-muted">Loading deals…</p>}
    </div>
  );
}
