import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { supplierSchema } from '@/schemas/wms';
import { scmApi } from '@/api/scm';

const apiAdapter = createCrudPageAdapter(scmApi.suppliers);

export default function SupplierManagementPage() {
  return (
    <CrudPage
      schema={supplierSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'WMS' }, { label: '供应商管理' }]}
    />
  );
}
