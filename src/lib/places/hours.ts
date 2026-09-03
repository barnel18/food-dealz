import type { OpeningHours } from './types';

const TZ = 'America/Chicago';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Current wall-clock time in the launch timezone as (day 0=Sunday, minutes since midnight). */
function localNow(now: Date): { day: number; mins: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = DAY_NAMES.indexOf(get('weekday'));
  const hour = Number(get('hour')) % 24;
  return { day: day < 0 ? now.getDay() : day, mins: hour * 60 + Number(get('minute')) };
}

function fmt(hour: number, minute = 0): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 || hour === 24 ? (hour === 24 ? 'AM' : 'AM') : 'PM';
  return minute ? `${h12}:${String(minute).padStart(2, '0')} ${ampm}` : `${h12} ${ampm}`;
}

export interface OpenState {
  /** null when hours are unknown */
  isOpen: boolean | null;
  /** "Open · closes 10 PM", "Closed · opens 11 AM", "Open 24 hours", "Closed today" */
  label: string | null;
  /** true when closing within the next hour */
  closingSoon: boolean;
}

/** Same rules as the SQL `is_open_now`, plus a human label with the next transition. */
export function openState(hours: OpeningHours | null | undefined, now: Date = new Date()): OpenState {
  if (!hours || !Array.isArray(hours.periods)) return { isOpen: null, label: null, closingSoon: false };
  if (hours.periods.some((p) => !p.close)) return { isOpen: true, label: 'Open 24 hours', closingSoon: false };
  const { day, mins } = localNow(now);
  const cur = day * 1440 + mins;
  const WEEK = 7 * 1440;
  let nextOpenIn = Infinity;
  let nextOpenAt: { hour: number; minute: number; day: number } | null = null;
  for (const p of hours.periods) {
    const start = p.open.day * 1440 + p.open.hour * 60 + (p.open.minute ?? 0);
    let end = (p.close!.day * 1440) + p.close!.hour * 60 + (p.close!.minute ?? 0);
    if (end <= start) end += WEEK;
    for (const shift of [0, WEEK]) {
      const c = cur + shift;
      if (c >= start && c < end) {
        const left = end - c;
        return { isOpen: true, label: `Open · closes ${fmt(p.close!.hour, p.close!.minute)}`, closingSoon: left <= 60 };
      }
    }
    const until = ((start - cur) % WEEK + WEEK) % WEEK;
    if (until < nextOpenIn) { nextOpenIn = until; nextOpenAt = { hour: p.open.hour, minute: p.open.minute ?? 0, day: p.open.day }; }
  }
  if (!nextOpenAt) return { isOpen: false, label: 'Closed', closingSoon: false };
  const sameDay = nextOpenAt.day === day && nextOpenIn < 1440;
  const label = sameDay ? `Closed · opens ${fmt(nextOpenAt.hour, nextOpenAt.minute)}` : nextOpenIn < 2 * 1440 ? `Closed · opens ${nextOpenAt.day === (day + 1) % 7 ? 'tomorrow' : DAY_NAMES[nextOpenAt.day]} ${fmt(nextOpenAt.hour, nextOpenAt.minute)}` : `Closed · opens ${DAY_NAMES[nextOpenAt.day]}`;
  return { isOpen: false, label, closingSoon: false };
}

/** Compact rating text: "4.6" and "(1.2k)". */
export function formatReviewCount(n: number | null | undefined): string {
  if (!n) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
