import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { productCategorySchema } from '@/schemas/pdm';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { documentApi } from '@/api/pdm';

const apiAdapter = createCrudPageAdapter(documentApi);

const treeDataAdapter = {
  loadAll: async () => {
    const res = await apiAdapter.list();
    return res.data;
  },
  onAddChild: async (parentId: string | number | null, data: Record<string, unknown>) => {
    await apiAdapter.create({ ...data, parent_id: parentId });
  },
  onUpdate: async (id: string | number, data: Record<string, unknown>) => {
    await apiAdapter.update(String(id), data);
  },
  onDelete: async (id: string | number) => {
    await apiAdapter.delete(String(id));
  },
};

export default function PdmProductCategoryPage() {
  return (
    <CrudPage
      schema={productCategorySchema as EntitySchema & SchemaExtensions}
      apiAdapter={apiAdapter}
      treeDataAdapter={treeDataAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: '产品分类' }]}
    />
  );
}
