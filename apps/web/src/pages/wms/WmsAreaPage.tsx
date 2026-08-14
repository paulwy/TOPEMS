import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { areaSchema } from '@/schemas/wms';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { wmsApi } from '@/api/wms';
import type { Location } from '@/api/wms/types';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(wmsApi.locations);

const treeDataAdapter = {
  loadAll: async () => {
    const res = await apiAdapter.list();
    return res.data as unknown as Record<string, unknown>[];
  },
  onAddChild: async (parentId: string | number | null, data: Record<string, unknown>) => {
    const payload = { ...data, parentId };
    await apiAdapter.create(payload as unknown as Partial<Location>);
  },
  onUpdate: async (id: string | number, data: Record<string, unknown>) => {
    await apiAdapter.update(String(id), data as unknown as Partial<Location>);
  },
  onDelete: async (id: string | number) => {
    await apiAdapter.delete(String(id));
  },
};

export default function WmsAreaPage() {
  return (
    <CrudPage
      schema={areaSchema as EntitySchema & SchemaExtensions}
      apiAdapter={apiAdapter}
      treeDataAdapter={treeDataAdapter}
      breadcrumbs={[{ label: 'WMS' }, { label: i18n.t('pages.wms_area_page.k0') }]}
    />
  );
}
