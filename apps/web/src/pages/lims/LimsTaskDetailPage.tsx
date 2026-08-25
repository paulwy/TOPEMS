import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { ClipboardCheck, FileText, CheckCircle, AlertCircle, Play, Plus } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  MenuItem,
  Button,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';

import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { limsApi } from '@/api/lims';
import type {
  InspectionTask,
  InspectionRecord,
  InspectionProcess,
  CreateInspectionRecordRequest,
} from '@/api/lims';
import { logger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { DetailPageTemplate, type SectionConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';

const ct = designTokens.colors;

interface TaskRecord extends InspectionRecord {
  step_name: string;
}

interface RawRecord extends Partial<InspectionRecord> {
  step_name?: string;
  step_index?: number;
}

interface LimsListResponse<T> {
  items?: T[];
  processes?: T[];
  records?: T[];
}

const LimsTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState({
    step_name: '',
    result: '',
    conclusion: '',
    inspector: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: detailData, isPending: loading } = useQuery({
    queryKey: QUERY_KEYS.LIMS.TASK(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const [taskRes, recordRes, processRes] = await Promise.all([
        limsApi.getTask(id),
        limsApi.listRecordsByTask(id),
        limsApi.listProcesses(),
      ]);

      let task: InspectionTask | null = null;
      if (taskRes.success && taskRes.data) {
        task = taskRes.data as InspectionTask;
      }

      let records: TaskRecord[] = [];
      if (recordRes.success && recordRes.data) {
        const recordData = recordRes.data as LimsListResponse<RawRecord> | RawRecord[];
        const recordArray = Array.isArray(recordData)
          ? recordData
          : recordData.records || recordData.items || [];
        records = recordArray.map((r: RawRecord) => ({
          ...r,
          step_name:
            r.step_name ||
            r.step_id ||
            `${i18n.t('pages.lims_task_detail_page.k0')} ${r.step_index}`,
        })) as TaskRecord[];
      }

      let process: InspectionProcess | null = null;
      if (processRes.success && processRes.data && task) {
        const processData = processRes.data as
          LimsListResponse<InspectionProcess> | InspectionProcess[];
        const processArray = Array.isArray(processData)
          ? processData
          : processData.processes || processData.items || [];
        const matchedProcess = processArray.find(
          (p: InspectionProcess) => p.id === task.process_id
        );
        if (matchedProcess) {
          process = matchedProcess;
        }
      }

      return { task, records, process };
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.SHORT,
  });

  const task = detailData?.task || null;
  const records = detailData?.records || [];
  const process = detailData?.process || null;

  const completeStepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateInspectionRecordRequest }) => {
      const response = await limsApi.completeStep(id, data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.lims_task_detail_page.k0'));
      }
      return response;
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LIMS.TASK(id),
          exact: false,
          refetchType: 'active',
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LIMS.RECORDS_BY_TASK(id),
          exact: false,
          refetchType: 'active',
        });
      }
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TASKS,
        exact: false,
        refetchType: 'active',
      });
      setShowRecordModal(false);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.lims_task_detail_page.k1'), error);
    },
  });

  const handleCompleteStep = async () => {
    if (!task) return;
    if (!recordForm.step_name.trim()) {
      addNotification({
        title: i18n.t('pages.lims_task_detail_page.k1'),
        message: i18n.t('pages.lims_task_detail_page.k2'),
        type: 'error',
      });
      return;
    }
    if (!recordForm.result.trim()) {
      addNotification({
        title: i18n.t('pages.lims_task_detail_page.k3'),
        message: i18n.t('pages.lims_task_detail_page.k4'),
        type: 'error',
      });
      return;
    }
    if (!recordForm.inspector.trim()) {
      addNotification({
        title: i18n.t('pages.lims_task_detail_page.k5'),
        message: i18n.t('pages.lims_task_detail_page.k6'),
        type: 'error',
      });
      return;
    }
    await completeStepMutation.mutateAsync({
      id: task.id,
      data: {
        task_id: task.id,
        step_id: '',
        step_name: recordForm.step_name,
        result: recordForm.result,
        conclusion: recordForm.conclusion,
        inspector: recordForm.inspector,
      },
    });
  };

  const recordColumns: ColumnDef<TaskRecord>[] = [
    { accessorKey: 'step_name', header: i18n.t('pages.lims_task_detail_page.k7') },
    { accessorKey: 'inspector', header: i18n.t('pages.lims_task_detail_page.k8') },
    { accessorKey: 'result', header: i18n.t('pages.lims_task_detail_page.k9') },
    { accessorKey: 'conclusion', header: i18n.t('pages.lims_task_detail_page.k10') },
    {
      accessorKey: 'created_at',
      header: i18n.t('pages.lims_task_detail_page.k11'),
      cell: ({ row }) => (
        <span>
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleString('zh-CN')
            : '-'}
        </span>
      ),
    },
  ];

  const totalSteps = process?.steps?.length || 0;
  const completedSteps = records.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Sidebar - 检验进度
  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardHeader sx={{ pb: 1 }}>
          <Typography
            variant='h6'
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box
              component={CheckCircle}
              sx={{ fontSize: 20, color: 'success.dark' }}
            />
            {i18n.t('pages.lims_task_detail_page.k2')}
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              <span style={{ color: ct.grey[600] }}>
                {i18n.t('pages.lims_task_detail_page.k12')}
              </span>
              <span style={{ fontWeight: 500, color: theme.palette.grey[900] }}>
                {completedSteps} / {totalSteps} {i18n.t('pages.lims_task_detail_page.k0')}
              </span>
            </Box>
            <Box
              sx={{
                height: 12,
                backgroundColor: 'border.default',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  background: `linear-gradient(to right, ${ct.purple[500]}, ${ct.pink[500]})`,
                  width: `${progressPercent}%`,
                  transition: 'all 0.3s',
                }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontSize: designTokens.typography.fontSize.scale['1.875rem'],
                  fontWeight: 700,
                  color: 'secondary.main',
                }}
              >
                {Math.round(progressPercent)}%
              </Typography>
            </Box>
            {process?.steps && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  mt: 2,
                }}
              >
                {process.steps.map((step, index) => {
                  const isCompleted = index < completedSteps;
                  return (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: isCompleted ? 'success.light' : 'grey.50',
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                          fontWeight: 500,
                          bgcolor: isCompleted ? 'success.dark' : 'grey.400',
                          color: isCompleted ? 'var(--color-primary-foreground)' : 'grey.600',
                        }}
                      >
                        {isCompleted ? <CheckCircle sx={{ width: 16, height: 16 }} /> : index + 1}
                      </Box>
                      <Typography
                        sx={{
                          color: isCompleted ? 'success.700' : 'grey.600',
                          fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                        }}
                      >
                        {step.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  // Sections - 检验记录
  const sections: SectionConfig[] = [
    {
      id: 'records',
      title: i18n.t('pages.lims_task_detail_page.k13'),
      content: (
        <Box>
          {records.length > 0 ? (
            <DataTable
              columns={recordColumns}
              data={records}
              enablePagination={false}
            />
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                color: 'text.secondary',
              }}
            >
              <FileText
                sx={{
                  width: 64,
                  height: 64,
                  margin: `0 auto ${designTokens.spacing.md}px auto`,
                  opacity: 0.5,
                }}
              />
              <Typography>{i18n.t('pages.lims_task_detail_page.k14')}</Typography>
            </Box>
          )}
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, grey.100 100%)`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: `4px solid ${ct.purple[200]}`,
              borderTop: `4px solid ${ct.purple[600]}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: `0 auto ${designTokens.spacing.md}px auto`,
            }}
          ></div>
          <p style={{ color: ct.grey[600] }}>{i18n.t('pages.lims_task_detail_page.k3')}</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, grey.100 100%)`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <AlertCircle
            sx={{
              width: 64,
              height: 64,
              color: 'error.main',
              margin: `0 auto ${designTokens.spacing.md}px auto`,
            }}
          />
          <p style={{ color: ct.grey[600] }}>{i18n.t('pages.lims_task_detail_page.k15')}</p>
          <Button
            onClick={() => navigate(LIMS_PATHS.root)}
            sx={{ mt: 2 }}
          >
            {i18n.t('pages.lims_task_detail_page.k4')}
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: {
        bg: 'warning.100',
        color: ct.yellow[600],
        label: i18n.t('pages.lims_task_detail_page.k16'),
      },
      [i18n.t('pages.lims_task_detail_page.k5')]: {
        bg: 'warning.100',
        color: ct.yellow[600],
        label: i18n.t('pages.lims_task_detail_page.k17'),
      },
      in_progress: {
        bg: 'primary.100',
        color: 'primary.dark',
        label: i18n.t('pages.lims_task_detail_page.k18'),
      },
      [i18n.t('pages.lims_task_detail_page.k6')]: {
        bg: 'primary.100',
        color: 'primary.dark',
        label: i18n.t('pages.lims_task_detail_page.k19'),
      },
      completed: {
        bg: 'success.lighter',
        color: 'success.dark',
        label: i18n.t('pages.lims_task_detail_page.k20'),
      },
      [i18n.t('pages.lims_task_detail_page.k7')]: {
        bg: 'success.lighter',
        color: 'success.dark',
        label: i18n.t('pages.lims_task_detail_page.k21'),
      },
      cancelled: {
        bg: 'error.lighter',
        color: 'error.dark',
        label: i18n.t('pages.lims_task_detail_page.k22'),
      },
      [i18n.t('pages.lims_task_detail_page.k8')]: {
        bg: 'error.lighter',
        color: 'error.dark',
        label: i18n.t('pages.lims_task_detail_page.k23'),
      },
    };
    const item = statusMap[status] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const isTaskCompleted =
    task.status === 'completed' || task.status === i18n.t('pages.lims_task_detail_page.k24');

  return (
    <PageContainer
      title={i18n.t('pages.lims_task_detail_page.k25')}
      subtitle='Inspection Task Detail'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          task?.task_no ||
          task?.sample_name ||
          task?.id ||
          i18n.t('pages.lims_task_detail_page.k26')
        }
        breadcrumbs={[
          { label: i18n.t('pages.lims_task_detail_page.k27'), href: '/dashboard' },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: i18n.t('pages.lims_task_detail_page.k28') },
        ]}
        backHref={LIMS_PATHS.root}
        loading={loading}
        infoCard={{
          avatar: <ClipboardCheck sx={{ fontSize: 40, color: 'secondary.dark' }} />,
          title: task.task_no || task.id,
          subtitle: task.sample_name || i18n.t('pages.lims_task_detail_page.k29'),
          tags: [task.status],
          stats: [
            {
              label: i18n.t('pages.lims_task_detail_page.k30'),
              value: `${completedSteps}/${totalSteps}`,
            },
            {
              label: i18n.t('pages.lims_task_detail_page.k31'),
              value: `${Math.round(progressPercent)}%`,
            },
          ],
        }}
        sidebar={sidebarContent}
        sections={sections}
        actions={
          isTaskCompleted
            ? []
            : [
                {
                  label: i18n.t('pages.lims_task_detail_page.k32'),
                  icon: <Plus style={{ width: 18, height: 18 }} />,
                  onClick: () => setShowRecordModal(true),
                  variant: 'outlined',
                },
                {
                  label: i18n.t('pages.lims_task_detail_page.k33'),
                  icon: <Play style={{ width: 18, height: 18 }} />,
                  onClick: () => setShowCompleteModal(true),
                  variant: 'contained',
                  color: 'success',
                },
              ]
        }
      >
        <Dialog
          open={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{i18n.t('pages.lims_task_detail_page.k34')}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={i18n.t('pages.lims_task_detail_page.k9')}
                value={recordForm.step_name}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    step_name: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                placeholder={i18n.t('pages.lims_task_detail_page.k35')}
              />
              <TextField
                label={i18n.t('pages.lims_task_detail_page.k10')}
                value={recordForm.inspector}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    inspector: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                placeholder={i18n.t('pages.lims_task_detail_page.k36')}
              />
              <TextField
                label={i18n.t('pages.lims_task_detail_page.k11')}
                value={recordForm.result}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, result: e.target.value }))}
                fullWidth
                multiline
                rows={4}
                placeholder={i18n.t('pages.lims_task_detail_page.k12')}
              />
              <TextField
                select
                label={i18n.t('pages.lims_task_detail_page.k37')}
                value={recordForm.conclusion}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    conclusion: e.target.value,
                  }))
                }
                fullWidth
                size='small'
              >
                <MenuItem value=''>{i18n.t('pages.lims_task_detail_page.k38')}</MenuItem>
                <MenuItem value={i18n.t('pages.lims_task_detail_page.k39')}>
                  {i18n.t('pages.lims_task_detail_page.k40')}
                </MenuItem>
                <MenuItem value={i18n.t('pages.lims_task_detail_page.k41')}>
                  {i18n.t('pages.lims_task_detail_page.k42')}
                </MenuItem>
                <MenuItem value={i18n.t('pages.lims_task_detail_page.k43')}>
                  {i18n.t('pages.lims_task_detail_page.k44')}
                </MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowRecordModal(false)}
            >
              {i18n.t('pages.lims_task_detail_page.k13')}
            </Button>
            <Button
              variant='contained'
              onClick={handleCompleteStep}
            >
              {i18n.t('pages.lims_task_detail_page.k14')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{i18n.t('pages.lims_task_detail_page.k45')}</DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Typography sx={{ color: 'text.secondary' }}>
                {i18n.t('pages.lims_task_detail_page.k15')}
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: 'warning.lighter',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: ct.yellow[800],
                }}
              >
                <AlertCircle sx={{ width: 20, height: 20 }} />
                <span style={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}>
                  {i18n.t('pages.lims_task_detail_page.k0')}
                </span>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowCompleteModal(false)}
            >
              {i18n.t('pages.lims_task_detail_page.k16')}
            </Button>
            <Button
              variant='contained'
              onClick={() => setShowCompleteModal(false)}
              sx={{
                backgroundColor: 'success.dark',
                '&:hover': { backgroundColor: 'success.700' },
              }}
            >
              {i18n.t('pages.lims_task_detail_page.k17')}
            </Button>
          </DialogActions>
        </Dialog>
      </DetailPageTemplate>
    </PageContainer>
  );
};

export default LimsTaskDetailPage;
