import { Box, Typography } from '@mui/material';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter, type CrudApi } from '@/schema/crudPageAdapter';
import { productionProcessSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { ProductionProcess } from '@/api/mes/types';
import i18n from '@/i18n';
const apiAdapter = createCrudPageAdapter<ProductionProcess>(
  {
    list: mesApi.processes.list as unknown as CrudApi<ProductionProcess>['list'],
    create: mesApi.processes.create as unknown as CrudApi<ProductionProcess>['create'],
    update: mesApi.processes.update as unknown as CrudApi<ProductionProcess>['update'],
    delete: mesApi.processes.delete as unknown as CrudApi<ProductionProcess>['delete'],
  },
  { itemsField: 'processes' }
);
export default function ProductionProcessPage() {
  const renderStats = (rows: ProductionProcess[]) => {
    const total = rows.length;
    const active = rows.filter((p) => p.status === 'active').length;
    const inactive = rows.filter((p) => p.status === 'inactive').length;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'cyan.light', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.production_process_page.k0')}
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
            {i18n.t('pages.production_process_page.k1')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {active}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.production_process_page.k2')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {inactive}
          </Typography>
        </Box>
      </Box>
    );
  };
  return (
    <CrudPage
      schema={productionProcessSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.production_process_page.k0') }]}
      headerContent={(rows) => renderStats(rows as ProductionProcess[])}
    />
  );
}