/**
 * 列表单元格的日期 / 日期时间统一格式化（2026-11-27）
 *
 * 背景：schema 里 `type: 'date' | 'datetime'` 的列若没写 `renderCell`，
 * 列表会把后端原始字符串直接输出，例如 `2026-11-20 01:00:00+00`
 * —— 既是 UTC 时间（比本地少 8 小时），也没有人愿意看这种格式。
 * 这里给出统一口径：
 *   - 日期：`YYYY-MM-DD`
 *   - 日期时间：`YYYY-MM-DD HH:mm`
 *   - 一律按浏览器本地时区呈现
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * 把后端的各种时间表示解析成 Date。
 *
 * 支持：Date 对象、ISO 8601（含 Z / ±hh:mm 偏移）、
 * `YYYY-MM-DD HH:mm:ss[.fff][±hh[:mm]]`（后端 sqlx 常常这么输出）、
 * `YYYY-MM-DD`（按本地日期，不做时区换算）、epoch 毫秒/秒。
 */
export function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number' && Number.isFinite(value)) {
    // 10 位当秒、13 位当毫秒
    const ms = Math.abs(value) < 1e11 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  // 纯日期：按本地日历日解释，避免 new Date('2026-11-20') 被当成 UTC 零点
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }

  let s = raw.replace(' ', 'T');
  // 时区后缀 +00 / -08 这类缺分钟的写法，补齐成 +00:00
  s = s.replace(/([+-]\d{2})$/, '$1:00');
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  // 兜底：去掉毫秒再试一次
  s = s.replace(/\.\d+/, '');
  d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 日期 → `YYYY-MM-DD`（本地时区） */
export function formatDateCell(value: unknown): string {
  const d = parseDateValue(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 日期时间 → `YYYY-MM-DD HH:mm`（本地时区） */
export function formatDateTimeCell(value: unknown): string {
  const d = parseDateValue(value);
  if (!d) return '';
  return `${formatDateCell(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
