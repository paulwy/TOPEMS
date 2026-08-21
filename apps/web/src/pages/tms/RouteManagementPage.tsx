import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { routeSchema } from '@/schemas/tms';
import { routeApi } from '@/api/tms';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: routeApi.list,
  create: routeApi.create,
  update: routeApi.update,
  delete: routeApi.delete,
});

export default function RouteManagementPage() {
  return (
    <CrudPage
      schema={routeSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'TMS' }, { label: i18n.t('tms.route_management_page.k14') }]}
    />
  );
}
