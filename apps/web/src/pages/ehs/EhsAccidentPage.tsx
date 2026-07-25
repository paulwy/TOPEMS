import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { accidentSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';

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
      breadcrumbs={[{ label: 'EHS' }, { label: '事故管理' }]}
    />
  );
}
