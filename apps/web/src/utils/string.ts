/**
 * 字符串处理工具函数
 */

/**
 * 去除字符串空格
 */
export const trim = (str: string): string => {
  return str.replace(/^\s+|\s+$/g, "");
};

/**
 * 去除所有空格
 */
export const trimAll = (str: string): string => {
  return str.replace(/\s+/g, "");
};

/**
 * 将字符串转换为驼峰命名
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
};

/**
 * 将字符串转换为蛇形命名
 */
export const toSnakeCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
};

/**
 * 将字符串转换为短横线命名
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
};

/**
 * 首字母大写
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * 首字母小写
 */
export const uncapitalize = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

/**
 * 重复字符串
 */
export const repeat = (str: string, times: number): string => {
  return str.repeat(times);
};

/**
 * 填充字符串到指定长度
 */
export const padStart = (
  str: string,
  length: number,
  char: string = " ",
): string => {
  return str.padStart(length, char);
};

/**
 * 填充字符串到指定长度（尾部）
 */
export const padEnd = (
  str: string,
  length: number,
  char: string = " ",
): string => {
  return str.padEnd(length, char);
};

/**
 * 截断字符串
 */
export const truncate = (
  str: string,
  maxLength: number,
  suffix: string = "...",
): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * 隐藏手机号中间四位
 */
export const maskPhone = (phone: string): string => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
};

/**
 * 隐藏邮箱
 */
export const maskEmail = (email: string): string => {
  return email.replace(/(.{2}).*(@.*)/, "$1***$2");
};

/**
 * 隐藏身份证号中间部分
 */
export const maskIdCard = (idCard: string): string => {
  return idCard.replace(/(\d{4})\d+(\d{4})/, "$1**********$2");
};

/**
 * 生成随机字符串
 */
export const randomString = (length: number = 8): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 生成数字字符串
 */
export const randomNumber = (length: number = 6): string => {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 转换为URL友好字符串
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * 移除HTML标签
 */
export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, "");
};

/**
 * 转义HTML特殊字符
 */
export const escapeHtml = (str: string): string => {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
};

/**
 * 反转义HTML
 */
export const unescapeHtml = (str: string): string => {
  const unescapeMap: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };
  return str.replace(
    /&(amp|lt|gt|quot|#39);/g,
    (_, name) => unescapeMap[`&${name};`],
  );
};

/**
 * 判断是否为空字符串
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  return str === null || str === undefined || str.trim() === "";
};

/**
 * 判断是否为非空字符串
 */
export const isNotEmpty = (str: string | null | undefined): boolean => {
  return !isEmpty(str);
};

/**
 * 限制字符串长度
 */
export const limitLength = (
  str: string,
  maxLength: number,
  suffix: string = "...",
): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + suffix;
};

/**
 * 格式化文件大小
 */
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * 将下划线命名转换为标题格式
 */
export const snakeToTitle = (str: string): string => {
  return str
    .split("_")
    .map((word) => capitalize(word.toLowerCase()))
    .join(" ");
};

/**
 * 将驼峰命名转换为标题格式
 */
export const camelToTitle = (str: string): string => {
  return str
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word) => capitalize(word.toLowerCase()))
    .join(" ");
};
