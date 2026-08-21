import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { capacitySchema } from '@/schemas/aps';
import { capacityApi } from '@/api/aps';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: capacityApi.list,
  create: capacityApi.create,
  update: capacityApi.update,
  delete: capacityApi.delete,
});

export default function CapacityManagementPage() {
  return (
    <CrudPage
      schema={capacitySchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'APS' }, { label: i18n.t('aps.capacity_management_page.k4') }]}
    />
  );
}
