/**
 * 搜索模块 Mock 数据
 *
 * 从 src/api/search/mock.ts 迁移至集中管理
 */

export interface MockSearchResult {
  id: string;
  title: string;
  description?: string;
  module: string;
  path: string;
  type_name: string;
}

const mockResults: MockSearchResult[] = [
  { id: '1', title: '管理员账户', description: '系统超级管理员', module: 'user', path: '/system/users', type_name: '用户' },
  { id: '2', title: '张三 - 销售经理', description: '华东区销售团队', module: 'user', path: '/system/users/1', type_name: '用户' },
  { id: '3', title: '李四 - 采购专员', description: '采购部门', module: 'user', path: '/system/users/2', type_name: '用户' },
  { id: '4', title: '腾讯科技有限公司', description: 'VIP客户 | 深圳市南山区', module: 'customer', path: '/crm/customers/1', type_name: '客户' },
  { id: '5', title: '阿里巴巴集团', description: '战略客户 | 杭州市余杭区', module: 'customer', path: '/crm/customers/2', type_name: '客户' },
  { id: '6', title: 'SO-2024-001 销售订单', description: '¥128,000 | 腾讯科技 | 待审批', module: 'order', path: '/sales/orders/1', type_name: '订单' },
  { id: '7', title: 'PO-2024-015 采购订单', description: '¥56,000 | 供应商A | 已完成', module: 'order', path: '/purchase/orders/15', type_name: '订单' },
  { id: '8', title: '企业版授权许可', description: 'SKU-001 | ¥99,800/年', module: 'product', path: '/products/1', type_name: '产品' },
  { id: '9', title: '标准版授权许可', description: 'SKU-002 | ¥29,800/年', module: 'product', path: '/products/2', type_name: '产品' },
  { id: '10', title: '仓库A库存盘点', description: '2024Q4 | 进行中', module: 'product', path: '/inventory/check/1', type_name: '库存' },
  { id: '11', title: '2024年度财务报表', description: '年度汇总 | 已生成', module: 'document', path: '/finance/reports/annual', type_name: '报表' },
  { id: '12', title: 'Q3销售分析报告', description: '季度报告 | 草稿', module: 'document', path: '/finance/reports/q3', type_name: '报表' },
  { id: '13', title: '角色权限配置', description: '系统角色管理', module: 'admin', path: '/system/roles', type_name: '配置' },
  { id: '14', title: '数据字典管理', description: '系统数据字典', module: 'admin', path: '/system/dict', type_name: '配置' },
  { id: '15', title: '采购审批流程', description: '工作流模板 | 活跃', module: 'admin', path: '/system/workflow/1', type_name: '流程' },
];

export function getMockSearchResults(query: string, limit: number): MockSearchResult[] {
  const lowerQuery = query.toLowerCase();
  return mockResults
    .filter(
      (r) =>
        r.title.toLowerCase().includes(lowerQuery) ||
        r.description?.toLowerCase().includes(lowerQuery) ||
        r.module.toLowerCase().includes(lowerQuery) ||
        r.type_name.toLowerCase().includes(lowerQuery),
    )
    .slice(0, limit);
}

export const isDev = import.meta.env.DEV;

export function shouldUseMock(): boolean {
  if (import.meta.env.VITE_USE_MOCK === 'true') return true;
  if (isDev && !import.meta.env.VITE_API_BASE_URL) return true;
  return false;
}

export function getMockFallback(query: string, limit: number): MockSearchResult[] {
  return getMockSearchResults(query, limit);
}
