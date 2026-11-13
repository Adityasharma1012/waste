import type { InventoryItem, UrgencyBucket } from '../types';

const MS_PER_DAY = 86_400_000;

export function todayISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISODate(baseDateStr: string, deltaDays: number): string {
  const utc = parseISODateUtcMs(baseDateStr) + deltaDays * MS_PER_DAY;
  const dt = new Date(utc);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODateUtcMs(dateStr: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) {
    throw new Error(`Invalid ISO date string: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(fromDateStr: string, toDateStr: string): number {
  const fromMs = parseISODateUtcMs(fromDateStr);
  const toMs = parseISODateUtcMs(toDateStr);
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

export function getDaysUntilExpiry(
  item: Pick<InventoryItem, 'expiryDate'>,
  referenceDate: string = todayISODate()
): number {
  return daysBetween(referenceDate, item.expiryDate);
}

export function getDaysSincePurchase(
  item: Pick<InventoryItem, 'purchaseDate'>,
  referenceDate: string = todayISODate()
): number {
  return daysBetween(item.purchaseDate, referenceDate);
}

export function classifyUrgencyBucket(
  item: Pick<InventoryItem, 'expiryDate' | 'storageLocation'>,
  referenceDate: string = todayISODate()
): UrgencyBucket {
  const days = getDaysUntilExpiry(item, referenceDate);
  if (days < 0) return 'expired';
  if (days === 0) return 'use_today';
  if (days <= 3) return 'use_soon_1_3d';
  return 'safe';
}
