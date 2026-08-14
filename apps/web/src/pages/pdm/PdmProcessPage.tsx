import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { processSchema } from '@/schemas/pdm';
import { pdmApi } from '@/api/pdm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter({
  list: pdmApi.listProcesses,
  create: pdmApi.createProcess,
  update: pdmApi.updateProcess,
  delete: pdmApi.deleteProcess,
});

export default function PdmProcessPage() {
  const { t } = useTranslation('pdm');
  return (
    <CrudPage
      schema={processSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: t('pdm.pdm_process_page.k0') }]}
    />
  );
}
