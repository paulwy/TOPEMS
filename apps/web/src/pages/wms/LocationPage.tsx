/**
 * LocationPage — Schema 驱动的库位管理页面
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { locationSchema } from '@/schemas/wms';
import i18n from '@/i18n';

const locationApiAdapter = createCrudPageAdapter(wmsApi.locations);

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
