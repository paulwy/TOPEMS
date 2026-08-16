// 共享工具 - 从 shared-utils 导入
import {
  debounce,
  throttle,
  deepClone,
  generateId,
  formatNumber as sharedFormatNumber,
  formatCurrency as sharedFormatCurrency,
  formatFileSize as sharedFormatFileSize,
  truncateText as sharedTruncateText,
  capitalizeFirstLetter as sharedCapitalizeFirstLetter,
  clearCloneCache,
} from '@topems/shared-utils';
import i18n from '@/i18n';

// 重新导出共享工具
export {
  debounce,
  throttle,
  deepClone,
  generateId,
  sharedFormatNumber as formatNumberBase,
  sharedFormatCurrency as formatCurrencyBase,
  sharedTruncateText as truncateText,
  sharedCapitalizeFirstLetter as capitalizeFirstLetter,
  clearCloneCache,
};

const FORMAT_CACHE_SIZE = 100;

interface FormatCacheEntry {
  key: string;
  value: string;
  timestamp: number;
}

const formatCache: FormatCacheEntry[] = [];

const getCacheKey = (dateString: string, format: string): string => {
  return `${dateString}_${format}`;
};

const getFromCache = (key: string): string | undefined => {
  const entry = formatCache.find((e) => e.key === key);
  if (entry) {
    entry.timestamp = Date.now();
    return entry.value;
  }
  return undefined;
};

const addToCache = (key: string, value: string): void => {
  const existingIndex = formatCache.findIndex((e) => e.key === key);
  if (existingIndex !== -1) {
    formatCache[existingIndex].value = value;
    formatCache[existingIndex].timestamp = Date.now();
  } else {
    formatCache.push({ key, value, timestamp: Date.now() });
    if (formatCache.length > FORMAT_CACHE_SIZE) {
      formatCache.sort((a, b) => a.timestamp - b.timestamp);
      formatCache.shift();
    }
  }
};

// 保留缓存优化的 formatDate
export const formatDate = (dateString: string, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  const cacheKey = getCacheKey(dateString, format);
  const cachedValue = getFromCache(cacheKey);
  if (cachedValue) {
    return cachedValue;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    addToCache(cacheKey, dateString);
    return dateString;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const result = format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);

  addToCache(cacheKey, result);
  return result;
};

// 基于 shared-utils 的 formatNumber
export const formatNumber = (num: number | string, decimals: number = 2): string => {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '0';
  return sharedFormatNumber(number, decimals);
};

// 扩展货币符号支持
export const formatCurrency = (amount: number | string, currency: string = 'CNY'): string => {
  const number = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(number)) return '¥0.00';

  const symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbols[currency] || '¥';
  return `${symbol}${sharedFormatNumber(number, 2)}`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}${i18n.t('shared.format.duration.hour')}${minutes}${i18n.t('shared.format.duration.minute')}${secs}${i18n.t('shared.format.duration.second')}`;
  }
  if (minutes > 0) {
    return `${minutes}${i18n.t('shared.format.duration.minute')}${secs}${i18n.t('shared.format.duration.second')}`;
  }
  return `${secs}${i18n.t('shared.format.duration.second')}`;
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) {
    return i18n.t('shared.format.k0');
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}${i18n.t('shared.format.relative_time.minute_ago')}`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}${i18n.t('shared.format.relative_time.hour_ago')}`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}${i18n.t('shared.format.relative_time.day_ago')}`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}${i18n.t('shared.format.relative_time.week_ago')}`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}${i18n.t('shared.format.relative_time.month_ago')}`;
  } else {
    return `${Math.floor(diff / year)}${i18n.t('shared.format.relative_time.year_ago')}`;
  }
};

export const formatStatus = (status: string | number): string => {
  const statusMap: Record<string, string> = {
    0: i18n.t('shared.format.k1'),
    1: i18n.t('shared.format.k2'),
    active: i18n.t('shared.format.k3'),
    inactive: i18n.t('shared.format.k4'),
    pending: i18n.t('shared.format.k5'),
    approved: i18n.t('shared.format.k6'),
    rejected: i18n.t('shared.format.k7'),
    completed: i18n.t('shared.format.k8'),
    processing: i18n.t('shared.format.k9'),
    cancelled: i18n.t('shared.format.k10'),
    draft: i18n.t('shared.format.k11'),
    published: i18n.t('shared.format.k12'),
    deleted: i18n.t('shared.format.k13'),
    success: i18n.t('shared.format.k14'),
    failed: i18n.t('shared.format.k15'),
    warning: i18n.t('shared.format.k16'),
    error: i18n.t('shared.format.k17'),
  };
  return statusMap[String(status).toLowerCase()] || String(status);
};

export const formatPercent = (value: number | string, decimals: number = 1): string => {
  const number = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(number)) return '0%';
  return `${sharedFormatNumber(number * 100, decimals)}%`;
};

export const formatFileSize = (bytes: number | string): string => {
  const number = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (isNaN(number) || number <= 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(number) / Math.log(k));
  return `${sharedFormatNumber(number / Math.pow(k, i), 2)} ${sizes[i]}`;
};

export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

export const formatEmail = (email: string): string => {
  if (!email) return '';
  const [prefix, domain] = email.split('@');
  if (!prefix || !domain) return email;
  return `${prefix.slice(0, 2)}***@${domain}`;
};

export const formatIdCard = (idCard: string): string => {
  if (!idCard) return '';
  return idCard.replace(/(\d{4})\d+(\d{4})/, '$1**********$2');
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return `${startDate} - ${endDate}`;

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  if (sameDay) {
    return formatDate(startDate, 'YYYY-MM-DD');
  } else if (sameMonth) {
    return `${formatDate(startDate, 'MM-DD')} - ${formatDate(endDate, 'MM-DD')}`;
  } else if (sameYear) {
    return `${formatDate(startDate, 'MM-DD')} - ${formatDate(endDate, 'MM-DD')}`;
  } else {
    return `${formatDate(startDate, 'YYYY-MM-DD')} - ${formatDate(endDate, 'YYYY-MM-DD')}`;
  }
};

export const formatMonth = (dateString: string): string => {
  return formatDate(dateString, i18n.t('shared.format.yyyymm_12'));
};

export const formatWeek = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return `${formatDate(weekStart.toISOString(), 'MM-DD')} ~ ${formatDate(weekEnd.toISOString(), 'MM-DD')}`;
};
