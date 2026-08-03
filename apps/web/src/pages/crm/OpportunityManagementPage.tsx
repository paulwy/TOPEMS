import { useTranslation } from 'react-i18next';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { opportunitySchema } from '@/schemas/crm';
import { crmApi } from '@/api/crm';

const apiAdapter = createCrudPageAdapter(crmApi.opportunities);

export default function OpportunityManagementPage() {
  const { t } = useTranslation();
  return (
    <CrudPage
      schema={opportunitySchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: t('crm.common.crm') }, { label: t('crm.opportunityList.title') }]}
    />
  );
}
