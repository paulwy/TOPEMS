import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { evaluationSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';

const apiAdapter = createCrudPageAdapter(scmApi.evaluations);

export default function ScmEvaluationPage() {
  return (
    <CrudPage
      schema={evaluationSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: '供应商评估' }]}
    />
  );
}
