import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { paymentSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';

const apiAdapter = createCrudPageAdapter({
  list: financeApi.payment.list,
  create: financeApi.payment.create,
  update: financeApi.payment.update,
  delete: (id: string) => financeApi.payment.remove(id),
});

export default function FinancePaymentPage() {
  return (
    <CrudPage
      schema={paymentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: '财务' }, { label: '付款管理' }]}
    />
  );
}
