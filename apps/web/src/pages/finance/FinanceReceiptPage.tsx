import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { receiptSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';

const apiAdapter = createCrudPageAdapter({
  list: (params?: Record<string, unknown>) => financeApi.receivablePayable.listCollections(params),
  create: (data: unknown) =>
    financeApi.receivablePayable.createCollection(
      data as Parameters<typeof financeApi.receivablePayable.createCollection>[0]
    ),
  update: async (id: string, data: unknown) => {
    return data;
  },
  delete: async (_id: string) => {
    return;
  },
});

export default function FinanceReceiptPage() {
  return (
    <CrudPage
      schema={receiptSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: '财务' }, { label: '收款管理' }]}
    />
  );
}
