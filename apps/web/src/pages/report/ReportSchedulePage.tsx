import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import {
  Plus as PlusIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Play as PlayIcon,
  History as HistoryIcon,
  X as XIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';

import {
  reportApi,
  type ReportSchedule,
  type CreateScheduleRequest,
  type UpdateScheduleRequest,
  type ScheduleType,
  type ScheduleStatus,
  type ScheduleExecutionRecord,
} from '@/api/report';

const SCHEDULE_TYPE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: 'cron', label: i18n.t('pages.report_schedule_page.cron_0') },
  { value: 'interval', label: i18n.t('pages.report_schedule_page.k0') },
  { value: 'one_time', label: i18n.t('pages.report_schedule_page.k1') },
];

const SCHEDULE_STATUS_OPTIONS: {
  value: ScheduleStatus;
  label: string;
  color: React.ComponentProps<typeof Chip>['color'];
}[] = [
  { value: 'active', label: i18n.t('pages.report_schedule_page.k2'), color: 'success' },
  { value: 'paused', label: i18n.t('pages.report_schedule_page.k3'), color: 'warning' },
  { value: 'completed', label: i18n.t('pages.report_schedule_page.k4'), color: 'info' },
  { value: 'failed', label: i18n.t('pages.report_schedule_page.k5'), color: 'error' },
];

const defaultFormData: CreateScheduleRequest = {
  name: '',
  template_id: '',
  schedule_type: 'cron',
  schedule_expression: '',
  recipients: [],
};

