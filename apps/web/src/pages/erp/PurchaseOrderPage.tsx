import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { purchaseOrderSchema } from '@/schemas/erp/purchaseOrder';
import { erpApi } from '@/api/erp';
import i18n from '@/i18n';

const purchaseOrderApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await erpApi.purchaseOrders.list({
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    } as Parameters<typeof erpApi.purchaseOrders.list>[0]);
    if (!response.success) {
      throw new Error(i18n.t('erp.purchase_order_page.k0'));
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
      throw new Error(i18n.t('erp.purchase_order_page.k1'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await erpApi.purchaseOrders.update(
      id,
      data as unknown as Parameters<typeof erpApi.purchaseOrders.update>[1]
    );
    if (!response.success) {
      throw new Error(i18n.t('erp.purchase_order_page.k2'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await erpApi.purchaseOrders.delete(id);
    if (!response.success) {
      throw new Error(i18n.t('erp.purchase_order_page.k3'));
    }
  },
};
const PurchaseOrderPage: React.FC = () => {
  return (
    <CrudPage
      schema={purchaseOrderSchema}
      apiAdapter={purchaseOrderApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.purchase_order_page.k4'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.purchase_order_page.k5') },
      ]}
    />
  );
};
export default PurchaseOrderPage;
