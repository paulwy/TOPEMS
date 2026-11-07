import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { supplierSchema } from '@/schemas/scm';
import { masterDataApi } from '@/api/master-data';
import { useTranslation } from 'react-i18next';

// 切 MDM 权威源（2026-11-07）：scm.suppliers 不再直连 /api/scm/suppliers，
// 改走 /api/master-data/suppliers。mdm 写入后由后台同步管道自动同步到 scm.suppliers / srm.suppliers。
// mdm list 信封为 { items, total, page, page_size }，默认 itemsField='items' 即可，无需覆盖。
const apiAdapter = createCrudPageAdapter(masterDataApi.suppliers);

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
