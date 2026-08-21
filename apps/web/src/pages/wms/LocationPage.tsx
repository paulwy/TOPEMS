/**
 * LocationPage — Schema 驱动的库位管理页面
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { SchemaForm } from '@/components/templates/list/SchemaForm';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { createListPageCrudApi } from '@/schema/listPageCrudAdapter';
import { getColumns } from '@/schema';
import { locationSchema } from '@/schemas/wms';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const locationApiAdapter = createCrudPageAdapter(wmsApi.locations);
const locationCrudApi = createListPageCrudApi<Record<string, unknown>>(
  locationApiAdapter as unknown as import('@/components/templates/CrudPage').CrudApiAdapter<Record<string, unknown>>
);

const LocationPage: React.FC = () => {
  const columns = React.useMemo(
    () => getColumns<Record<string, unknown>>(locationSchema as unknown as EntitySchema<Record<string, unknown>>),
    []
  );

  return (
    <ListPageTemplate<Record<string, unknown>>
      title={i18n.t('pages.location_page.k2')}
      breadcrumbs={[
        { label: i18n.t('pages.location_page.k0'), href: '/dashboard' },
        { label: i18n.t('pages.location_page.k1'), href: WMS_PATHS.root },
        { label: i18n.t('pages.location_page.k2') },
      ]}
      columns={columns}
      data={[]}
      crud={{
        api: locationCrudApi,
        queryKey: 'wms-locations',
        entityName: i18n.t('pages.location_page.k2'),
        renderForm: ({ mode, record, onSubmit, onClose }) => (
          <SchemaForm<Record<string, unknown>>
            schema={locationSchema as unknown as EntitySchema<Record<string, unknown>>}
            mode={mode}
            record={record}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        ),
      }}
    />
  );
};

export default LocationPage;
