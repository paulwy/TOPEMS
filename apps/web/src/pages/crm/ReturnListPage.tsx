import { useTranslation } from 'react-i18next';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { returnSchema } from '@/schemas/crm';
import { returnsApi } from '@/api/crm';

const apiAdapter = createCrudPageAdapter({
  list: returnsApi.list,
  create: returnsApi.create,
  update: returnsApi.update,
  delete: returnsApi.delete,
});

export default function ReturnListPage() {
  const { t } = useTranslation();
  return (
    <CrudPage
      schema={returnSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: t('crm.common.crm') }, { label: t('crm.returnList.title') }]}
    />
  );
}
