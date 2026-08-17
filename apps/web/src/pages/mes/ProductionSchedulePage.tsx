import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputLabel,
  Tooltip,
} from '@mui/material';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import type { ProductionSchedule, AdjustScheduleRequest, GanttData } from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { productionScheduleSchema } from '@/schemas/mes';
import { Calendar, GanttChart, RefreshCw } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;
const apiAdapter = createCrudPageAdapter(mesApi.schedules, {
  itemsField: 'schedules',
});
// ============ 甘特图视图 ============
function GanttView() {
  const queryClient = useQueryClient();
  const { data: ganttData, isPending } = useQuery<GanttData | null>({
    queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT,
    queryFn: async () => {
      const response = await mesApi.schedules.getGanttData();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  if (isPending) return <LoadingSpinner />;
  if (!ganttData || ganttData.tasks.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 10,
          color: 'text.secondary',
        }}
      >
        <GanttChart
          size={48}
          strokeWidth={1.5}
        />
        <Typography sx={{ mt: 2 }}>{i18n.t('mes.production_schedule_page.k0')}</Typography>
      </Box>
    );
  }
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h6'>{i18n.t('mes.production_schedule_page.k1')}</Typography>
        <Button
          startIcon={<RefreshCw size={16} />}
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT,

              exact: false,
              refetchType: 'active',
            })
          }
          size='small'
        >
          {i18n.t('pages.production_schedule_page.k0')}
        </Button>
      </Box>
      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ minWidth: 800 }}>
          {ganttData.work_stations.map((ws) => (
            <Box
              key={ws.id}
              sx={{ mb: 2 }}
            >
              <Typography
                variant='subtitle2'
                sx={{ mb: 1, fontWeight: 600 }}
              >
                {ws.name}
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  height: 40,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                {ganttData.tasks
                  .filter((t) => t.work_station_id === ws.id)
                  .map((task) => {
                    const start = new Date(task.start_time).getTime();
                    const end = new Date(task.end_time).getTime();
                    const totalStart = new Date(ganttData.date_range.start).getTime();
                    const totalEnd = new Date(ganttData.date_range.end).getTime();
                    const totalDuration = totalEnd - totalStart;
                    const left = ((start - totalStart) / totalDuration) * 100;
                    const width = ((end - start) / totalDuration) * 100;
                    let bgColor = ct.secondary[400];
                    if (task.status === 'in_progress') bgColor = 'primary.main';
                    if (task.status === 'completed') bgColor = 'success.main';
                    if (task.status === 'cancelled') bgColor = 'error.main';
                    return (
                      <Tooltip
                        key={task.id}
                        title={`${task.name} - ${task.order_number}`}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${left}%`,
                            width: `${Math.max(width, 2)}%`,
                            top: 4,
                            bottom: 4,
                            bgcolor: bgColor,
                            borderRadius: 0.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            px: 1,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            color: 'common.white',
                            fontSize: 12,
                          }}
                        >
                          {task.name}
                        </Box>
                      </Tooltip>
                    );
                  })}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
// ============ 生产排程页面 ============
const ProductionSchedulePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ProductionSchedule | null>(null);
  const [adjustData, setAdjustData] = useState<AdjustScheduleRequest>({
    planned_start_time: '',
    planned_end_time: '',
    reason: '',
  });
  const adjustMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdjustScheduleRequest }) =>
      mesApi.schedules.adjust(id, data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: i18n.t('mes.production_schedule_page.k2'),
        message: i18n.t('mes.production_schedule_page.k3'),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULES,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT,
        exact: false,
        refetchType: 'active',
      });
      setShowAdjustDialog(false);
      resetAdjustForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('mes.production_schedule_page.k4'), error);
      addNotification({
        type: 'error',
        title: i18n.t('mes.production_schedule_page.k5'),
        message: i18n.t('mes.production_schedule_page.k6'),
      });
    },
  });
  const resetAdjustForm = () => {
    setSelectedSchedule(null);
    setAdjustData({
      planned_start_time: '',
      planned_end_time: '',
      reason: '',
    });
  };
  const handleAdjust = (row: Record<string, unknown>) => {
    const schedule = row as unknown as ProductionSchedule;
    setSelectedSchedule(schedule);
    setAdjustData({
      planned_start_time: schedule.planned_start_time,
      planned_end_time: schedule.planned_end_time,
      work_station_id: schedule.work_station_id,
      reason: '',
    });
    setShowAdjustDialog(true);
  };
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSchedule) {
      adjustMutation.mutate({ id: selectedSchedule.id, data: adjustData });
    }
  };
  const customRowActions = [
    {
      label: i18n.t('mes.production_schedule_page.k7'),
      icon: <RefreshCw size={16} />,
      onClick: (row: Record<string, unknown>) => handleAdjust(row),
    },
  ];
  const tabs = [
    {
      id: 'list',
      label: i18n.t('mes.production_schedule_page.k8'),
      icon: <Calendar size={16} />,
      content: null,
    },
    {
      id: 'gantt',
      label: i18n.t('mes.production_schedule_page.k9'),
      icon: <GanttChart size={16} />,
      content: <GanttView />,
    },
  ];
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Calendar style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[500]} 0%, ${ct.secondary[700]} 100%)`,
      }}
    >
      <CrudPage
        schema={productionScheduleSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.production_schedule_page.k10') }]}
        customRowActions={customRowActions}
        tabs={tabs}
        headerContent={(rows) => {
          const total = rows.length;
          const scheduled = rows.filter((o) => o.status === 'scheduled').length;
          const inProgress = rows.filter((o) => o.status === 'in_progress').length;
          const completed = rows.filter((o) => o.status === 'completed').length;
          const cancelled = rows.filter((o) => o.status === 'cancelled').length;
          return (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.production_schedule_page.k1')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'secondary.700' }}
                >
                  {scheduled}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.production_schedule_page.k2')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {inProgress}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.production_schedule_page.k3')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {completed}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.production_schedule_page.k4')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {cancelled}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.production_schedule_page.k5')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {total}
                </Typography>
              </Box>
            </Box>
          );
        }}
      />
      {/* 调整排程对话框 */}
      <Dialog
        open={showAdjustDialog}
        onClose={() => setShowAdjustDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('mes.production_schedule_page.k11')}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {i18n.t('pages.production_schedule_page.k6')}
          </Box>
          <form onSubmit={handleAdjustSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_start_time'>
                  {i18n.t('mes.production_schedule_page.k12')}
                </InputLabel>
                <TextField
                  id='adjust_start_time'
                  type='datetime-local'
                  size='small'
                  value={adjustData.planned_start_time || ''}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, planned_start_time: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_end_time'>
                  {i18n.t('mes.production_schedule_page.k13')}
                </InputLabel>
                <TextField
                  id='adjust_end_time'
                  type='datetime-local'
                  size='small'
                  value={adjustData.planned_end_time || ''}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, planned_end_time: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_workstation'>
                  {i18n.t('mes.production_schedule_page.id_14')}
                </InputLabel>
                <TextField
                  id='adjust_workstation'
                  size='small'
                  value={adjustData.work_station_id || ''}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, work_station_id: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_reason'>
                  {i18n.t('mes.production_schedule_page.k15')}
                </InputLabel>
                <TextField
                  id='adjust_reason'
                  size='small'
                  multiline
                  rows={2}
                  value={adjustData.reason || ''}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowAdjustDialog(false)}
              >
                {i18n.t('pages.production_schedule_page.k7')}
              </Button>
              <Button
                type='submit'
                variant='contained'
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending
                  ? i18n.t('pages.production_schedule_page.k0')
                  : i18n.t('mes.production_schedule_page.k16')}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
export default ProductionSchedulePage;
