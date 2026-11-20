import type { DbMenuItem } from '@/api/core/menus';

/** SideRail 支持的语义分组 code。 */
const NAV_GROUP_CODES = new Set([
  'overview',
  'master',
  'process',
  'business',
  'analytics',
  'report',
  'setting',
  'other',
]);

/** DB 分组 code 后缀 → SideRail 语义分组；不认识的 code 返回 undefined，由调用方回退 config。 */
export function navGroupFromDbMenu(dbItem?: DbMenuItem): string | undefined {
  const suffix = dbItem?.groupCode?.split('_').pop();
  return suffix && NAV_GROUP_CODES.has(suffix) ? suffix : undefined;
}
