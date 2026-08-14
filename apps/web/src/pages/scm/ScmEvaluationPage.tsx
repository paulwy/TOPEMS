import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { evaluationSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(scmApi.evaluations);

export default function ScmEvaluationPage() {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={evaluationSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_evaluation_page.k0') }]}
    />
  );
}
