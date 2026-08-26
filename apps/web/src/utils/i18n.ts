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
