import { MOSCOW_TIME_ZONE } from './config';
import type { PeriodKey } from './types';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const longFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (date: Date) => dateFormatter.format(date);
export const formatLongDate = (date: Date) =>
  longFormatter.format(date).replace(' г.', '');
export const formatTime = (date: Date) => timeFormatter.format(date);
export const formatDateTime = (date: Date) =>
  `${formatLongDate(date)} · ${formatTime(date)}`;

export function toMoscowInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOSCOW_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

export function fromMoscowInput(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}:00+03:00`);
}

function moscowDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOSCOW_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function atMoscowMidnight(year: number, month: number, day: number) {
  const normalized = new Date(Date.UTC(year, month - 1, day));
  const y = normalized.getUTCFullYear();
  const m = String(normalized.getUTCMonth() + 1).padStart(2, '0');
  const d = String(normalized.getUTCDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T00:00:00+03:00`);
}

export function getPeriodRange(
  period: PeriodKey,
  from?: string,
  to?: string,
): { start: Date | null; end: Date | null } {
  const now = new Date();
  const { year, month, day } = moscowDateParts(now);
  const tomorrow = atMoscowMidnight(year, month, day + 1);
  if (period === 'all') return { start: null, end: null };
  if (period === 'custom')
    return {
      start: from ? new Date(`${from}T00:00:00+03:00`) : null,
      end: to ? new Date(new Date(`${to}T00:00:00+03:00`).getTime() + 86400000) : null,
    };
  if (period === 'today')
    return { start: atMoscowMidnight(year, month, day), end: tomorrow };
  if (period === '7days')
    return { start: atMoscowMidnight(year, month, day - 6), end: tomorrow };
  if (period === 'month')
    return { start: atMoscowMidnight(year, month, 1), end: tomorrow };
  if (period === 'lastMonth')
    return {
      start: atMoscowMidnight(year, month - 1, 1),
      end: atMoscowMidnight(year, month, 1),
    };
  if (period === '3months')
    return { start: atMoscowMidnight(year, month - 2, 1), end: tomorrow };
  return { start: atMoscowMidnight(year, 1, 1), end: tomorrow };
}
