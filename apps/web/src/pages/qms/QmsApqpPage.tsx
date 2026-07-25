import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { apqpSchema } from '@/schemas/qms/apqp';
import { qmsApi } from '@/api/qms';

const apiAdapter = createCrudPageAdapter({
  list: qmsApi.listApqpProjects,
  create: qmsApi.createApqpProject,
  update: qmsApi.updateApqpProject,
  delete: qmsApi.deleteApqpProject,
});

export default function QmsApqpPage() {
  return (
    <CrudPage
      schema={apqpSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: 'APQP 产品质量先期策划' }]}
    />
  );
}
