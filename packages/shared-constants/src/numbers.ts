/**
 * 统一数字常量
 * 用于替代代码中的魔法数字
 * 使用方法：import { EARTH, REFRESH_INTERVAL } from "@topems/shared-constants";
 */

// ========== 地球和地理常量 ==========
export const EARTH = {
  RADIUS_METERS: 6371000, // 地球半径（米）
  METERS_PER_KILOMETER: 1000,
  SQUARE_METERS_PER_HECTARE: 10000,
} as const;

// ========== 时间常量（毫秒） ==========
export const REFRESH_INTERVAL = {
  MINUTE: 60000, // 1分钟
  MINUTE_5: 300000, // 5分钟
  MINUTE_10: 600000, // 10分钟
  MINUTE_30: 1800000, // 30分钟
  HOUR: 3600000, // 1小时
} as const;

// ========== 性能监控 ==========
export const PERFORMANCE = {
  DEFAULT_SAMPLE_RATE: 1000, // 默认采样率（毫秒）
  MAX_BATCH_SIZE: 50, // 最大批量处理数量
  DEBOUNCE_DELAY: 300, // 防抖延迟（毫秒）
  THROTTLE_DELAY: 100, // 节流延迟（毫秒）
} as const;

// ========== 分页常量 ==========
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 1000,
} as const;

// ========== 文件上传 ==========
export const FILE_UPLOAD = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;

// ========== 资产相关常量 ==========
export const ASSET_VALUES = {
  VEHICLE_ORIGINAL: 50000000,
  VEHICLE_RESIDUAL: 2500000,
  EQUIPMENT_DEFAULT: 450000,
  PROJECT_BUDGET_MIN: 10000,
  PROJECT_BUDGET_MAX: 100000000,
} as const;

// ========== 地图相关常量 ==========
export const MAP = {
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
  DEFAULT_CENTER: {
    lat: 39.9042, // 北京
    lng: 116.4074,
  },
  TILE_CACHE_SIZE: 100, // 瓦片缓存数量
  MAX_TRACK_POINTS: 10000, // 最大轨迹点数
} as const;

// ========== 动画时长（毫秒） ==========
export const ANIMATION = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
  DURATION_1: 1000,
  DURATION_2: 2000,
  DURATION_3: 3000,
} as const;

// ========== 验证相关 ==========
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 32,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  PHONE_REGEX: /^1[3-9]\d{9}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// ========== 轨迹相关 ==========
export const TRACK = {
  POINT_INTERVAL_MS: 60000, // 轨迹点间隔（1分钟）
  MIN_DISTANCE_METERS: 1000, // 最小距离（用于显示单位转换）
  MIN_AREA_SQUARE_METERS: 10000, // 最小面积（用于公顷转换）
  DEFAULT_SPEED_KMH: 60, // 默认速度（km/h）
  MAX_SPEED_KMH: 200, // 最大速度（km/h）
  POINT_RANDOM_RANGE: 5000, // 随机范围（用于模拟数据）
} as const;

// ========== 日期格式 ==========
export const DATE_FORMAT = {
  FULL: 'YYYY-MM-DD HH:mm:ss',
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  SHORT_DATE: 'MM/DD',
  MONTH: 'YYYY-MM',
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
} as const;

// ========== 辅助函数 ==========

/**
 * 格式化距离（米转公里）
 */
export function formatDistance(meters: number): string {
  if (meters < EARTH.METERS_PER_KILOMETER) {
    return `${meters.toFixed(2)} 米`;
  }
  return `${(meters / EARTH.METERS_PER_KILOMETER).toFixed(2)} 公里`;
}

/**
 * 格式化面积（平方米转公顷）
 */
export function formatArea(squareMeters: number): string {
  if (squareMeters < EARTH.SQUARE_METERS_PER_HECTARE) {
    return `${squareMeters.toFixed(2)} 平方米`;
  }
  return `${(squareMeters / EARTH.SQUARE_METERS_PER_HECTARE).toFixed(2)} 公顷`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}