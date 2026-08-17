/**
 * 供应商管理页面 — Schema 驱动的 CRUD 页面
 *
 * 使用 supplierSchema 配置 + CrudPage 组件，
 * 代码量从 ~840 行缩减到 ~90 行，减少约 89%。
 */
import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { supplierSchema } from '@/schemas/erp/supplier';
import { erpApi } from '@/api/erp';
import i18n from '@/i18n';
/**
 * 供应商管理 API 适配器
 */
const supplierApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await erpApi.suppliers.list({
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
      category: params?.category as string | undefined,
    } as Parameters<typeof erpApi.suppliers.list>[0]);
    if (!response.success) {
      throw new Error(i18n.t('erp.supplier_management_page.k0'));
    }
    const data = response.data;
    return {
      data: (data?.suppliers || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },
  create: async (data) => {
    const response = await erpApi.suppliers.create(
      data as unknown as Parameters<typeof erpApi.suppliers.create>[0]
    );
    if (!response.success) {
      throw new Error(i18n.t('erp.supplier_management_page.k1'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await erpApi.suppliers.update(
      id,
      data as unknown as Parameters<typeof erpApi.suppliers.update>[1]
    );
    if (!response.success) {
      throw new Error(i18n.t('erp.supplier_management_page.k2'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await erpApi.suppliers.delete(id);
    if (!response.success) {
      throw new Error(i18n.t('erp.supplier_management_page.k3'));
    }
  },
};
/**
 * 供应商管理页面组件
 */
const SupplierManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={supplierSchema}
      apiAdapter={supplierApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.supplier_management_page.k4'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.supplier_management_page.k5') },
      ]}
    />
  );
};
export default SupplierManagementPage;
