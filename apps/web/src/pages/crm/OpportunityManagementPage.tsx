import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { opportunitySchema } from '@/schemas/crm';
import { crmApi } from '@/api/crm';

const apiAdapter = createCrudPageAdapter(crmApi.opportunities);

export default function OpportunityManagementPage() {
  return (
    <CrudPage
      schema={opportunitySchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'CRM' }, { label: '商机管理' }]}
    />
  );
}
