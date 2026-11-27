/**
 * 列表 → 详情路径映射（自动汇总自各模块 config.ts 里的 `:id` 详情路由）
 *
 * 用途：ListPageTemplate 在页面未声明 onRowClick、也没有 crud 表单时，
 * 用它判断当前列表路径是否配有详情页，从而把行点击接到详情路由。
 *
 * 维护：新增/删除详情路由时同步增删本表条目（条目必须是 `<列表路径>/:id`）。
 */

export const DETAIL_PATH_PATTERNS = [
  '/aps/capacities/:id',
  '/aps/forecasts/:id',
  '/aps/material-plans/:id',
  '/aps/plan-comparison/:id',
  '/aps/production-plans/:id',
  '/aps/schedules/:id',
  '/crm/contacts/:id',
  '/crm/customers/:id',
  '/crm/opportunities/:id',
  '/crm/returns/:id',
  '/doc/documents/:id',
  '/hrm/contracts/:id',
  '/hrm/employees/:id',
  '/mes/equipment/:id',
  '/mes/production-orders/:id',
  '/notification/:id',
  '/plugin/:id',
  '/pm/contracts/:id',
  '/pm/projects/:id',
  '/qms/apqp/:id',
  '/qms/audit-management/:id',
  '/qms/eightd/:id',
  '/qms/fmea/:id',
  '/qms/inspection/:id',
  '/qms/issues/:id',
  '/qms/standards/:id',
  '/srm/contract/:id',
  '/srm/supplier/:id',
  '/tms/carriers/:id',
  '/tms/drivers/:id',
  '/tms/routes/:id',
  '/tms/shipments/:id',
  '/tms/transport-plans/:id',
  '/tms/vehicles/:id',
  '/wms/inbound-orders/:id',
  '/wms/inventory-movements/:id',
  '/wms/outbound-orders/:id',
  '/wms/stock-takes/:id',
  '/wms/supplier-detail/:id',
  '/wms/transfer-orders/:id',
  '/wms/wave-picks/:id',
  '/workflow/approvals/:id',
  '/workflow/instances/:id',
] as const;

/** 当前列表路径对应的详情路由模板（无则返回 undefined） */
export function resolveDetailPathPattern(pathname: string): string | undefined {
  const base = pathname.replace(/\/+$/, '');
  if (!base) return undefined;
  const pattern = `${base}/:id`;
  return (DETAIL_PATH_PATTERNS as readonly string[]).includes(pattern) ? pattern : undefined;
}
