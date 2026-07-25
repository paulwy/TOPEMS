import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { workOrderSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';

const apiAdapter = createCrudPageAdapter(mesApi.workOrders);

export default function MesWorkOrderPage() {
  return (
    <CrudPage
      schema={workOrderSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: '工单管理' }]}
    />
  );
}
