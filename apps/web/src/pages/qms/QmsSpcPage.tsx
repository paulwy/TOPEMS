import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { spcSchema } from '@/schemas/qms';
import { spcApi } from '@/api/qms';

const apiAdapter = createCrudPageAdapter({
  list: spcApi.listSpcCharts as any,
  create: spcApi.createSpcChart as any,
  update: spcApi.updateSpcChart as any,
  delete: spcApi.deleteSpcChart as any,
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
