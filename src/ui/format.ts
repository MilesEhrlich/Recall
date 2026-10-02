import { DAY_MS } from '../model/forgetting';
import { studyDayStart, studyDaysBetween } from '../model/scheduler';

export function pct(r: number): string {
  return `${Math.round(r * 100)}%`;
}

/** Human-friendly duration from a number of days. */
export function duration(days: number): string {
  const mins = days * 24 * 60;
  if (mins < 60) return `${Math.max(1, Math.round(mins))} min`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h`;
  if (days < 60) return `${Math.round(days * 10) / 10} days`;
  return `${Math.round(days / 30)} months`;
}

export function untilMs(ms: number, now: number): string {
  return duration((ms - now) / DAY_MS);
}

/** Start of the current study day (rolls over at 4 am, so late nights still count as "today"). */
export function startOfDay(now: number): number {
  return studyDayStart(now);
}

/** "today", "tomorrow", "in 3 days", "in 2 months" for a due time, counted in study days. */
export function dueLabel(due: number, now: number): string {
  const n = studyDaysBetween(now, due);
  if (n <= 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n < 60) return `in ${n} days`;
  return `in ${Math.round(n / 30)} months`;
}

/** Same, without the "in": "today", "tomorrow", "3 days". For compact buttons. */
export function gapLabel(due: number, now: number): string {
  return dueLabel(due, now).replace(/^in /, '');
}

export function dateLabel(now: number): string {
  return new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Calendar-day countdown to a 'YYYY-MM-DD' exam date: "today", "tomorrow", "in 5 days", or null if passed. */
export function examCountdown(examDate: string | null, now: number): string | null {
  if (!examDate) return null;
  const [y, m, d] = examDate.split('-').map(Number);
  const today = new Date(now);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.round((new Date(y, m - 1, d).getTime() - midnight) / DAY_MS);
  if (days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** Compact duration for tight spaces: "45m", "6h", "3.3d". */
export function durationShort(days: number): string {
  const mins = days * 24 * 60;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h`;
  return `${days < 10 ? Math.round(days * 10) / 10 : Math.round(days)}d`;
}
