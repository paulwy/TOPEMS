import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { receiptSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import type { ApiResponse, CollectionRecord } from '@/types/finance';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('finance');
  return (
    <CrudPage
      schema={receiptSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: t('finance.finance_receipt_page.k1') },
        { label: t('finance.finance_receipt_page.k0') },
      ]}
    />
  );
}
