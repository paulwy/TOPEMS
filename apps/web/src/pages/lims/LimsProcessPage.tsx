import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Stack,
  Button,
  IconButton,
} from '@mui/material';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import { ClipboardList, FileText, Play, CheckCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { limsApi, type InspectionProcess, type LimsStatistics } from '@/api/lims';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { processSchema } from '@/schemas/lims';
import { MetricCard } from '@/components/bi/MetricCard';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { QUERY_KEYS } from '@/lib/reactQuery';
const ct= designTokens.colors;
const processAdapter: CrudApiAdapter<InspectionProcess> = {
  list: async (params) => {
    const response = await limsApi.processes.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    });
    if (!response.success) {
      throw new Error(i18n.t('lims.lims_process_page.k0'));
    }
    const data = response.data as unknown as Record<string, unknown>;
    const items =
      (data.items as InspectionProcess[]) || (data.processes as InspectionProcess[]) || [];
    const total = (data.total as number) || items.length;
    return { data: items, total };
  },
  create: async () => ({}) as InspectionProcess,
  update: async () => ({}) as InspectionProcess,
  delete: async () => {},
};
const LimsProcessPage: React.FC = () => {
  const navigate = useNavigate();
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    lims: false,
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<InspectionProcess | null>(null);
  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };
  const checkServiceStatus = async (serviceName: string, setStatus: (up: boolean) => void) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`/${serviceName}/health`, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timeoutId);
      setStatus(response.ok);
    } catch {
      setStatus(false);
    }
  };
  useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus('lims', (up) => setServiceStatuses((prev) => ({ ...prev, lims: up })));
    };
    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);
    return () => clearInterval(intervalId);
  }, []);
  const statisticsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.LIMS_STATISTICS_BASE,
    queryFn: async () => {
      const response = await limsApi.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: isServiceUp('lims'),
    staleTime: 5 * 60 * 1000,
  });
  const stats = statisticsQuery.data || {
    total_samples: 0,
    pending_samples: 0,
    testing_samples: 0,
    completed_samples: 0,
    cancelled_samples: 0,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    total_processes: 0,
    total_instruments: 0,
    normal_instruments: 0,
    calibration_instruments: 0,
    maintenance_instruments: 0,
    disabled_instruments: 0,
  };
  const openTaskModal = (process?: InspectionProcess) => {
    setSelectedProcess(process || null);
    setShowTaskModal(true);
  };
  const customRowActions = [
    {
      label: i18n.t('lims.lims_process_page.k1'),
      icon: <Play sx={{ width: 16, height: 16 }} />,
      color: 'secondary' as const,
      onClick: (row: Record<string, unknown>) => openTaskModal(row as unknown as InspectionProcess),
    },
  ];
  const headerContent = () => (
    <Box sx={{ mb: 4 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <MetricCard
          title={i18n.t('lims.lims_process_page.k2')}
          value={stats.total_samples}
          icon={<ClipboardList size={24} />}
          gradient={[ct.secondary.main, ct.secondary.dark]}
          subtitle={`${i18n.t('pages.lims_process_page.k0')}${stats.pending_samples}`}
          trend={stats.pending_samples > 0 ? 'up' : 'neutral'}
        />
        <MetricCard
          title={i18n.t('lims.lims_process_page.k3')}
          value={stats.total_tasks}
          icon={<ClipboardList size={24} />}
          gradient={[ct.secondary[400], ct.secondary[600]]}
          subtitle={`${i18n.t('pages.lims_process_page.k1')}${stats.in_progress_tasks}`}
          trend={stats.in_progress_tasks > 0 ? 'up' : 'neutral'}
        />
        <MetricCard
          title={i18n.t('lims.lims_process_page.k4')}
          value={stats.total_processes}
          icon={<FileText size={24} />}
          gradient={[ct.warning.main, ct.warning.dark]}
          trend='neutral'
        />
        <MetricCard
          title={i18n.t('lims.lims_process_page.k5')}
          value={stats.completed_samples}
          icon={<CheckCircle size={24} />}
          gradient={[ct.success.main, ct.success.dark]}
          trend='up'
        />
      </Box>
    </Box>
  );
  if (!isServiceUp('lims') && !statisticsQuery.isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, border.default 100%)`,
          p: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 3,
              bgcolor: 'info.light',
            }}
          >
            <ClipboardList
              size={32}
              color={ct.cyan[600]}
            />
          </Avatar>
          <Typography
            variant='h5'
            sx={{ ...{ mb: 2 }, fontWeight: 'bold' }}
          >
            {i18n.t('pages.lims_process_page.k0')}
          </Typography>
          <Typography
            color='text.secondary'
            sx={{ mb: 3 }}
          >
            {i18n.t('pages.lims_process_page.k1')}
          </Typography>
          <Button
            variant='contained'
            color='primary'
            onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
          >
            {i18n.t('pages.lims_process_page.k2')}
          </Button>
        </Paper>
      </Box>
    );
  }
  return (
    <PageContainer
      headerProps={{
        pageIcon: <ClipboardList style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <CrudPage
        schema={processSchema}
        apiAdapter={processAdapter}
        breadcrumbs={[{ label: 'LIMS' }, { label: i18n.t('lims.lims_process_page.k6') }]}
        headerContent={headerContent}
        customRowActions={customRowActions}
      />
      <Dialog
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 'semibold' }}
          >
            {i18n.t('pages.lims_process_page.k3')}
          </Typography>
          <IconButton
            size='small'
            onClick={() => setShowTaskModal(false)}
            aria-label={i18n.t('lims.lims_process_page.k7')}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography
              color='text.secondary'
              variant='body2'
            >
              {i18n.t('pages.lims_process_page.k4')}
            </Typography>
            {selectedProcess && (
              <Typography
                color='primary'
                variant='body2'
              >
                [i18n.t('pages.lims_process_page.k5')]: {selectedProcess.name}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowTaskModal(false);
              navigate(LIMS_PATHS.task);
            }}
            variant='contained'
            color='secondary'
          >
            {i18n.t('pages.lims_process_page.k6')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};
export default LimsProcessPage;