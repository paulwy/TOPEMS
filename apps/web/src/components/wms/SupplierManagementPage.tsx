import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import React from 'react';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { SchemaForm } from '@/components/templates/list/SchemaForm';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { createListPageCrudApi } from '@/schema-dsl/listPageCrudAdapter';
import { getColumns } from '@/schema-dsl';
import { supplierSchema } from '@/schemas/wms';
import { masterDataApi } from '@/api/master-data';
import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';

// 切 MDM 权威源（2026-11-07）：WMS 供应商列表原本复用 scmApi.suppliers，
// 现统一改走 /api/master-data/suppliers。mdm list 信封为 { items, total, page, page_size }。
const supplierApiAdapter = createCrudPageAdapter(masterDataApi.suppliers);
const supplierCrudApi = createListPageCrudApi<Record<string, unknown>>(
  supplierApiAdapter as unknown as CrudApiAdapter<Record<string, unknown>>
);

export default function SupplierManagementPage() {
  const columns = React.useMemo(
    () =>
      getColumns<Record<string, unknown>>(
        supplierSchema as unknown as EntitySchema<Record<string, unknown>>
      ),
    []
  );

  return (
    <ListPageTemplate<Record<string, unknown>>
      title={i18n.t('pages.supplier_management_page.k0')}
      breadcrumbs={[{ label: 'WMS' }, { label: i18n.t('pages.supplier_management_page.k0') }]}
      columns={columns}
      data={[]}
      crud={{
        api: supplierCrudApi,
        queryKey: 'wms-suppliers',
        entityName: i18n.t('pages.supplier_management_page.k0'),
        renderForm: ({ mode, record, onSubmit, onClose }) => (
          <SchemaForm<Record<string, unknown>>
            schema={supplierSchema as unknown as EntitySchema<Record<string, unknown>>}
            mode={mode}
            record={record}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        ),
      }}
    />
  );
}
