import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import {
  Plus as PlusIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Play as PlayIcon,
  History as HistoryIcon,
  Check as CheckIcon,
  X as XIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

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
  color: string;
}[] = [
  { value: 'active', label: i18n.t('pages.report_schedule_page.k2'), color: 'success' },
  { value: 'paused', label: i18n.t('pages.report_schedule_page.k3'), color: 'warning' },
  { value: 'completed', label: i18n.t('pages.report_schedule_page.k4'), color: 'info' },
  { value: 'failed', label: i18n.t('pages.report_schedule_page.k5'), color: 'error' },
];

const ReportSchedulePage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ReportSchedule | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<CreateScheduleRequest | UpdateScheduleRequest>({
    name: '',
    template_id: '',
    schedule_type: 'cron',
    schedule_expression: '',
    recipients: [],
  });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE ,
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE ,
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE ,
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.REPORT_SCHEDULES_BASE ,
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
  const loading =
    schedulesQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    executeMutation.isPending;

  const handleOpenCreateDialog = () => {
    setEditMode(false);
    setCurrentSchedule(null);
    setError('');
    setFormData({
      name: '',
      template_id: '',
      schedule_type: 'cron',
      schedule_expression: '',
      recipients: [],
    });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (schedule: ReportSchedule) => {
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
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError('');
    setFormData({
      name: '',
      template_id: '',
      schedule_type: 'cron',
      schedule_expression: '',
      recipients: [],
    });
  };

  const handleFormChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...(formData.recipients || [])];
    newRecipients[index] = value;
    setFormData((prev) => ({ ...prev, recipients: newRecipients }));
  };

  const handleAddRecipient = () => {
    setFormData((prev) => ({
      ...prev,
      recipients: [...(prev.recipients || []), ''],
    }));
  };

  const handleRemoveRecipient = (index: number) => {
    const newRecipients = (formData.recipients || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, recipients: newRecipients }));
  };

  const handleSubmit = async () => {
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
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const handleDelete = (id: string) => {
    openConfirmDialog({
      title: i18n.t('pages.report_schedule_page.k17'),
      message: i18n.t('pages.report_schedule_page.k18'),
      danger: true,
      onConfirm: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const handleExecute = async (id: string) => {
    setError('');
    try {
      await executeMutation.mutateAsync(id);
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const handleViewHistory = async (schedule: ReportSchedule) => {
    setCurrentSchedule(schedule);
    setError('');
    setHistoryDialogOpen(true);
  };

  const getStatusChip = (status: ScheduleStatus) => {
    const statusInfo = SCHEDULE_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color as React.ComponentProps<typeof Chip>['color']}
        size='small'
      />
    );
  };

  const getScheduleTypeLabel = (type: ScheduleType) => {
    return SCHEDULE_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;
  };

  return (
    <PageContainer
      title={i18n.t('pages.report_schedule_page.k19')}
      subtitle={i18n.t('pages.report_schedule_page.k20')}
      headerProps={{
        actions: [
          {
            label: i18n.t('pages.report_schedule_page.k21'),
            icon: <PlusIcon />,
            onClick: handleOpenCreateDialog,
            variant: 'contained',
          },
        ],
      }}
    >
      {(error || schedulesQuery.error) && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
        >
          {error || (schedulesQuery.error as Error)?.message}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('pages.report_schedule_page.k22')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k23')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k24')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k25')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k26')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k27')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k28')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k29')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      <Typography variant='body1'>{i18n.t('pages.report_schedule_page.k1')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : schedules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      <Typography variant='body1'>{i18n.t('pages.report_schedule_page.k30')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{schedule.name}</TableCell>
                      <TableCell>{schedule.template_name || schedule.template_id}</TableCell>
                      <TableCell>{getScheduleTypeLabel(schedule.schedule_type)}</TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          noWrap
                        >
                          {schedule.schedule_expression}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(schedule.status)}</TableCell>
                      <TableCell>{schedule.run_count}</TableCell>
                      <TableCell>
                        {schedule.last_run_at ? (
                          <Typography variant='body2'>
                            {new Date(schedule.last_run_at).toLocaleString()}
                          </Typography>
                        ) : (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('pages.report_schedule_page.k0')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={i18n.t('pages.report_schedule_page.k31')}>
                            <IconButton
                              size='small'
                              color='primary'
                              onClick={() => handleExecute(schedule.id)}
                              aria-label={i18n.t('pages.report_schedule_page.k32')}
                            >
                              <PlayIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={i18n.t('pages.report_schedule_page.k33')}>
                            <IconButton
                              size='small'
                              color='info'
                              onClick={() => handleViewHistory(schedule)}
                              aria-label={i18n.t('pages.report_schedule_page.k34')}
                            >
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={i18n.t('pages.report_schedule_page.k35')}>
                            <IconButton
                              size='small'
                              color='warning'
                              onClick={() => handleOpenEditDialog(schedule)}
                              aria-label={i18n.t('pages.report_schedule_page.k36')}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={i18n.t('pages.report_schedule_page.k37')}>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleDelete(schedule.id)}
                              aria-label={i18n.t('pages.report_schedule_page.k38')}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editMode ? i18n.t('pages.report_schedule_page.k40') : i18n.t('pages.report_schedule_page.k39')}</DialogTitle>
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
          >
            {editMode ? i18n.t('pages.report_schedule_page.k50') : i18n.t('pages.report_schedule_page.k49')}
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
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('pages.report_schedule_page.k52')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k53')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k54')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k55')}</TableCell>
                  <TableCell>{i18n.t('pages.report_schedule_page.k56')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      <Typography variant='body1'>{i18n.t('pages.report_schedule_page.k6')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (historyQuery.data || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      <Typography variant='body1'>{i18n.t('pages.report_schedule_page.k57')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (historyQuery.data || []).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.started_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          color={record.status === 'completed' ? 'success' : 'error'}
                          size='small'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          noWrap
                        >
                          {record.output_path || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          color='error'
                        >
                          {record.error_message || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>{i18n.t('pages.report_schedule_page.k58')}</Button>
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
    </PageContainer>
  );
};

export default ReportSchedulePage;
