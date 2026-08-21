/**
 * 客户管理页面 — Schema 驱动的 CRUD 页面
 *
 * 使用 customerSchema 配置 + CrudPage 组件，
 * 代码量从 ~970 行缩减到 ~95 行，减少约 90%。
 */
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { customerSchema } from '@/schemas/erp/customer';
import { erpApi } from '@/api/erp';
import i18n from '@/i18n';
/**
 * 客户管理 API 适配器
 */
const customerApiAdapter = createCrudPageAdapter(erpApi.customers, { itemsField: 'customers' });
/**
 * 客户管理页面组件
 */
const CustomerManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={customerSchema}
      apiAdapter={customerApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.customer_management_page.k4'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.customer_management_page.k5') },
      ]}
    />
  );
};
export default CustomerManagementPage;
