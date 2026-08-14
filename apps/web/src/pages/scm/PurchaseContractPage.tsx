import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { purchaseContractSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseContracts);

export default function PurchaseContractPage() {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={purchaseContractSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.purchase_contract_page.k0') }]}
    />
  );
}
