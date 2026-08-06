import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter, type CrudApi } from '@/schema/crudPageAdapter';
import { spcSchema } from '@/schemas/qms';
import { spcApi } from '@/api/qms';
import type { SpcChart } from '@/api/qms';

const apiAdapter = createCrudPageAdapter<SpcChart>({
  list: spcApi.listSpcCharts as unknown as CrudApi<SpcChart>['list'],
  create: spcApi.createSpcChart as unknown as CrudApi<SpcChart>['create'],
  update: spcApi.updateSpcChart as unknown as CrudApi<SpcChart>['update'],
  delete: spcApi.deleteSpcChart as unknown as CrudApi<SpcChart>['delete'],
});

export default function QmsSpcPage() {
  return (
    <CrudPage
      schema={spcSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: 'SPC 统计过程控制' }]}
    />
  );
}