const ReportSchedulePage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ReportSchedule | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<CreateScheduleRequest | UpdateScheduleRequest>(
    defaultFormData
  );

  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE,
    queryFn: async () => {
      const response = await reportApi.listSchedules();
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.report_schedule_page.k6'));
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const templatesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.REPORT_TEMPLATES_BASE,
    queryFn: async () => {
      const response = await reportApi.listTemplates();
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.report_schedule_page.k7'));
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateScheduleRequest) => {
      const response = await reportApi.createSchedule(data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.report_schedule_page.k8'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      setError((err as Error).message || i18n.t('pages.report_schedule_page.k9'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateScheduleRequest }) => {
      const response = await reportApi.updateSchedule(id, data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.report_schedule_page.k10'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      setError((err as Error).message || i18n.t('pages.report_schedule_page.k11'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await reportApi.deleteSchedule(id);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.report_schedule_page.k12'));
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      setError((err as Error).message || i18n.t('pages.report_schedule_page.k13'));
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await reportApi.executeSchedule(id);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.report_schedule_page.k14'));
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      setError((err as Error).message || i18n.t('pages.report_schedule_page.k15'));
    },
  });

  const historyQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.REPORT_SCHEDULE_HISTORY_BASE, currentSchedule?.id],
    queryFn: async () => {
      if (!currentSchedule?.id) return [];
      const response = await reportApi.getExecutionHistory(currentSchedule.id);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.report_schedule_page.k16'));
      }
      return response.data || [];
    },
    enabled: historyDialogOpen && !!currentSchedule?.id,
    staleTime: 1 * 60 * 1000,
  });

  const schedules = schedulesQuery.data || [];
  const templates = templatesQuery.data || [];
  const mutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    executeMutation.isPending;

  const handleOpenCreateDialog = useCallback(() => {
    setEditMode(false);
    setCurrentSchedule(null);
    setError('');
    setFormData(defaultFormData);
    setDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback((schedule: ReportSchedule) => {
    setEditMode(true);
    setCurrentSchedule(schedule);
    setError('');
    setFormData({
      name: schedule.name,
      template_id: schedule.template_id,
      schedule_type: schedule.schedule_type,
      schedule_expression: schedule.schedule_expression,
      recipients: schedule.recipients,
    });
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setError('');
    setFormData(defaultFormData);
  }, []);

  const handleFormChange = useCallback((field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleRecipientChange = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const newRecipients = [...(prev.recipients || [])];
      newRecipients[index] = value;
      return { ...prev, recipients: newRecipients };
    });
  }, []);

  const handleAddRecipient = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      recipients: [...(prev.recipients || []), ''],
    }));
  }, []);

  const handleRemoveRecipient = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipients: (prev.recipients || []).filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setError('');
    try {
      if (editMode && currentSchedule) {
        await updateMutation.mutateAsync({
          id: currentSchedule.id,
          data: formData as UpdateScheduleRequest,
        });
      } else {
        await createMutation.mutateAsync(formData as CreateScheduleRequest);
      }
      setDialogOpen(false);
      setFormData(defaultFormData);
    } catch {
      // Error handled by mutation onError
    }
  }, [editMode, currentSchedule, formData, updateMutation, createMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: i18n.t('pages.report_schedule_page.k17'),
        message: i18n.t('pages.report_schedule_page.k18'),
        danger: true,
        onConfirm: () => {
          deleteMutation.mutate(id);
        },
      });
    },
    [openConfirmDialog, deleteMutation]
  );

  const handleExecute = useCallback(
    async (id: string) => {
      setError('');
      try {
        await executeMutation.mutateAsync(id);
      } catch {
        // Error handled by mutation onError
      }
    },
    [executeMutation]
  );

  const handleViewHistory = useCallback((schedule: ReportSchedule) => {
    setCurrentSchedule(schedule);
    setError('');
    setHistoryDialogOpen(true);
  }, []);

  const getStatusChip = useCallback((status: ScheduleStatus) => {
    const statusInfo = SCHEDULE_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color}
        size='small'
      />
    );
  }, []);

  const getScheduleTypeLabel = useCallback(
    (type: ScheduleType) => SCHEDULE_TYPE_OPTIONS.find((t) => t.value === type)?.label || type,
    []
  );

  const columns: ColumnDef<ReportSchedule>[] = useMemo(
    () => [
      {
        id: 'name',
        label: i18n.t('pages.report_schedule_page.k22'),
        render: (row) => <Typography>{row.name}</Typography>,
      },
      {
        id: 'template',
        label: i18n.t('pages.report_schedule_page.k23'),
        render: (row) => <Typography>{row.template_name || row.template_id}</Typography>,
      },
      {
        id: 'schedule_type',
        label: i18n.t('pages.report_schedule_page.k24'),
        render: (row) => <Typography>{getScheduleTypeLabel(row.schedule_type)}</Typography>,
      },
      {
        id: 'schedule_expression',
        label: i18n.t('pages.report_schedule_page.k25'),
        render: (row) => (
          <Typography
            variant='body2'
            noWrap
          >
            {row.schedule_expression}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: i18n.t('pages.report_schedule_page.k26'),
        render: (row) => getStatusChip(row.status),
      },
      {
        id: 'run_count',
        label: i18n.t('pages.report_schedule_page.k27'),
        render: (row) => <Typography>{row.run_count}</Typography>,
      },
      {
        id: 'last_run_at',
        label: i18n.t('pages.report_schedule_page.k28'),
        render: (row) =>
          row.last_run_at ? (
            <Typography variant='body2'>{new Date(row.last_run_at).toLocaleString()}</Typography>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('pages.report_schedule_page.k0')}
            </Typography>
          ),
      },
    ],
    [getStatusChip, getScheduleTypeLabel]
  );

  const renderRowActions = useCallback(
    (row: ReportSchedule) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title={i18n.t('pages.report_schedule_page.k31')}>
          <span>
            <IconButton
              size='small'
              color='primary'
              onClick={() => handleExecute(row.id)}
              disabled={executeMutation.isPending}
              aria-label={i18n.t('pages.report_schedule_page.k32')}
            >
              <PlayIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={i18n.t('pages.report_schedule_page.k33')}>
          <IconButton
            size='small'
            color='info'
            onClick={() => handleViewHistory(row)}
            aria-label={i18n.t('pages.report_schedule_page.k34')}
          >
            <HistoryIcon size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title={i18n.t('pages.report_schedule_page.k35')}>
          <IconButton
            size='small'
            color='warning'
            onClick={() => handleOpenEditDialog(row)}
            aria-label={i18n.t('pages.report_schedule_page.k36')}
          >
            <EditIcon size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title={i18n.t('pages.report_schedule_page.k37')}>
          <span>
            <IconButton
              size='small'
              color='error'
              onClick={() => handleDelete(row.id)}
              disabled={deleteMutation.isPending}
              aria-label={i18n.t('pages.report_schedule_page.k38')}
            >
              <DeleteIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
    [
      handleExecute,
      handleViewHistory,
      handleOpenEditDialog,
      handleDelete,
      executeMutation.isPending,
      deleteMutation.isPending,
    ]
  );

  const actions = useMemo(
    () => [
      {
        label: i18n.t('pages.report_schedule_page.k21'),
        icon: <PlusIcon size={18} />,
        onClick: handleOpenCreateDialog,
        variant: 'contained' as const,
      },
    ],
    [handleOpenCreateDialog]
  );

  const displayError = error || (schedulesQuery.error as Error)?.message;

  return (
    <>
      {displayError && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
        >
          {displayError}
        </Alert>
      )}
      <ListPageTemplate<ReportSchedule>
        title={i18n.t('pages.report_schedule_page.k19')}
        subtitle={i18n.t('pages.report_schedule_page.k20')}
        columns={columns}
        data={schedules}
        loading={schedulesQuery.isLoading}
        actions={actions}
        renderRowActions={renderRowActions}
        emptyMessage={i18n.t('pages.report_schedule_page.k30')}
      />

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {editMode
            ? i18n.t('pages.report_schedule_page.k40')
            : i18n.t('pages.report_schedule_page.k39')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label={i18n.t('pages.report_schedule_page.k41')}
              value={formData.name as string}
              onChange={(e) => handleFormChange('name', e.target.value)}
              fullWidth
              required
            />
            <FormControl
              fullWidth
              required
            >
              <InputLabel>{i18n.t('pages.report_schedule_page.k42')}</InputLabel>
              <Select
                value={(formData as CreateScheduleRequest).template_id as string}
                onChange={(e) => handleFormChange('template_id', e.target.value)}
                label={i18n.t('pages.report_schedule_page.k43')}
              >
                {templates.map((template) => (
                  <MenuItem
                    key={template.id}
                    value={template.id}
                  >
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              fullWidth
              required
            >
              <InputLabel>{i18n.t('pages.report_schedule_page.k44')}</InputLabel>
              <Select
                value={(formData as CreateScheduleRequest).schedule_type as ScheduleType}
                onChange={(e) => handleFormChange('schedule_type', e.target.value)}
                label={i18n.t('pages.report_schedule_page.k45')}
              >
                {SCHEDULE_TYPE_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={i18n.t('pages.report_schedule_page.k46')}
              value={formData.schedule_expression as string}
              onChange={(e) => handleFormChange('schedule_expression', e.target.value)}
              fullWidth
              required
              helperText={
                (formData as CreateScheduleRequest).schedule_type === 'cron'
                  ? i18n.t('pages.report_schedule_page.k2')
                  : (formData as CreateScheduleRequest).schedule_type === 'interval'
                    ? i18n.t('pages.report_schedule_page.1hour_3')
                    : i18n.t('pages.report_schedule_page.k4')
              }
            />
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ mb: 2 }}
              >
                {i18n.t('pages.report_schedule_page.k1')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(formData.recipients as string[]).map((recipient, index) => (
                  <Box
                    key={index}
                    sx={{ display: 'flex', gap: 1 }}
                  >
                    <TextField
                      label={`${i18n.t('pages.report_schedule_page.k5')}${index + 1}`}
                      value={recipient}
                      onChange={(e) => handleRecipientChange(index, e.target.value)}
                      fullWidth
                    />
                    <IconButton
                      onClick={() => handleRemoveRecipient(index)}
                      color='error'
                      aria-label={i18n.t('pages.report_schedule_page.k47')}
                    >
                      <XIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant='outlined'
                  startIcon={<PlusIcon />}
                  onClick={handleAddRecipient}
                  sx={{ mt: 1 }}
                >
                  {i18n.t('pages.report_schedule_page.k2')}
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{i18n.t('pages.report_schedule_page.k48')}</Button>
          <Button
            onClick={handleSubmit}
            variant='contained'
            disabled={mutating}
          >
            {editMode
              ? i18n.t('pages.report_schedule_page.k50')
              : i18n.t('pages.report_schedule_page.k49')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.report_schedule_page.k51')}</DialogTitle>
        <DialogContent>
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 640 }}>
              {historyQuery.isLoading ? (
                <Typography
                  variant='body1'
                  align='center'
                  sx={{ py: 4 }}
                >
                  {i18n.t('pages.report_schedule_page.k6')}
                </Typography>
              ) : (historyQuery.data || []).length === 0 ? (
                <Typography
                  variant='body1'
                  align='center'
                  sx={{ py: 4 }}
                >
                  {i18n.t('pages.report_schedule_page.k57')}
                </Typography>
              ) : (
                (historyQuery.data || []).map((record: ScheduleExecutionRecord) => (
                  <Box
                    key={record.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1fr 1.5fr 2fr 1.5fr',
                      gap: 2,
                      py: 1.5,
                      borderBottom: 1,
                      borderColor: 'divider',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant='body2'>
                      {new Date(record.started_at).toLocaleString()}
                    </Typography>
                    <Chip
                      label={record.status}
                      color={record.status === 'completed' ? 'success' : 'error'}
                      size='small'
                    />
                    <Typography
                      variant='body2'
                      noWrap
                    >
                      {record.output_path || '-'}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='error'
                    >
                      {record.error_message || '-'}
                    </Typography>
                    {record.completed_at ? (
                      <Typography variant='body2'>
                        {new Date(record.completed_at).toLocaleString()}
                      </Typography>
                    ) : (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.report_schedule_page.k3')}
                      </Typography>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            {i18n.t('pages.report_schedule_page.k58')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </>
  );
};

export default ReportSchedulePage;
