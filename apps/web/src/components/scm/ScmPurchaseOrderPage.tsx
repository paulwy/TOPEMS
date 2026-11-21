import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { purchaseOrderSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseOrders);

/**
 * SCM 采购订单页
 *
 * 此前复用 erp/PurchaseOrderPage（接 /api/erp/purchase-orders 空端点，
 * SCM 65 条真采购单不可见）；改为 schema 驱动，接 scm purchaseOrderApi。
 */
export default function ScmPurchaseOrderPage() {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={purchaseOrderSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.purchase_order.k7') }]}
    />
  );
}
