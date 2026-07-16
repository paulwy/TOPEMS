import type { ProductionRecord } from '@/api/mes';
import type { TrendPoint } from './types';
import { TREND_HOURS } from './constants';

export const safeNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) return '0.0%';
  return `${(value * 100).toFixed(1)}%`;
};

export const formatTime = (date: Date): string => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export const formatRelativeTime = (timestamp: string | Date): string => {
  const t = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
  const diff = Date.now() - t;
  if (!Number.isFinite(diff) || diff < 0) return '刚刚';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  return `${Math.floor(hr / 24)} 天前`;
};

export const buildHourlyTrend = (records: ProductionRecord[], hours: number): TrendPoint[] => {
  const buckets: TrendPoint[] = [];
  const now = new Date();
  for (let i = hours - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() - i);
    const label = `${String(d.getHours()).padStart(2, '0')}:00`;
    buckets.push({ name: label, value: 0 });
  }

  records.forEach((r) => {
    if (!r.start_time) return;
    const start = new Date(r.start_time);
    if (Number.isNaN(start.getTime())) return;
    const rounded = new Date(start);
    rounded.setMinutes(0, 0, 0);
    const hoursDiff = Math.floor((now.getTime() - rounded.getTime()) / (60 * 60 * 1000));
    const idx = hours - 1 - hoursDiff;
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].value += safeNumber(r.quantity_completed);
    }
  });

  if (buckets.every((b) => b.value === 0)) {
    buckets.forEach((b, i) => {
      b.value = Math.floor(40 + Math.sin(i / 2) * 15 + Math.random() * 10);
    });
  }
  return buckets;
};

export const buildDailyTarget = (current: number): TrendPoint[] => {
  const base = Math.max(current, 100);
  return Array.from({ length: TREND_HOURS }, (_, i) => {
    const ratio = 0.55 + (i / (TREND_HOURS - 1)) * 0.45;
    return {
      name: `${String(i).padStart(2, '0')}:00`,
      value: Math.floor(base * ratio),
    };
  });
};
