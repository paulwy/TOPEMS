import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { supplierSchema } from '@/schemas/wms';
import { scmApi } from '@/api/scm';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(scmApi.suppliers);

export default function SupplierManagementPage() {
  return (
    <CrudPage
      schema={supplierSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'WMS' }, { label: i18n.t('pages.supplier_management_page.k0') }]}
    />
  );
}
