import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { scheduleSchema } from '@/schemas/aps';
import { scheduleApi } from '@/api/aps';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: scheduleApi.list,
  create: scheduleApi.create,
  update: scheduleApi.update,
  delete: scheduleApi.delete,
});

export default function ScheduleManagementPage() {
  return (
    <CrudPage
      schema={scheduleSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'APS' }, { label: i18n.t('aps.schedule_management_page.k5') }]}
    />
  );
}
