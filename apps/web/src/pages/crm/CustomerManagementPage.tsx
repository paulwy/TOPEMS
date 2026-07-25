import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { customerSchema } from '@/schemas/crm';
import { crmApi } from '@/api/crm';

const apiAdapter = createCrudPageAdapter(crmApi.customers);

export default function CustomerManagementPage() {
  return (
    <CrudPage
      schema={customerSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'CRM' }, { label: '客户管理' }]}
    />
  );
}
