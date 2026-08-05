import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import { ClipboardList, Play, CheckCircle, Clock, ClipboardCheck } from 'lucide-react';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { inspectionTaskSchema } from '@/schemas/lims';
import {
  limsApi,
  type InspectionTask,
  type InspectionProcess,
  type Sample,
  type CreateInspectionRecordRequest,
} from '@/api/lims';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ct = designTokens.colors;

const mapStatusToChinese = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '待分配',
    assigned: '已分配',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已终止',
    received: '待分配',
  };
  return statusMap[status] || status;
};

const InspectionTaskPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
  const [recordFormData, setRecordFormData] = useState<CreateInspectionRecordRequest>({
    task_id: '',
    step_id: '',
    step_name: '',
    result: '',
    conclusion: '',
    inspector: '',
  });

  const { data: samplesData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.SAMPLES,
    queryFn: async () => {
      const response = await limsApi.listSamples();
      if (response.success && response.data) {
        const data = response.data as { items?: Sample[]; samples?: Sample[] } | Sample[];
        if (Array.isArray(data)) return data;
        if (Array.isArray((data as { samples?: Sample[] }).samples))
          return (data as { samples: Sample[] }).samples;
        if (Array.isArray((data as { items?: Sample[] }).items))
          return (data as { items: Sample[] }).items;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: processesData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.PROCESSES,
    queryFn: async () => {
      const response = await limsApi.listProcesses();
      if (response.success && response.data) {
        const data = response.data as
          { items?: InspectionProcess[]; processes?: InspectionProcess[] } | InspectionProcess[];
        if (Array.isArray(data)) return data;
        if (Array.isArray((data as { processes?: InspectionProcess[] }).processes))
          return (data as { processes: InspectionProcess[] }).processes;
        if (Array.isArray((data as { items?: InspectionProcess[] }).items))
          return (data as { items: InspectionProcess[] }).items;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const samples = (samplesData || []) as Sample[];
  const processes = (processesData || []) as InspectionProcess[];

  const getSampleName = (sampleId: string) => {
    const sample = samples.find((s) => s.id === sampleId);
    return sample ? sample.name : '未知样品';
  };

  const getProcessName = (processId: string) => {
    const process = processes.find((p) => p.id === processId);
    return process ? process.name : '未知流程';
  };

  const getCurrentStepName = (task: InspectionTask) => {
    const process = processes.find((p) => p.id === task.process_id);
    if (!process) return '未知步骤';
    const step = process.steps[task.current_step - 1];
    return step ? step.name : '已完成';
  };

  const inspectionTaskApiAdapter: CrudApiAdapter<InspectionTask> = useMemo(
    () => ({
      list: async (params) => {
        const response = await limsApi.listTasks({
          page: params?.page !== undefined ? params.page : 0,
          pagesize: params?.pageSize ?? 10,
          search: params?.search as string | undefined,
          status: params?.status && params.status !== 'all' ? (params.status as string) : undefined,
        });
        if (!response.success || !response.data) {
          throw new Error('加载检验任务列表失败');
        }
        const rawData = response.data as
          { items?: InspectionTask[]; tasks?: InspectionTask[]; total?: number } | InspectionTask[];
        const items: InspectionTask[] = Array.isArray(rawData)
          ? rawData
          : rawData.tasks || rawData.items || [];
        const total = Array.isArray(rawData) ? items.length : rawData.total || items.length;

        const adapted = items.map((t) => ({
          ...t,
          status: mapStatusToChinese(t.status || ''),
        }));
        return { data: adapted, total };
      },

      create: async (data) => {
        const response = await limsApi.createTask(data as Parameters<typeof limsApi.createTask>[0]);
        if (!response.success) {
          throw new Error(response.message || '创建检验任务失败');
        }
        return response.data as unknown as InspectionTask;
      },

      update: async (id, data) => {
        const response = await limsApi.updateTask(
          id,
          data as Parameters<typeof limsApi.updateTask>[1]
        );
        if (!response.success) {
          throw new Error(response.message || '更新检验任务失败');
        }
        return response.data as unknown as InspectionTask;
      },

      delete: async (id) => {
        const response = await limsApi.deleteTask(id);
        if (!response.success) {
          throw new Error(response.message || '删除检验任务失败');
        }
      },
    }),
    []
  );

  const completeStep = async (
    task: InspectionTask,
    form: Omit<CreateInspectionRecordRequest, 'task_id'>
  ) => {
    try {
      const response = await limsApi.completeStep(task.id, {
        step_id: form.step_id,
        step_name: form.step_name,
        result: form.result,
        conclusion: form.conclusion,
        inspector: form.inspector,
      });
      if (response.success) {
        addNotification({ title: '成功', message: '检验步骤已完成', type: 'success' });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.TASKS });
      } else {
        addNotification({
          title: '错误',
          message: response.message || '操作失败',
          type: 'error',
        });
      }
    } catch (err) {
      addNotification({
        title: '错误',
        message: (err as { message?: string })?.message || '操作失败',
        type: 'error',
      });
    }
  };

  const openRecordModal = (row: Record<string, unknown>) => {
    const task = row as unknown as InspectionTask;
    const process = processes.find((p) => p.id === task.process_id);
    const currentStepObj = process?.steps.find((_, idx) => idx + 1 === task.current_step);

    setSelectedTask(task);
    setRecordFormData({
      task_id: task.id,
      step_id: currentStepObj?.id || '',
      step_name: currentStepObj?.name || '',
      result: '',
      conclusion: '',
      inspector: task.inspector || '',
    });
    setShowRecordModal(true);
  };

  const handleCompleteStep = async () => {
    if (!selectedTask) return;
    if (!recordFormData.result.trim()) {
      addNotification({
        title: '错误',
        message: '请输入检验结果',
        type: 'error',
      });
      return;
    }
    await completeStep(selectedTask, recordFormData);
    setShowRecordModal(false);
  };

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'execute',
        label: '执行检验',
        icon: <Play size={14} />,
        color: 'success',
        show: (row: Record<string, unknown>) => {
          const status = row.status as string;
          return status === '进行中' || status === '已分配';
        },
        onClick: (row: Record<string, unknown>) => openRecordModal(row),
      },
    ],
    [processes]
  );

  const statsContent = (rows: Record<string, unknown>[]) => {
    const tasks = rows as unknown as InspectionTask[];
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === '待分配' || t.status === '已分配').length,
      inProgress: tasks.filter((t) => t.status === '进行中').length,
      completed: tasks.filter((t) => t.status === '已完成').length,
    };

    const cards = [
      {
        label: '任务总数',
        value: stats.total,
        icon: <ClipboardCheck sx={{ width: 20, height: 20, color: 'secondary.main' }} />,
        bg: 'secondary.light',
        color: 'secondary.main',
      },
      {
        label: '待执行',
        value: stats.pending,
        icon: <Clock sx={{ width: 20, height: 20, color: 'warning.dark' }} />,
        bg: 'warning.light',
        color: 'warning.dark',
      },
      {
        label: '进行中',
        value: stats.inProgress,
        icon: <Play sx={{ width: 20, height: 20, color: 'primary.main' }} />,
        bg: 'primary.light',
        color: 'primary.main',
      },
      {
        label: '已完成',
        value: stats.completed,
        icon: <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />,
        bg: 'success.lighter',
        color: 'success.dark',
      },
    ];

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: card.bg,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    {card.label}
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700 }}
                  >
                    {card.value}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  return (
    <PageContainer
      title='检验任务'
      subtitle='Inspection Task Management'
      headerProps={{
        pageIcon: <ClipboardList style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary[600]} 100%)`,
      }}
    >
      <CrudPage
        schema={inspectionTaskSchema}
        apiAdapter={inspectionTaskApiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
        breadcrumbs={[
          { label: '首页', href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: '检验任务' },
        ]}
        idField='id'
      />

      <Dialog
        open={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'semibold' }}>完成检验步骤</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                当前步骤
              </Typography>
              <Typography
                color='secondary.main'
                sx={{ fontWeight: 'medium' }}
              >
                {recordFormData.step_name}
              </Typography>
            </Box>
            <TextField
              label='检验结果'
              required
              fullWidth
              multiline
              rows={4}
              value={recordFormData.result}
              onChange={(e) =>
                setRecordFormData({
                  ...recordFormData,
                  result: e.target.value,
                })
              }
              placeholder='请输入检验结果'
            />
            <TextField
              label='结论'
              fullWidth
              multiline
              rows={2}
              value={recordFormData.conclusion}
              onChange={(e) =>
                setRecordFormData({
                  ...recordFormData,
                  conclusion: e.target.value,
                })
              }
              placeholder='请输入检验结论'
            />
            <TextField
              label='检验员'
              required
              fullWidth
              value={recordFormData.inspector}
              onChange={(e) =>
                setRecordFormData({
                  ...recordFormData,
                  inspector: e.target.value,
                })
              }
              placeholder='请输入检验员姓名'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowRecordModal(false)}
            variant='outlined'
            color='inherit'
          >
            取消
          </Button>
          <Button
            onClick={handleCompleteStep}
            variant='contained'
            color='success'
          >
            完成步骤
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default InspectionTaskPage;
