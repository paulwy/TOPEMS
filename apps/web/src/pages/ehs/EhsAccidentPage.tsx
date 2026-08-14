import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { accidentSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: ehsApi.listAccidents,
  create: ehsApi.createAccident,
  update: ehsApi.updateAccident,
  delete: ehsApi.deleteAccident,
});

export default function EhsAccidentPage() {
  return (
    <CrudPage
      schema={accidentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'EHS' }, { label: i18n.t('ehs.ehs_accident_page.k0') }]}
    />
  );
}
