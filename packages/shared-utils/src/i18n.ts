/**
 * 简单的 i18n 翻译函数
 *
 * 使用方式:
 * - 在 web 中替换为 i18next.t() 实际翻译
 * - 在其他环境中直接返回 key
 *
 * 示例:
 *   t('password.length.too_short')  // "密码长度至少为8个字符" 或 "password.length.too_short"
 */

type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

// 默认翻译函数：直接返回 key
const defaultTranslate: TranslateFunction = (key) => key;

// 可被外部替换的翻译函数
let translateFn: TranslateFunction = defaultTranslate;

/**
 * 初始化翻译函数
 * @param t 翻译函数
 */
export const initTranslate = (t: TranslateFunction): void => {
  translateFn = t;
};

/**
 * 翻译函数
 * @param key i18n key
 * @param params 替换参数 { name: 'John' } -> "Hello, John"
 * @returns 翻译后的字符串
 */
export const t = (key: string, params?: Record<string, string | number>): string => {
  let result = translateFn(key, params);

  // 如果翻译函数返回的仍是 key（即未翻译），尝试简单的 fallback
  if (result === key && params) {
    // 简单的参数替换: "Hello, {name}" -> "Hello, John"
    Object.entries(params).forEach(([paramKey, value]) => {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
    });
  }

  return result;
};
