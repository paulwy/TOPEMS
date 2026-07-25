import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { equipmentSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';

const apiAdapter = createCrudPageAdapter(mesApi.equipment);

export default function MesEquipmentPage() {
  return (
    <CrudPage
      schema={equipmentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: '设备管理' }]}
    />
  );
}
