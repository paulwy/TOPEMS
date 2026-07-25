import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { instrumentSchema } from '@/schemas/lims';
import { limsApi } from '@/api/lims';

const apiAdapter = createCrudPageAdapter(
  limsApi.instruments as unknown as Parameters<typeof createCrudPageAdapter>[0]
);

export default function LimsInstrumentPage() {
  return (
    <CrudPage
      schema={instrumentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'LIMS' }, { label: '仪器管理' }]}
    />
  );
}
