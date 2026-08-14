import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { trainingSchema } from '@/schemas/hrm';
import { hrmApi } from '@/api/hrm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(hrmApi.trainingPlans);

export default function HrmTrainingPage() {
  const { t } = useTranslation('hrm');
  return (
    <CrudPage
      schema={trainingSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'HRM' }, { label: t('hrm.hrm_training_page.k0') }]}
    />
  );
}
