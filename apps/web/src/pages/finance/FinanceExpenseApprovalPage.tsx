import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { expenseApprovalSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(financeApi.expenseApproval);

export default function FinanceExpenseApprovalPage() {
  const { t } = useTranslation('finance');
  return (
    <CrudPage
      schema={expenseApprovalSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: t('finance.finance_expense_approval_page.k1') },
        { label: t('finance.finance_expense_approval_page.k0') },
      ]}
    />
  );
}
