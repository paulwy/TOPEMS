import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { purchaseOrderSchema } from '@/schemas/erp/purchaseOrder';
import { erpApi } from '@/api/erp';
import i18n from '@/i18n';

const purchaseOrderApiAdapter = createCrudPageAdapter(erpApi.purchaseOrders, { itemsField: 'orders' });
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
