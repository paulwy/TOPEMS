import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { expenseSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';

const apiAdapter = createCrudPageAdapter(financeApi.account);

export default function FinanceExpensePage() {
  return (
    <CrudPage
      schema={expenseSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: '财务' }, { label: '费用管理' }]}
    />
  );
}
