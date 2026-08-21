import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { carrierSchema } from '@/schemas/tms';
import { carrierApi } from '@/api/tms';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: carrierApi.list,
  create: carrierApi.create,
  update: carrierApi.update,
  delete: carrierApi.delete,
});

export default function CarrierManagementPage() {
  return (
    <CrudPage
      schema={carrierSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'TMS' }, { label: i18n.t('tms.carrier_management_page.k14') }]}
    />
  );
}
