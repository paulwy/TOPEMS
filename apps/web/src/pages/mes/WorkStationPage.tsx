import { Box, Typography } from '@mui/material';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { workstationSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { WorkStation, CreateWorkStationRequest } from '@/api/mes/types';
import i18n from '@/i18n';
const apiAdapter = createCrudPageAdapter<WorkStation>(
  {
    list: mesApi.workstations.list,
    create: (data) => mesApi.workstations.create(data as unknown as CreateWorkStationRequest),
    update: (id, data) => mesApi.workstations.update(id, data as unknown as Partial<WorkStation>),
    delete: mesApi.workstations.delete,
  },
  { itemsField: 'workstations' }
);
export default function WorkStationPage() {
  const renderStats = (rows: WorkStation[]) => {
    const total = rows.length;
    const active = rows.filter((w) => w.status === 'active').length;
    const idle = rows.filter((w) => w.status === 'idle').length;
    const maintenance = rows.filter((w) => w.status === 'maintenance').length;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.work_station_page.k0')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {total}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.work_station_page.k1')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {active}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.work_station_page.k2')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {idle}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.work_station_page.k3')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {maintenance}
          </Typography>
        </Box>
      </Box>
    );
  };
  return (
    <CrudPage
      schema={workstationSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.work_station_page.k0') }]}
      headerContent={(rows) => renderStats(rows as WorkStation[])}
    />
  );
}