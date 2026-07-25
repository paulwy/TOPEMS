import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { qualitySchema } from '@/schemas/mes';
import { qualityApi } from '@/api/mes';

const apiAdapter = createCrudPageAdapter({
  list: qualityApi.listInspections,
  create: qualityApi.createInspection,
  update: qualityApi.updateInspection,
  delete: qualityApi.deleteInspection,
});

export default function MesQualityPage() {
  return (
    <CrudPage
      schema={qualitySchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: '质量检验' }]}
    />
  );
}
