import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { supplierSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';

const apiAdapter = createCrudPageAdapter(scmApi.suppliers);

export default function ScmSupplierPage() {
  return (
    <CrudPage
      schema={supplierSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: '供应商管理' }]}
    />
  );
}
