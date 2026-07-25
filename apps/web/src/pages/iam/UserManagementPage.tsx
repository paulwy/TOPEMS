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
      throw new Error(response.message || '加载用户失败');
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
      throw new Error(response.message || '创建用户失败');
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
      throw new Error(response.message || '更新用户失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await authApi.deleteUser(id);
    if (!response.success) {
      throw new Error(response.message || '删除用户失败');
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
        { label: '首页', href: '/dashboard' },
        { label: '身份管理', href: IAM_PATHS.root },
        { label: '用户管理' },
      ]}
    />
  );
};

export default UserManagementPage;
