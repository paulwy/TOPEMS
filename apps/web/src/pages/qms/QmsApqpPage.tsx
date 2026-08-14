import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { apqpSchema } from '@/schemas/qms/apqp';
import { qmsApi } from '@/api/qms';
import i18n from '@/i18n';

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
      breadcrumbs={[{ label: 'QMS' }, { label: i18n.t('pages.qms_apqp_page.apqp_0') }]}
    />
  );
}
