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
import { PageContainer } from '@/components/common/PageContainer';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
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

  const { data: ganttData, isLoading } = useQuery<GanttData | null>({
    queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT,
    queryFn: async () => {
      const response = await mesApi.schedules.getGanttData();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
  });

  if (isLoading) return <LoadingSpinner />;

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
        <Typography sx={{ mt: 2 }}>暂无甘特图数据</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant='h6'>甘特图视图</Typography>
        <Button
          startIcon={<RefreshCw size={16} />}
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT,
            })
          }
          size='small'
        >
          刷新
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
                            color: 'white',
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
        title: '成功',
        message: '生产排程调整成功',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT });
      setShowAdjustDialog(false);
      resetAdjustForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('调整排程失败', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '调整排程失败',
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
      label: '调整排程',
      icon: <RefreshCw size={16} />,
      onClick: (row: Record<string, unknown>) => handleAdjust(row),
    },
  ];

  const tabs = [
    { id: 'list', label: '排程列表', icon: <Calendar size={16} />, content: null },
    {
      id: 'gantt',
      label: '甘特图',
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
        breadcrumbs={[{ label: 'MES' }, { label: '生产排程' }]}
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
                  已排程
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
                  执行中
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
                  已完成
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
                  已取消
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
                  总数
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
        <DialogTitle>调整排程</DialogTitle>
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
            调整生产排程时间或工位
          </Box>
          <form onSubmit={handleAdjustSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_start_time'>计划开始时间</InputLabel>
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
                <InputLabel htmlFor='adjust_end_time'>计划结束时间</InputLabel>
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
                <InputLabel htmlFor='adjust_workstation'>工位ID</InputLabel>
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
                <InputLabel htmlFor='adjust_reason'>调整原因</InputLabel>
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
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending ? '调整中...' : '确认调整'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default ProductionSchedulePage;
