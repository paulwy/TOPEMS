import { useTranslation } from 'react-i18next';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { customerSchema } from '@/schemas/crm';
import { crmApi } from '@/api/crm';

const apiAdapter = createCrudPageAdapter(crmApi.customers);

export default function CustomerManagementPage() {
  const { t } = useTranslation();
  return (
    <CrudPage
      schema={customerSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: t('crm.common.crm') }, { label: t('crm.customerList.title') }]}
    />
  );
}
