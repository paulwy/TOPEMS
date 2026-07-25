/**
 * 客户管理页面 — Schema 驱动的 CRUD 页面
 *
 * 使用 customerSchema 配置 + CrudPage 组件，
 * 代码量从 ~970 行缩减到 ~95 行，减少约 90%。
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { customerSchema } from '@/schemas/erp/customer';
import { erpApi } from '@/api/erp';

/**
 * 客户管理 API 适配器
 */
const customerApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await erpApi.customers.list({
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
      category: params?.category as string | undefined,
      industry: params?.industry as string | undefined,
    } as Parameters<typeof erpApi.customers.list>[0]);
    if (!response.success) {
      throw new Error('加载客户失败');
    }
    const data = response.data;
    return {
      data: (data?.customers || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await erpApi.customers.create(
      data as unknown as Parameters<typeof erpApi.customers.create>[0]
    );
    if (!response.success) {
      throw new Error('创建客户失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await erpApi.customers.update(
      id,
      data as unknown as Parameters<typeof erpApi.customers.update>[1]
    );
    if (!response.success) {
      throw new Error('更新客户失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await erpApi.customers.delete(id);
    if (!response.success) {
      throw new Error('删除客户失败');
    }
  },
};

/**
 * 客户管理页面组件
 */
const CustomerManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={customerSchema}
      apiAdapter={customerApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '客户管理' },
      ]}
    />
  );
};

export default CustomerManagementPage;
