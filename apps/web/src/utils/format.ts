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

export const formatNumber = (
  num: number | string,
  decimals: number = 2,
): string => {
  const number = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(number)) return "0";
  return number.toLocaleString("zh-CN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

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
  return `${symbol}${formatNumber(number, 2)}`;
};

export const truncateText = (
  text: string,
  maxLength: number = 50,
  suffix: string = "...",
): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
};

export const capitalizeFirstLetter = (text: string): string => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

let cloneMap = new WeakMap<object, unknown>();

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") return obj;

  if (cloneMap.has(obj)) {
    return cloneMap.get(obj) as T;
  }

  if (Array.isArray(obj)) {
    const clone: unknown[] = [];
    cloneMap.set(obj, clone);
    for (let i = 0; i < obj.length; i++) {
      clone[i] = deepClone(obj[i]);
    }
    return clone as unknown as T;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }

  const clone: Record<string, unknown> = {};
  cloneMap.set(obj, clone);

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }

  return clone as T;
};

export const clearCloneCache = (): void => {
  // WeakMap doesn't have a clear method, so we create a new instance
  cloneMap = new WeakMap<object, unknown>();
};

export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object")
    return Object.keys(value as object).length === 0;
  return false;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  const formattedSize = i === 0 ? Math.round(size).toString() : size.toFixed(2);
  return `${formattedSize} ${sizes[i]}`;
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
