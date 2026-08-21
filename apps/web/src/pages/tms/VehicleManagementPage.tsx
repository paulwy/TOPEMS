import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { vehicleSchema } from '@/schemas/tms';
import { vehicleApi } from '@/api/tms';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: vehicleApi.list,
  create: vehicleApi.create,
  update: vehicleApi.update,
  delete: vehicleApi.delete,
});

export default function VehicleManagementPage() {
  return (
    <CrudPage
      schema={vehicleSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'TMS' }, { label: i18n.t('tms.vehicle_management_page.k15') }]}
    />
  );
}
