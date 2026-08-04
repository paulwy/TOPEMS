import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { sampleSchema } from '@/schemas/lims';
import { limsApi } from '@/api/lims';

const apiAdapter = createCrudPageAdapter(
  limsApi.samples as unknown as Parameters<typeof createCrudPageAdapter>[0]
);

export default function LimsSamplePage() {
  return (
    <CrudPage
      schema={sampleSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'LIMS' }, { label: '样品管理' }]}
    />
  );
}
