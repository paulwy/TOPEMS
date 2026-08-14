import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { expenseSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(financeApi.account);

export default function FinanceExpensePage() {
  const { t } = useTranslation('finance');
  return (
    <CrudPage
      schema={expenseSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: t('finance.finance_expense_page.k1') },
        { label: t('finance.finance_expense_page.k0') },
      ]}
    />
  );
}
