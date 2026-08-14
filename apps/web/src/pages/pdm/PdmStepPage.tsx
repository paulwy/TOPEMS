import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { stepSchema } from '@/schemas/pdm';
import { pdmApi } from '@/api/pdm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter({
  list: pdmApi.listSteps,
  create: pdmApi.createStep,
  update: pdmApi.updateStep,
  delete: pdmApi.deleteStep,
});

export default function PdmStepPage() {
  const { t } = useTranslation('pdm');
  return (
    <CrudPage
      schema={stepSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: t('pdm.pdm_step_page.k0') }]}
    />
  );
}
