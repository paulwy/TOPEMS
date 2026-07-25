import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { purchaseContractWizardSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseContracts);

export default function ScmPurchaseContractPage() {
  return (
    <CrudPage
      schema={purchaseContractWizardSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: '供应链管理' }, { label: '采购合同评审' }]}
    />
  );
}
