/**
 * LocationPage — Schema 驱动的库位管理页面
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import type { CreateLocationRequest, UpdateLocationRequest } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { locationSchema } from '@/schemas/wms';
import i18n from '@/i18n';

const locationApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await wmsApi.locations.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
    });
    if (!response.success) throw new Error('Failed to fetch locations');
    return {
      data: response.data.items as unknown as Record<string, unknown>[],
      total: response.data.total,
    };
  },
  create: async (data) => {
    const response = await wmsApi.locations.create(data as unknown as CreateLocationRequest);
    if (!response.success) throw new Error('Failed to create location');
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await wmsApi.locations.update(id, data as unknown as UpdateLocationRequest);
    if (!response.success) throw new Error('Failed to update location');
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await wmsApi.locations.delete(id);
    if (!response.success) throw new Error('Failed to delete location');
  },
};

const LocationPage: React.FC = () => {
  return (
    <CrudPage
      schema={locationSchema}
      apiAdapter={locationApiAdapter}
      breadcrumbs={[
        { label: i18n.t('pages.location_page.k0'), href: '/dashboard' },
        { label: i18n.t('pages.location_page.k1'), href: WMS_PATHS.root },
        { label: i18n.t('pages.location_page.k2') },
      ]}
    />
  );
};

export default LocationPage;
