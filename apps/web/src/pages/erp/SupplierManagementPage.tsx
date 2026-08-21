/**
 * 供应商管理页面 — Schema 驱动的 CRUD 页面
 *
 * 使用 supplierSchema 配置 + CrudPage 组件，
 * 代码量从 ~840 行缩减到 ~90 行，减少约 89%。
 */
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { supplierSchema } from '@/schemas/erp/supplier';
import { erpApi } from '@/api/erp';
import i18n from '@/i18n';
/**
 * 供应商管理 API 适配器
 */
const supplierApiAdapter = createCrudPageAdapter(erpApi.suppliers, { itemsField: 'suppliers' });
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
