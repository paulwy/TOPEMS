/**
 * 报表金额格式化。
 * 后端 Decimal 以字符串下发，这里只做千分位与两位小数补齐，
 * 不做任何加减乘除，避免浮点尾差与“前端算数”。
 */
export function formatMoney(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const raw = String(value).trim();
  if (!raw) return '—';

  const matched = raw.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!matched) return raw;

  const sign = matched[1] === '-' ? '-' : '';
  const integer = matched[2].replace(/^0+(?=\d)/, '');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = (matched[3] ?? '').padEnd(2, '0').slice(0, 2);

  return `${sign}${grouped}.${fraction}`;
}

/** 当前月份（YYYY-MM），用于期间选择默认值。 */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** 层级缩进：line_level 从 1 开始，每级缩进两格。 */
export function lineIndent(lineLevel: number): number {
  return Math.max(0, lineLevel - 1) * 2;
}

/** 判断后端下发的十进制字符串是否为 0（仅判等，不做运算）。 */
export function isZeroAmount(value?: string | number | null): boolean {
  if (value === null || value === undefined) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(raw)) return false;
  return !/[1-9]/.test(raw);
}

/** 一组金额是否全部为 0。 */
export function allZeroAmounts(values: Array<string | number | null | undefined>): boolean {
  return values.every(isZeroAmount);
}
