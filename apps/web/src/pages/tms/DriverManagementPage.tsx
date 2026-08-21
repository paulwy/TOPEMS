import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { driverSchema } from '@/schemas/tms';
import { driverApi } from '@/api/tms';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: driverApi.list,
  create: driverApi.create,
  update: driverApi.update,
  delete: driverApi.delete,
});

export default function DriverManagementPage() {
  return (
    <CrudPage
      schema={driverSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'TMS' }, { label: i18n.t('tms.driver_management_page.k14') }]}
    />
  );
}
