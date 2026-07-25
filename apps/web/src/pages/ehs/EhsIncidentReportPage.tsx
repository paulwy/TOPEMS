import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { incidentReportSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';

const apiAdapter = createCrudPageAdapter({
  list: ehsApi.listIncidents,
  create: ehsApi.createIncident,
  update: ehsApi.updateIncident,
  delete: ehsApi.deleteIncident,
});

export default function EhsIncidentReportPage() {
  return (
    <CrudPage
      schema={incidentReportSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'EHS' }, { label: '事故报告' }]}
    />
  );
}
