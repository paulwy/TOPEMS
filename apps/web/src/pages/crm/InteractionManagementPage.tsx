import { useTranslation } from 'react-i18next';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { interactionSchema } from '@/schemas/crm';
import { interactionApi } from '@/api/crm';

const apiAdapter = createCrudPageAdapter({
  list: interactionApi.list,
  create: interactionApi.create,
  update: interactionApi.update,
  delete: interactionApi.delete,
});

export default function InteractionManagementPage() {
  const { t } = useTranslation();
  return (
    <CrudPage
      schema={interactionSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: t('crm.common.crm') }, { label: t('crm.interactionList.title') }]}
    />
  );
}
