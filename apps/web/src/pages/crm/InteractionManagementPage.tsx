import { useTranslation } from 'react-i18next';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { interactionSchema } from '@/schemas/crm';
import { interactionApi } from '@/api/crm';

const apiAdapter: CrudApiAdapter<Record<string, unknown>> = {
  list: async (params) => {
    const response = await interactionApi.list(params);
    if (!response.success) {
      throw new Error(response.message || 'Failed to load interactions');
    }
    const raw = response.data as unknown;
    const items: Record<string, unknown>[] = Array.isArray(raw)
      ? raw
      : ((raw as { items?: Record<string, unknown>[] }).items ?? []);
    const total: number = Array.isArray(raw)
      ? items.length
      : ((raw as { total?: number }).total ?? items.length);
    return { data: items, total };
  },
  create: async () => {
    throw new Error('Interactions are read-only');
  },
  update: async () => {
    throw new Error('Interactions are read-only');
  },
  delete: async () => {
    throw new Error('Interactions are read-only');
  },
};

export default function InteractionManagementPage() {
  const { t } = useTranslation();
  return (
    <CrudPage
      schema={{
        ...interactionSchema,
        actions: interactionSchema.actions?.filter((a) => a === 'detail'),
      }}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: t('crm.common.crm') }, { label: t('crm.interactionList.title') }]}
    />
  );
}
