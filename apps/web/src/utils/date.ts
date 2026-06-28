/**
 * 日期处理工具函数
 *
 * NOTE: 当前未被任何组件直接导入（通过 utils/index.ts 的 export * 导出）。
 * 保留作为基础设施工具，可在需要日期判断的场景中使用。
 */

/**
 * 获取今天是星期几（0-6，0为周日）
 */
export const getWeekday = (date?: Date): number => {
  const d = date ? new Date(date) : new Date();
  return d.getDay();
};

const parseDate = (date: Date | string): Date => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00`);
  }
  return new Date(date);
};

/**
 * 判断是否是今天
 */
export const isToday = (date: Date | string): boolean => {
  const d = parseDate(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * 判断是否是昨天
 */
export const isYesterday = (date: Date | string): boolean => {
  const d = parseDate(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * 判断是否是明天
 */
export const isTomorrow = (date: Date | string): boolean => {
  const d = parseDate(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
};

/**
 * 获取周开始日期（周一）
 */
export const getWeekStart = (date?: Date): Date => {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * 获取周结束日期（周日）
 */
export const getWeekEnd = (date?: Date): Date => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};
