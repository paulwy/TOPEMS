/**
 * 各业务模块通用的"动态下拉"数据源 loader。
 *
 * 背景：大量 schema 里的 *_id 字段是裸文本框（要求用户手填 UUID）或空下拉，
 * 新建弹窗实际上填不出合法值。这里按权威来源集中提供选项 loader，schema 只需：
 *
 *   dynamicOptions: [{ field: 'supplier_id', queryKey: [...], loader: loadSrmSupplierOptions }]
 *
 * 响应体形状各服务不统一（srm 是 data.suppliers、scm/mes 多为 data.items），
 * 统一在这里抹平，避免每个 schema 各写一份踩一遍坑。
 */
import { srmApi } from '@/api/srm';
import { supplierApi } from '@/api/scm/supplier';
import { purchaseOrderApi } from '@/api/scm/purchaseOrder';
import { employeeApi } from '@/api/hrm';
import { productionOrderApi } from '@/api/mes/productionOrder';
import apiClient from '@/api/client';
import { projectApi } from '@/api/rd/project';
import { buildApi } from '@/api/rd/build';
import { formulaApi } from '@/api/rd/formula';

export interface SelectOption {
  value: string;
  label: string;
}

type Row = Record<string, unknown>;

function pickRows(payload: unknown, keys: string[]): Row[] {
  if (Array.isArray(payload)) return payload as Row[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) return value as Row[];
    if (value && typeof value === 'object') {
      const nested = pickRows(value, keys);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function toOptions(rows: Row[], labelKeys: string[]): SelectOption[] {
  return rows
    .filter((row) => typeof row.id === 'string' && row.id)
    .map((row) => {
      const label = labelKeys.map((k) => row[k]).find((v) => typeof v === 'string' && v.trim());
      return { value: row.id as string, label: (label as string) || (row.id as string) };
    });
}

/** SRM 供应商（srm.suppliers） */
export async function loadSrmSupplierOptions(): Promise<SelectOption[]> {
  const res = await srmApi.listSuppliers();
  return toOptions(pickRows((res as { data?: unknown })?.data, ['suppliers', 'items']), [
    'name',
    'name_en',
    'supplier_no',
  ]);
}

/** SCM 供应商（scm 自己的供应商台账） */
export async function loadScmSupplierOptions(): Promise<SelectOption[]> {
  const res = await supplierApi.list({ page: 1, page_size: 200 });
  return toOptions(pickRows((res as { data?: unknown })?.data, ['items', 'suppliers']), [
    'name',
    'short_name',
    'supplier_no',
  ]);
}

/** SCM 采购订单（送货预约要挂到具体订单上） */
export async function loadScmPurchaseOrderOptions(): Promise<SelectOption[]> {
  const res = await purchaseOrderApi.list({ page: 1, page_size: 200 });
  return toOptions(pickRows((res as { data?: unknown })?.data, ['items', 'orders']), [
    'order_number',
    'order_no',
  ]);
}

/** SRM 询价单（srm.inquiries）：报价必须挂在一张询价上 */
export async function loadSrmInquiryOptions(): Promise<SelectOption[]> {
  const res = await srmApi.listInquiries();
  return toOptions(pickRows((res as { data?: unknown })?.data, ['items', 'inquiries']), [
    'inquiry_no',
    'title',
  ]);
}

/** HRM 员工（hrm.employees） */
export async function loadHrmEmployeeOptions(): Promise<SelectOption[]> {
  const res = await employeeApi.list({ page: 1, page_size: 200 });
  return toOptions(pickRows((res as { data?: unknown })?.data, ['items', 'employees']), [
    'name',
    'employee_no',
  ]);
}

/** MES 生产订单（mes.production_orders）：工单类外键必需 */
export async function loadMesOrderOptions(): Promise<SelectOption[]> {
  const res = await productionOrderApi.list({ page: 1, page_size: 200 });
  return toOptions(pickRows((res as { data?: unknown })?.data, ['orders', 'items']), [
    'order_no',
    'order_number',
    'product_name',
  ]);
}

/** MES 工位（mes.work_stations）：工号 + 名称 */
export async function loadMesWorkstationOptions(): Promise<SelectOption[]> {
  const res = await apiClient.mes.get('/workstations?page=1&page_size=200');
  return toOptions(pickRows((res as { data?: unknown })?.data, ['workstations', 'items']), [
    'name',
    'station_no',
  ]);
}

/** RD 项目（rd.projects）：项目/工单类外键 */
export async function loadRdProjectOptions(): Promise<SelectOption[]> {
  const res = await projectApi.listProjects({ page: 1, page_size: 200 });
  return toOptions(pickRows((res as { data?: unknown })?.data, ['projects', 'items']), [
    'code',
    'name',
  ]);
}

/** RD 构建（rd.builds）：部署/发布要挂到具体构建上 */
export async function loadRdBuildOptions(): Promise<SelectOption[]> {
  const res = await buildApi.listBuilds({ page: 1, page_size: 200 });
  return toOptions(pickRows((res as { data?: unknown })?.data, ['items', 'builds']), [
    'build_no',
    'branch',
  ]);
}

/** RD 配方（rd.formulas）：发布/评审要选具体配方 */
export async function loadRdFormulaOptions(): Promise<SelectOption[]> {
  const res = await formulaApi.listFormulas({ page: 1, page_size: 200 });
  return toOptions(pickRows((res as { data?: unknown })?.data, ['items', 'formulas']), [
    'code',
    'name',
  ]);
}
