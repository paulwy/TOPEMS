import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter, type CrudApi } from '@/schema/crudPageAdapter';
import { fmeaSchema } from '@/schemas/qms';
import { fmeaApi } from '@/api/qms';
import type { FmeaAnalysis } from '@/api/qms';

const apiAdapter = createCrudPageAdapter<FmeaAnalysis>({
  list: fmeaApi.listFmeaAnalyses as unknown as CrudApi<FmeaAnalysis>['list'],
  create: fmeaApi.createFmeaAnalysis as unknown as CrudApi<FmeaAnalysis>['create'],
  update: fmeaApi.updateFmeaAnalysis as unknown as CrudApi<FmeaAnalysis>['update'],
  delete: fmeaApi.deleteFmeaAnalysis as unknown as CrudApi<FmeaAnalysis>['delete'],
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
