// V66.7 P2-1 双实现说明：
// - 本文件是 pages/iam/ 目录的主实现（由 Admin 控制台 /admin/iam 路由统一调度）
// - 旧的兼容实现位于 src/iam/ 目录（由 App 根路由 /iam 访问，保留向后兼容）
// - 如非必要，请优先修改 pages/iam/ 中的新页面版本
/**
 * 用户管理页面 — Schema 驱动的 CRUD 页面
 *
 * 使用 userSchema 配置 + CrudPage 组件，
 * 代码量从 ~910 行缩减到 ~100 行，减少约 89%。
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { userSchema } from '@/schemas/iam/user';
import { authApi } from '@/api/iam';
import { IAM_PATHS } from '@/modules/iam/config';
import i18n from '@/i18n';

/**
 * 用户管理 API 适配器
 */
const userApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await authApi.listUsers({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
    });
    if (!response.success) {
      throw new Error(response.message || i18n.t('iam.user_management_page.k0'));
    }
    const data = response.data;
    return {
      data: (data?.users || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await authApi.createUser({
      username: String(data.username),
      email: String(data.email),
      password: String(data.password),
      full_name: data.full_name ? String(data.full_name) : undefined,
    });
    if (!response.success) {
      throw new Error(response.message || i18n.t('iam.user_management_page.k1'));
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await authApi.updateUser(id, {
      full_name: data.full_name ? String(data.full_name) : undefined,
      email: String(data.email),
      isactive: Boolean(data.isactive),
    });
    if (!response.success) {
      throw new Error(response.message || i18n.t('iam.user_management_page.k2'));
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await authApi.deleteUser(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('iam.user_management_page.k3'));
    }
  },
};

/**
 * 用户管理页面组件
 */
const UserManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={userSchema}
      apiAdapter={userApiAdapter}
      breadcrumbs={[
        { label: i18n.t('iam.user_management_page.k4'), href: '/dashboard' },
        { label: i18n.t('iam.user_management_page.k5'), href: IAM_PATHS.root },
        { label: i18n.t('iam.user_management_page.k6') },
      ]}
    />
  );
};

export default UserManagementPage;
