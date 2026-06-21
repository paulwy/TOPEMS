/**
 * 日期处理工具函数
 */

/**
 * 日期常量
 */
export const DATE_CONSTANTS = {
  MILLISECONDS_PER_SECOND: 1000,
  MILLISECONDS_PER_MINUTE: 60 * 1000,
  MILLISECONDS_PER_HOUR: 60 * 60 * 1000,
  MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 60 * 60,
  SECONDS_PER_DAY: 24 * 60 * 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
  DAYS_PER_MONTH: 30,
  DAYS_PER_YEAR: 365,
} as const;

/**
 * 获取今天是星期几
 */
export const getWeekday = (date?: Date): number => {
  const d = date ? new Date(date) : new Date();
  return d.getDay();
};

/**
 * 获取星期几名称
 */
export const getWeekdayName = (
  date?: Date,
  locale: "zh-CN" | "en-US" = "zh-CN",
): string => {
  const weekdays =
    locale === "zh-CN"
      ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
      : [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
  return weekdays[getWeekday(date)];
};

/**
 * 判断是否是今天
 */
export const isToday = (date: Date | string): boolean => {
  const d = new Date(date);
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
  const d = new Date(date);
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
  const d = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
};

/**
 * 获取相对时间描述
 */
export const getRelativeTime = (
  date: Date | string,
  locale: "zh-CN" | "en-US" = "zh-CN",
): string => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const absDiff = Math.abs(diff);

  const r = (n: number, singular: string, plural: string) =>
    n === 1 ? singular : plural;

  if (locale === "zh-CN") {
    if (absDiff < DATE_CONSTANTS.MILLISECONDS_PER_MINUTE) {
      return "刚刚";
    }
    if (absDiff < DATE_CONSTANTS.MILLISECONDS_PER_HOUR) {
      const mins = Math.floor(absDiff / DATE_CONSTANTS.MILLISECONDS_PER_MINUTE);
      return `${mins}分钟${diff < 0 ? "后" : "前"}`;
    }
    if (absDiff < DATE_CONSTANTS.MILLISECONDS_PER_DAY) {
      const hours = Math.floor(absDiff / DATE_CONSTANTS.MILLISECONDS_PER_HOUR);
      return `${hours}小时${diff < 0 ? "后" : "前"}`;
    }
    if (absDiff < 7 * DATE_CONSTANTS.MILLISECONDS_PER_DAY) {
      const days = Math.floor(absDiff / DATE_CONSTANTS.MILLISECONDS_PER_DAY);
      return `${days}天${diff < 0 ? "后" : "前"}`;
    }
    if (absDiff < 30 * DATE_CONSTANTS.MILLISECONDS_PER_DAY) {
      const weeks = Math.floor(
        absDiff / (7 * DATE_CONSTANTS.MILLISECONDS_PER_DAY),
      );
      return `${weeks}周${diff < 0 ? "后" : "前"}`;
    }
    if (absDiff < 365 * DATE_CONSTANTS.MILLISECONDS_PER_DAY) {
      const months = Math.floor(
        absDiff / (30 * DATE_CONSTANTS.MILLISECONDS_PER_DAY),
      );
      return `${months}个月${diff < 0 ? "后" : "前"}`;
    }
    const years = Math.floor(
      absDiff / (365 * DATE_CONSTANTS.MILLISECONDS_PER_DAY),
    );
    return `${years}年${diff < 0 ? "后" : "前"}`;
  }

  // English
  if (absDiff < DATE_CONSTANTS.MILLISECONDS_PER_MINUTE) {
    return "just now";
  }
  if (absDiff < DATE_CONSTANTS.MILLISECONDS_PER_HOUR) {
    const mins = Math.floor(absDiff / DATE_CONSTANTS.MILLISECONDS_PER_MINUTE);
    return `${mins} minute${r(mins, "", "s")} ${diff < 0 ? "from now" : "ago"}`;
  }
  if (absDiff < DATE_CONSTANTS.MILLISECONDS_PER_DAY) {
    const hours = Math.floor(absDiff / DATE_CONSTANTS.MILLISECONDS_PER_HOUR);
    return `${hours} hour${r(hours, "", "s")} ${diff < 0 ? "from now" : "ago"}`;
  }
  if (absDiff < 7 * DATE_CONSTANTS.MILLISECONDS_PER_DAY) {
    const days = Math.floor(absDiff / DATE_CONSTANTS.MILLISECONDS_PER_DAY);
    return `${days} day${r(days, "", "s")} ${diff < 0 ? "from now" : "ago"}`;
  }
  if (absDiff < 30 * DATE_CONSTANTS.MILLISECONDS_PER_DAY) {
    const weeks = Math.floor(
      absDiff / (7 * DATE_CONSTANTS.MILLISECONDS_PER_DAY),
    );
    return `${weeks} week${r(weeks, "", "s")} ${diff < 0 ? "from now" : "ago"}`;
  }
  if (absDiff < 365 * DATE_CONSTANTS.MILLISECONDS_PER_DAY) {
    const months = Math.floor(
      absDiff / (30 * DATE_CONSTANTS.MILLISECONDS_PER_DAY),
    );
    return `${months} month${r(months, "", "s")} ${diff < 0 ? "from now" : "ago"}`;
  }
  const years = Math.floor(
    absDiff / (365 * DATE_CONSTANTS.MILLISECONDS_PER_DAY),
  );
  return `${years} year${r(years, "", "s")} ${diff < 0 ? "from now" : "ago"}`;
};

/**
 * 获取日期范围
 */
export const getDateRange = (
  range: "today" | "week" | "month" | "year" | "lastWeek" | "lastMonth",
): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "month":
      start.setMonth(now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "year":
      start.setFullYear(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "lastWeek":
      start.setDate(now.getDate() - 14);
      end.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "lastMonth":
      start.setMonth(now.getMonth() - 1, 1);
      end.setMonth(now.getMonth(), 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
};

/**
 * 格式化日期为友好字符串
 */
export const formatDateFriendly = (
  date: Date | string,
  locale: "zh-CN" | "en-US" = "zh-CN",
): string => {
  const d = new Date(date);

  if (isToday(d)) {
    return locale === "zh-CN" ? "今天" : "Today";
  }
  if (isYesterday(d)) {
    return locale === "zh-CN" ? "昨天" : "Yesterday";
  }
  if (isTomorrow(d)) {
    return locale === "zh-CN" ? "明天" : "Tomorrow";
  }

  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  if (year !== currentYear) {
    return `${year}-${month}-${day}`;
  }

  return `${month}-${day}`;
};

/**
 * 获取月份第一天
 */
export const getMonthStart = (date?: Date): Date => {
  const d = date ? new Date(date) : new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * 获取月份最后一天
 */
export const getMonthEnd = (date?: Date): Date => {
  const d = date ? new Date(date) : new Date();
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
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

/**
 * 判断日期是否在范围内
 */
export const isDateInRange = (
  date: Date | string,
  start: Date | string,
  end: Date | string,
): boolean => {
  const d = new Date(date).getTime();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return d >= s && d <= e;
};
