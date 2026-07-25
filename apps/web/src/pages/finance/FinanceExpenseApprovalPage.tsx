import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { expenseApprovalSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';

const apiAdapter = createCrudPageAdapter(financeApi.expenseApproval);

export default function FinanceExpenseApprovalPage() {
  return (
    <CrudPage
      schema={expenseApprovalSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: '财务管理' }, { label: '报销审批' }]}
    />
  );
}
