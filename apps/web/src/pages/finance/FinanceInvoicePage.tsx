import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { invoiceSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter({
  list: (params?: Record<string, unknown>) =>
    financeApi.receivablePayable.listSalesInvoices(params),
  create: (data: unknown) =>
    financeApi.receivablePayable.createSalesInvoice(
      data as Parameters<typeof financeApi.receivablePayable.createSalesInvoice>[0]
    ),
  update: (id: string, data: unknown) =>
    financeApi.receivablePayable.updateSalesInvoice(
      id,
      data as Parameters<typeof financeApi.receivablePayable.updateSalesInvoice>[1]
    ),
  delete: (id: string) => financeApi.receivablePayable.deleteSalesInvoice(id),
});

export default function FinanceInvoicePage() {
  const { t } = useTranslation('finance');
  return (
    <CrudPage
      schema={invoiceSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: t('finance.finance_invoice_page.k1') },
        { label: t('finance.finance_invoice_page.k0') },
      ]}
    />
  );
}
