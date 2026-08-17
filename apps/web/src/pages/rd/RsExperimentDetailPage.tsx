import { Grid } from '@/components';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RD_PATHS } from '@/modules/rd/config';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Paper,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import i18n from '@/i18n';
import { LoadingSpinner } from '@topems/shared-components';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  Edit as EditIcon,
  FlaskConical as ScienceIcon,
  FileText as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Plus as PlusIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdApi, type Experiment, type CreateExperimentRecordRequest } from '@/api/rd';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';

interface ExperimentWithProject extends Experiment {
  project_name?: string;
}

const RsExperimentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [showAddRecordDialog, setShowAddRecordDialog] = useState(false);
  const [recordForm, setRecordForm] = useState<CreateExperimentRecordRequest>({
    record_type: i18n.t('pages.rs_experiment_detail_page.k0'),
    content: '',
    recorded_by: '',
  });

  const recordTypes = [
    i18n.t('pages.rs_experiment_detail_page.k5'),
    i18n.t('pages.rs_experiment_detail_page.k4'),
    i18n.t('pages.rs_experiment_detail_page.k3'),
    i18n.t('pages.rs_experiment_detail_page.k2'),
    i18n.t('pages.rs_experiment_detail_page.k1'),
  ];

  const experimentQuery = useQuery({
    queryKey: QUERY_KEYS.RD.EXPERIMENT(id || ''),
    queryFn: async () => {
      const response = await rdApi.getExperiment(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('pages.rs_experiment_detail_page.k6'));
      }
      return response.data as ExperimentWithProject;
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const recordsQuery = useQuery({
    queryKey: QUERY_KEYS.RD.EXPERIMENT_RECORDS(id || ''),
    queryFn: async () => {
      const response = await rdApi.getExperimentRecords(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('pages.rs_experiment_detail_page.k7'));
      }
      return response.data;
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const advancePhaseMutation = useMutation({
    mutationFn: async () => {
      const response = await rdApi.advancePhase(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('pages.rs_experiment_detail_page.k8'));
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.RD.EXPERIMENT(id || ''), data);
      addNotification({
        type: 'success',
        message: i18n.t('pages.rs_experiment_detail_page.k9'),
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.rs_experiment_detail_page.k0'), error);
      addNotification({
        type: 'error',
        message:
          error instanceof Error ? error.message : i18n.t('pages.rs_experiment_detail_page.k10'),
      });
    },
  });

  const createRecordMutation = useMutation({
    mutationFn: async (data: CreateExperimentRecordRequest) => {
      const response = await rdApi.createExperimentRecord(id || '', data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.rs_experiment_detail_page.k11'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RD.EXPERIMENT_RECORDS(id || ''),
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        message: i18n.t('pages.rs_experiment_detail_page.k12'),
      });
      setShowAddRecordDialog(false);
      setRecordForm({
        record_type: i18n.t('pages.rs_experiment_detail_page.k13'),
        content: '',
        recorded_by: '',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.rs_experiment_detail_page.k1'), error);
      addNotification({
        type: 'error',
        message:
          error instanceof Error ? error.message : i18n.t('pages.rs_experiment_detail_page.k14'),
      });
    },
  });

  const experiment = experimentQuery.data || null;
  const records = recordsQuery.data || [];
  const loading = experimentQuery.isLoading || recordsQuery.isLoading;
  const advancePhaseLoading = advancePhaseMutation.isPending;
  const addRecordLoading = createRecordMutation.isPending;

  const handleAdvancePhase = () => {
    advancePhaseMutation.mutate();
  };

  const handleAddRecord = () => {
    createRecordMutation.mutate(recordForm);
  };

  const getPhaseColor = (phase: string): 'info' | 'warning' | 'error' | 'default' => {
    switch (phase) {
      case i18n.t('pages.rs_experiment_detail_page.k15'):
        return 'info';
      case i18n.t('pages.rs_experiment_detail_page.k16'):
        return 'warning';
      case i18n.t('pages.rs_experiment_detail_page.k17'):
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusColor = (
    status: string
  ): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case i18n.t('pages.rs_experiment_detail_page.k18'):
        return 'primary';
      case i18n.t('pages.rs_experiment_detail_page.k19'):
        return 'success';
      case i18n.t('pages.rs_experiment_detail_page.k20'):
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container
        maxWidth='xl'
        sx={{ py: 3 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
          }}
        >
          <LoadingSpinner size='lg' />
        </div>
      </Container>
    );
  }

  if (!experiment) {
    return (
      <Container
        maxWidth='xl'
        sx={{ py: 3 }}
      >
        <Typography
          variant='h4'
          sx={{ fontWeight: 'bold' }}
        >
          {i18n.t('pages.rs_experiment_detail_page.k2')}
        </Typography>
      </Container>
    );
  }

  return (
    <PageContainer maxWidth='xl'>
      {/* 页面头部 */}
      <div style={{ marginBottom: 12 }}>
        <Stack
          direction='row'
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <div>
            <Stack
              direction='row'
              spacing={2}
              sx={{ alignItems: 'center' }}
            >
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold' }}
              >
                {experiment.name}
              </Typography>
              <Chip
                label={experiment.status}
                color={getStatusColor(experiment.status)}
              />
              <Chip
                label={experiment.phase}
                color={getPhaseColor(experiment.phase)}
                size='small'
              />
            </Stack>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              [i18n.t('pages.rs_experiment_detail_page.k3')]: {experiment.code} |{' '}
              {i18n.t('pages.rs_experiment_detail_page.k4')}
              {experiment.project_name || experiment.project_id} |
              [i18n.t('pages.rs_experiment_detail_page.k5')]: {experiment.experimenter}
            </Typography>
          </div>
          <Stack
            direction='row'
            spacing={2}
          >
            <Button
              variant='outlined'
              startIcon={<EditIcon />}
              onClick={() => navigate(`${RD_PATHS.experiment}/${id}/edit`)}
            >
              {i18n.t('pages.rs_experiment_detail_page.k6')}
            </Button>
            <Button
              variant='contained'
              startIcon={<TrendingUpIcon />}
              onClick={handleAdvancePhase}
              disabled={advancePhaseLoading}
            >
              {advancePhaseLoading ? (
                <LoadingSpinner size='sm' />
              ) : (
                i18n.t('pages.rs_experiment_detail_page.k21')
              )}
            </Button>
          </Stack>
        </Stack>
      </div>

      {/* 试验概览 */}
      <Grid
        container
        spacing={3}
        sx={{ mb: 3 }}
      >
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography
                variant='h6'
                gutterBottom
              >
                {i18n.t('pages.rs_experiment_detail_page.k7')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {experiment.objective}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant='h6'
                gutterBottom
              >
                {i18n.t('pages.rs_experiment_detail_page.k8')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {experiment.method}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid
                container
                spacing={2}
              >
                <Grid size={{ xs: 6 }}>
                  <Typography variant='body2'>
                    {i18n.t('pages.rs_experiment_detail_page.k0')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant='body2'>
                    [i18n.t('pages.rs_experiment_detail_page.k9')]:{' '}
                    {experiment.completed_at || i18n.t('pages.rs_experiment_detail_page.k22')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant='body2'>
                    {i18n.t('components.report_builder.k21')}: {experiment.batch_number || '-'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant='body2'>
                    [i18n.t('pages.rs_experiment_detail_page.k11')]: {experiment.scale}{' '}
                    {experiment.scale_unit}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography
                variant='h6'
                gutterBottom
              >
                {i18n.t('pages.rs_experiment_detail_page.k12')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {experiment.conclusions || i18n.t('pages.rs_experiment_detail_page.k23')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 详细信息标签页 */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={(_: React.SyntheticEvent, v: number) => setActiveTab(v)}
        >
          <Tab
            label={i18n.t('pages.rs_experiment_detail_page.k24')}
            icon={<ScienceIcon />}
            iconPosition='start'
          />
          <Tab
            label={i18n.t('pages.rs_experiment_detail_page.k25')}
            icon={<DescriptionIcon />}
            iconPosition='start'
          />
          <Tab
            label={i18n.t('pages.rs_experiment_detail_page.k26')}
            icon={<CheckCircleIcon />}
            iconPosition='start'
          />
        </Tabs>

        <div style={{ padding: 12 }}>
          {activeTab === 0 && (
            <Stack
              direction='row'
              sx={{ justifyContent: 'flex-end', mb: 2 }}
            >
              <Button
                variant='outlined'
                startIcon={<PlusIcon />}
                onClick={() => setShowAddRecordDialog(true)}
              >
                {i18n.t('pages.rs_experiment_detail_page.k13')}
              </Button>
            </Stack>
          )}

          {/* 实验记录 */}
          {activeTab === 0 && (
            <Timeline>
              {records.length === 0 ? (
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ py: 4, textAlign: 'center', width: '100%' }}
                >
                  {i18n.t('pages.rs_experiment_detail_page.k14')}
                </Typography>
              ) : (
                records.map((record) => (
                  <TimelineItem key={record.id}>
                    <TimelineSeparator>
                      <TimelineDot color='primary'>
                        <ScienceIcon />
                      </TimelineDot>
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Stack
                          direction='row'
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <Chip
                              label={record.record_type}
                              size='small'
                              sx={{ mb: 1 }}
                            />
                            <Typography variant='body2'>{record.content}</Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              [i18n.t('pages.rs_experiment_detail_page.k15')]: {record.recorded_by}{' '}
                              | {i18n.t('pages.rs_experiment_detail_page.k16')}
                              {record.recorded_at}
                            </Typography>
                          </div>
                        </Stack>
                      </Paper>
                    </TimelineContent>
                  </TimelineItem>
                ))
              )}
            </Timeline>
          )}

          {/* 数据结果 */}
          {activeTab === 1 && (
            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  gutterBottom
                >
                  {i18n.t('pages.rs_experiment_detail_page.k17')}
                </Typography>
                {experiment.results && typeof experiment.results === 'object' ? (
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(experiment.results, null, 2)}
                  </pre>
                ) : (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('pages.rs_experiment_detail_page.k18')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* 批次追溯 */}
          {activeTab === 2 && (
            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  gutterBottom
                >
                  {i18n.t('pages.rs_experiment_detail_page.k19')}
                </Typography>
                {experiment.batch_number ? (
                  <Typography variant='body2'>
                    {i18n.t('pages.rs_experiment_detail_page.k1')}
                  </Typography>
                ) : (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('pages.rs_experiment_detail_page.k20')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </Paper>

      {/* 添加记录对话框 */}
      <Dialog
        open={showAddRecordDialog}
        onClose={() => setShowAddRecordDialog(false)}
      >
        <DialogTitle>{i18n.t('pages.rs_experiment_detail_page.k27')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <FormControl fullWidth>
              <InputLabel>{i18n.t('pages.rs_experiment_detail_page.k28')}</InputLabel>
              <Select
                value={recordForm.record_type}
                label={i18n.t('pages.rs_experiment_detail_page.k29')}
                onChange={(e) =>
                  setRecordForm((prev) => ({ ...prev, record_type: e.target.value }))
                }
              >
                {recordTypes.map((type) => (
                  <MenuItem
                    key={type}
                    value={type}
                  >
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={i18n.t('pages.rs_experiment_detail_page.k30')}
              multiline
              rows={4}
              value={recordForm.content}
              onChange={(e) => setRecordForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder={i18n.t('pages.rs_experiment_detail_page.k31')}
            />
            <TextField
              fullWidth
              label={i18n.t('pages.rs_experiment_detail_page.k32')}
              value={recordForm.recorded_by}
              onChange={(e) => setRecordForm((prev) => ({ ...prev, recorded_by: e.target.value }))}
              placeholder={i18n.t('pages.rs_experiment_detail_page.k33')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddRecordDialog(false)}>
            {i18n.t('pages.rs_experiment_detail_page.k34')}
          </Button>
          <Button
            variant='contained'
            onClick={handleAddRecord}
            disabled={addRecordLoading}
          >
            {addRecordLoading ? (
              <LoadingSpinner size='sm' />
            ) : (
              i18n.t('pages.rs_experiment_detail_page.k35')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsExperimentDetailPage;
