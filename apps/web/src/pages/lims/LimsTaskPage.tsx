import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { taskSchema } from '@/schemas/lims';
import { limsApi } from '@/api/lims';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(
  limsApi.tasks as unknown as Parameters<typeof createCrudPageAdapter>[0]
);
export default function LimsTaskPage() {
  return (
    <CrudPage
      schema={taskSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'LIMS' }, { label: i18n.t('lims.lims_task_page.k0') }]}
    />
  );
}
