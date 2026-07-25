import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { salesOrderSchema } from '@/schemas/erp/salesOrder';
import { erpApi } from '@/api/erp';

const salesOrderApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await erpApi.salesOrders.list({
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    } as Parameters<typeof erpApi.salesOrders.list>[0]);
    if (!response.success) {
      throw new Error('加载销售订单列表失败');
    }
    const data = response.data;
    return {
      data: (data?.orders || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await erpApi.salesOrders.create(
      data as unknown as Parameters<typeof erpApi.salesOrders.create>[0]
    );
    if (!response.success) {
      throw new Error('创建销售订单失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await erpApi.salesOrders.update(
      id,
      data as unknown as Parameters<typeof erpApi.salesOrders.update>[1]
    );
    if (!response.success) {
      throw new Error('更新销售订单失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await erpApi.salesOrders.delete(id);
    if (!response.success) {
      throw new Error('删除销售订单失败');
    }
  },
};

const SalesOrderPage: React.FC = () => {
  return (
    <CrudPage
      schema={salesOrderSchema}
      apiAdapter={salesOrderApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '销售订单管理' },
      ]}
    />
  );
};

export default SalesOrderPage;
