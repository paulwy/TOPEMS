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
} from "@topems/shared-utils";

// 重新导出共享工具
export {
  debounce,
  throttle,
  deepClone,
  generateId,
  sharedFormatFileSize as formatFileSize,
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

let formatCache: FormatCacheEntry[] = [];

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
export const formatDate = (
  dateString: string,
  format: string = "YYYY-MM-DD HH:mm:ss",
): string => {
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
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const result = format
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);

  addToCache(cacheKey, result);
  return result;
};

// 基于 shared-utils 的 formatNumber
export const formatNumber = (
  num: number | string,
  decimals: number = 2,
): string => {
  const number = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(number)) return "0";
  return sharedFormatNumber(number, decimals);
};

// 扩展货币符号支持
export const formatCurrency = (
  amount: number | string,
  currency: string = "CNY",
): string => {
  const number = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(number)) return "¥0.00";

  const symbols: Record<string, string> = {
    CNY: "¥",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const symbol = symbols[currency] || "¥";
  return `${symbol}${sharedFormatNumber(number, 2)}`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分钟${secs}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  }
  return `${secs}秒`;
};
