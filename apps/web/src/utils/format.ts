// 共享工具 - 从 shared-utils 导入
import {
  debounce,
  throttle,
  generateId,
  formatNumber as sharedFormatNumber,
  truncateText as sharedTruncateText,
} from '@topems/shared-utils';
import i18n from '@/i18n';

// 重新导出共享工具
export { debounce, throttle, generateId, sharedTruncateText as truncateText };

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
