import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { purchaseOrderSchema } from '@/schemas/erp/purchaseOrder';
import { erpApi } from '@/api/erp';

const purchaseOrderApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await erpApi.purchaseOrders.list({
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    } as Parameters<typeof erpApi.purchaseOrders.list>[0]);
    if (!response.success) {
      throw new Error('加载采购订单列表失败');
    }
    const data = response.data;
    return {
      data: (data?.orders || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await erpApi.purchaseOrders.create(
      data as unknown as Parameters<typeof erpApi.purchaseOrders.create>[0]
    );
    if (!response.success) {
      throw new Error('创建采购订单失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await erpApi.purchaseOrders.update(
      id,
      data as unknown as Parameters<typeof erpApi.purchaseOrders.update>[1]
    );
    if (!response.success) {
      throw new Error('更新采购订单失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await erpApi.purchaseOrders.delete(id);
    if (!response.success) {
      throw new Error('删除采购订单失败');
    }
  },
};

const PurchaseOrderPage: React.FC = () => {
  return (
    <CrudPage
      schema={purchaseOrderSchema}
      apiAdapter={purchaseOrderApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '采购订单管理' },
      ]}
    />
  );
};

export default PurchaseOrderPage;
