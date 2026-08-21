import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { vehicleRequestSchema } from '@/schemas/erp/vehicleRequest';
import { vehicleRequestApi } from '@/api/erp';
import i18n from '@/i18n';

const vehicleRequestApiAdapter = createCrudPageAdapter(vehicleRequestApi);
const VehicleRequestPage: React.FC = () => {
  return (
    <CrudPage
      schema={vehicleRequestSchema}
      apiAdapter={vehicleRequestApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.vehicle_request_page.k4'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.vehicle_request_page.k5') },
      ]}
    />
  );
};
export default VehicleRequestPage;
