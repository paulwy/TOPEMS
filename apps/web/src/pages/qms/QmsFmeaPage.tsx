import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { fmeaSchema } from '@/schemas/qms';
import { fmeaApi } from '@/api/qms';

const apiAdapter = createCrudPageAdapter({
  list: fmeaApi.listFmeaAnalyses as any,
  create: fmeaApi.createFmeaAnalysis as any,
  update: fmeaApi.updateFmeaAnalysis as any,
  delete: fmeaApi.deleteFmeaAnalysis as any,
});

export default function QmsFmeaPage() {
  return (
    <CrudPage
      schema={fmeaSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: 'FMEA 分析' }]}
    />
  );
}
