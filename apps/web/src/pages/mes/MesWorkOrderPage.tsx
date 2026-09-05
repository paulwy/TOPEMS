import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { workOrderSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(mesApi.workOrders);

export default function MesWorkOrderPage() {
  return (
    <CrudPage
      schema={workOrderSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.mes_work_order_page.k0') }]}
    />
  );
}
