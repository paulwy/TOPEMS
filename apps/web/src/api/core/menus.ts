import apiClient from '@/api/client';

/**
 * Phase 1：角色化菜单读取（DB 运行时权威）。
 *
 * 后端 GET /api/core/menus 按当前用户 Claims 的权限裁剪，返回
 * code/titleKey/path/order/visible/parentCode（含 children 树）。
 * 前端只把它作为「可见性 / 顺序 / 路径」的权威来源；模块分组、
 * 图标与 i18n 仍复用现有 config 声明（Phase 3 才删除前端声明）。
 */
export interface DbMenuItem {
  code: string;
  titleKey: string;
  title: string;
  path?: string;
  order: number;
  visible: boolean;
  parentCode?: string;
  icon?: string;
  /** DB 分组 code，如 `finance_business`；前端取后缀还原 `business` 语义分组。 */
  groupCode?: string;
  /** DB 分组展示名（中文兜底，当前仅透传）。 */
  groupName?: string;
  /** DB 分组排序（`core_menu_groups.sort_order`）。 */
  groupOrder?: number;
  children?: DbMenuItem[];
}

export interface DbMenuResponse {
  items: DbMenuItem[];
  total: number;
}

export const fetchMyMenus = async (): Promise<DbMenuResponse> => {
  const response = await apiClient.core.get<DbMenuResponse>('/menus');
  if (!response.success || !response.data) {
    throw new Error(response.message || '菜单接口返回失败');
  }
  return response.data;
};
