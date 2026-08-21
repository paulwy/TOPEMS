import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { forecastSchema } from '@/schemas/aps';
import { forecastApi } from '@/api/aps';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: forecastApi.list,
  create: forecastApi.create,
  update: forecastApi.update,
  delete: forecastApi.delete,
});

export default function ForecastManagementPage() {
  return (
    <CrudPage
      schema={forecastSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'APS' }, { label: i18n.t('pages.forecast_management_page.k3') }]}
    />
  );
}
