import * as chrono from 'chrono-node';
import { launch } from '@/lib/env';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "-05:00" style offset for the launch time zone on a given calendar date. */
export function tzOffset(dateStr: string, tz: string = launch.tz): string {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(probe);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = name.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return m ? `${m[1]}:${m[2] ?? '00'}` : '+00:00';
}

export function tzOffsetMinutes(dateStr: string, tz: string = launch.tz): number {
  const m = tzOffset(dateStr, tz).match(/([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** Calendar date (YYYY-MM-DD) of an instant in the launch time zone. */
export function dateInTz(d: Date, tz: string = launch.tz): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function dayStartIso(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00${tzOffset(dateStr)}`).toISOString();
}

export function dayEndIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59${tzOffset(dateStr)}`).toISOString();
}

/**
 * Accepts an ISO date or loose text ("this Sunday", "through 9/14") and returns YYYY-MM-DD,
 * resolved relative to `anchor` in the launch time zone. Null when unparseable.
 */
export function normalizeDate(input: string | null | undefined, anchor: Date): string | null {
  if (!input) return null;
  const s = input.trim();
  if (ISO_DATE.test(s)) return Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? null : s;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso) return iso[1];
  const parsed = chrono.parseDate(s, { instant: anchor, timezone: tzOffsetMinutes(dateInTz(anchor)) }, { forwardDate: true });
  return parsed ? dateInTz(parsed) : null;
}
