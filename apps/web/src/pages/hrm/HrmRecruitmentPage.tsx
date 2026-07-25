import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { recruitmentSchema } from '@/schemas/hrm';
import { hrmApi } from '@/api/hrm';

const apiAdapter = createCrudPageAdapter(hrmApi.jobOpenings);

export default function HrmRecruitmentPage() {
  return (
    <CrudPage
      schema={recruitmentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'HRM' }, { label: '招聘管理' }]}
    />
  );
}
