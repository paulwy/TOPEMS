/**
 * 供应商管理页面 — Schema 驱动的 CRUD 页面
 *
 * 使用 supplierSchema 配置 + CrudPage 组件，
 * 代码量从 ~840 行缩减到 ~90 行，减少约 89%。
 *
 * 切 MDM 权威源（2026-11-07）：原 erpApi.suppliers 直连 /api/erp/suppliers，
 * 现统一改走 /api/master-data/suppliers。mdm list 信封为 { items, total, page, page_size }，
 * 与 erp 老信封 { suppliers, total, page, page_size } 不同，故去掉 itemsField='suppliers' 覆盖。
 */
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { supplierSchema } from '@/schemas/erp/supplier';
import { masterDataApi } from '@/api/master-data';
import i18n from '@/i18n';
/**
 * 供应商管理 API 适配器（切 MDM 后信封为 items，无需 itemsField 覆盖）
 */
const supplierApiAdapter = createCrudPageAdapter(masterDataApi.suppliers);
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
