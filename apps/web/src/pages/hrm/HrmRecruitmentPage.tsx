import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { recruitmentSchema } from '@/schemas/hrm';
import { hrmApi } from '@/api/hrm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(hrmApi.jobOpenings);

export default function HrmRecruitmentPage() {
  const { t } = useTranslation('hrm');
  return (
    <CrudPage
      schema={recruitmentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'HRM' }, { label: t('hrm.hrm_recruitment_page.k0') }]}
    />
  );
}
