import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { salesOrderSchema } from '@/schemas/erp/salesOrder';
import { erpApi } from '@/api/erp';
import i18n from '@/i18n';

const salesOrderApiAdapter = createCrudPageAdapter(erpApi.salesOrders, { itemsField: 'orders' });
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
