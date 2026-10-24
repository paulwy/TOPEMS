// This is the i18n utility wrapper. It intentionally uses the module-level
// `i18n` instance directly (not `useTranslation()`) because it is a non-React
// helper used outside of the component render cycle. Do NOT convert these to
// `useTranslation()` — this file is the legitimate bridge for such cases.
import i18n from '../i18n';

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
