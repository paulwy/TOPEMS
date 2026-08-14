import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { salesOrderSchema } from '@/schemas/erp/salesOrder';
import { erpApi } from '@/api/erp';
import i18n from '@/i18n';
const salesOrderApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await erpApi.salesOrders.list({
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    } as Parameters<typeof erpApi.salesOrders.list>[0]);
    if (!response.success) {
      throw new Error(i18n.t('erp.sales_order_page.k0'));
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
      throw new Error(i18n.t('erp.sales_order_page.k1'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await erpApi.salesOrders.update(
      id,
      data as unknown as Parameters<typeof erpApi.salesOrders.update>[1]
    );
    if (!response.success) {
      throw new Error(i18n.t('erp.sales_order_page.k2'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await erpApi.salesOrders.delete(id);
    if (!response.success) {
      throw new Error(i18n.t('erp.sales_order_page.k3'));
    }
  },
};
const SalesOrderPage: React.FC = () => {
  return (
    <CrudPage
      schema={salesOrderSchema}
      apiAdapter={salesOrderApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.sales_order_page.k4'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.sales_order_page.k5') },
      ]}
    />
  );
};
export default SalesOrderPage;