import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { equipmentSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(mesApi.equipment);

export default function MesEquipmentPage() {
  return (
    <CrudPage
      schema={equipmentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.mes_equipment_page.k0') }]}
    />
  );
}
