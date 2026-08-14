import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { paymentSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter({
  list: financeApi.payment.list,
  create: financeApi.payment.create,
  update: financeApi.payment.update,
  delete: (id: string) => financeApi.payment.remove(id),
});

export default function FinancePaymentPage() {
  const { t } = useTranslation('finance');
  return (
    <CrudPage
      schema={paymentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: t('finance.finance_payment_page.k1') },
        { label: t('finance.finance_payment_page.k0') },
      ]}
    />
  );
}
