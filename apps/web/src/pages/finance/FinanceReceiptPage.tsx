import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { receiptSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import type { ApiResponse, CollectionRecord } from '@/types/finance';

const apiAdapter = createCrudPageAdapter({
  list: (params?: Record<string, unknown>) => financeApi.receivablePayable.listCollections(params),
  create: (data: unknown) =>
    financeApi.receivablePayable.createCollection(
      data as Parameters<typeof financeApi.receivablePayable.createCollection>[0]
    ),
  update: async (_id: string, data: unknown) => {
    return data as unknown as ApiResponse<CollectionRecord>;
  },
  delete: async (_id: string) => {
    return undefined as unknown as ApiResponse<unknown>;
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
