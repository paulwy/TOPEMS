import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { supplierSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(scmApi.suppliers);

export default function ScmSupplierPage() {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={supplierSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_supplier_page.k0') }]}
    />
  );
}
