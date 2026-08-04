import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { organizationSchema } from '@/schemas/hrm';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { hrmApi, type Department } from '@/api/hrm';

const apiAdapter = createCrudPageAdapter(hrmApi.departments);

const treeDataAdapter = {
  loadAll: async () => {
    const res = await apiAdapter.list();
    return res.data as unknown as Record<string, unknown>[];
  },
  onAddChild: async (parentId: string | number | null, data: Record<string, unknown>) => {
    const parentIdStr = parentId == null ? undefined : String(parentId);
    await apiAdapter.create({ ...data, parentId: parentIdStr });
  },
  onUpdate: async (id: string | number, data: Record<string, unknown>) => {
    await apiAdapter.update(String(id), data);
  },
  onDelete: async (id: string | number) => {
    await apiAdapter.delete(String(id));
  },
};

export default function HrmOrganizationPage() {
  return (
    <CrudPage
      schema={organizationSchema as EntitySchema & SchemaExtensions}
      apiAdapter={apiAdapter}
      treeDataAdapter={treeDataAdapter}
      breadcrumbs={[{ label: 'HRM' }, { label: '组织架构' }]}
    />
  );
}
