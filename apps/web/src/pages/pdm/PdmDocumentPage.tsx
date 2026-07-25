import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { documentSchema } from '@/schemas/pdm';
import { documentApi } from '@/api/pdm';

const apiAdapter = createCrudPageAdapter(documentApi);

export default function PdmDocumentPage() {
  return (
    <CrudPage
      schema={documentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: '文档管理' }]}
    />
  );
}
