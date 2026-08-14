import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Activity, FileText, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { environmentMonitorSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import type {
  EnvironmentMonitor,
  CreateEnvironmentMonitorRequest,
  UpdateEnvironmentMonitorRequest,
} from '@/api/ehs';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

const monitorApi = {
  list: ehsApi.listEnvironmentMonitors,
  create: ehsApi.createEnvironmentMonitor,
  update: ehsApi.updateEnvironmentMonitor,
  delete: ehsApi.deleteEnvironmentMonitor,
};

const monitorAdapter = createCrudPageAdapter<
  EnvironmentMonitor,
  CreateEnvironmentMonitorRequest,
  UpdateEnvironmentMonitorRequest
>(monitorApi);

const EnvironmentPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: monitorsData } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_ENVIRONMENT_MONITORS_STATS_BASE,
    queryFn: async () => {
      const response = await ehsApi.listEnvironmentMonitors({ pagesize: 100 });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data)
          ? (data as EnvironmentMonitor[])
          : (data.data as EnvironmentMonitor[]) || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const monitors = (monitorsData as EnvironmentMonitor[]) || [];

  const statsContent = (rows: EnvironmentMonitor[], total: number) => {
    const activeCount =
      rows.filter((m) => m.status === 'active').length ||
      monitors.filter((m) => m.status === 'active').length;
    const maintenanceCount =
      rows.filter((m) => m.status === 'maintenance').length ||
      monitors.filter((m) => m.status === 'maintenance').length;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'success.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'success.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.environment_page.list') || '监测点总数'}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {total}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'success.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.environment_page.normal') || '正常运行'}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {activeCount}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'warning.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle sx={{ width: 20, height: 20, color: 'warning.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.environment_page.maintenance') || '维护中'}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {maintenanceCount}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Activity sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={environmentMonitorSchema}
        apiAdapter={monitorAdapter}
        breadcrumbs={[{ label: t('ehs.title') }, { label: t('ehs.environment_page.list') }]}
        headerContent={statsContent}
      />
    </PageContainer>
  );
};

export default EnvironmentPage;
