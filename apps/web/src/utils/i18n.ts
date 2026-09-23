// This is the i18n utility wrapper. It intentionally uses the module-level
// `i18n` instance directly (not `useTranslation()`) because it is a non-React
// helper used outside of the component render cycle. Do NOT convert these to
// `useTranslation()` — this file is the legitimate bridge for such cases.
import i18n from '../i18n';

export function tpl(key: string, vars: Record<string, unknown> = {}): string {
  const translation = i18n.t(key);
  return Object.entries(vars).reduce(
    (result, [varName, value]) => result.replace(new RegExp(`{{${varName}}}`, 'g'), String(value)),
    translation
  );
}

/**
 * 根据当前 locale 返回后端数据的双语名称。
 * - en 且 name_en 有值 → name_en
 * - 其他情况（zh、或 name_en 为 null/空）→ name（中文 fallback）
 * 用于消费后端已补 name_en 列的实体（supplier / customer / aux_account / workflow 等）。
 * 数据值不抽 i18n 键，这是运行时数据选择，不是界面文案。
 */
export function localizedName(
  name: string | null | undefined,
  nameEn?: string | null,
  locale?: string
): string {
  const lng = locale ?? i18n.language ?? 'zh';
  if (lng.startsWith('en') && nameEn && nameEn.trim()) {
    return nameEn;
  }
  return name ?? '';
}
