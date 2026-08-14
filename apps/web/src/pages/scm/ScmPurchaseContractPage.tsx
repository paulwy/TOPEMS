import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { purchaseContractWizardSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseContracts);

export default function ScmPurchaseContractPage() {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={purchaseContractWizardSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: t('scm.scm_purchase_contract_page.k1') },
        { label: t('scm.scm_purchase_contract_page.k0') },
      ]}
    />
  );
}
