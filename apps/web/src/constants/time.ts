/**
 * 时间单位常量（毫秒值）—— 集中管理源码中出现的魔法数字。
 *
 * 所有新代码禁止直接写 86400000 / 3600000 / 60000 这类硬编码，
 * 统一从本文件 import，提升可读性并杜绝笔误。
 */

/** 1 秒 = 1000 毫秒 */
const SECOND_MS = 1_000;
/** 1 分钟 = 60 秒 */
const MINUTE_MS = 60 * SECOND_MS;
/** 1 小时 = 60 分钟 */
const HOUR_MS = 60 * MINUTE_MS;
/** 1 天 = 24 小时 */
export const DAY_MS = 24 * HOUR_MS;
/** 秒 → 毫秒 */
export const seconds = (s: number): number => s * SECOND_MS;
/** 分钟 → 毫秒 */
export const minutes = (m: number): number => m * MINUTE_MS;
/** 小时 → 毫秒 */
export const hours = (h: number): number => h * HOUR_MS;
/** 天 → 毫秒 */
export const days = (d: number): number => d * DAY_MS;
