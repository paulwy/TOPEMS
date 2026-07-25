import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { invoiceSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';

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
  return (
    <CrudPage
      schema={invoiceSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: '财务' }, { label: '发票管理' }]}
    />
  );
}
