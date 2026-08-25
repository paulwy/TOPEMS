import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Package, User, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Box,
  Typography,
  MenuItem,
  Button,
} from '@mui/material';
import i18n from '@/i18n';

import { DataTable } from '@/components/common/DataTable';
import { PageContainer } from '@/components/common';
import type { ColumnDef } from '@tanstack/react-table';
import { limsApi } from '@/api/lims';
import type { Sample, InspectionTask, InspectionRecord } from '@/api/lims';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import {
  DetailPageTemplate,
  type ColumnDef as ListColumnDef,
  type SectionConfig,
} from '@/components/templates';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import dayjs from 'dayjs';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';

const ct = designTokens.colors;

interface SampleTestRecord {
  id: string;
  step_name: string;
  inspector: string;
  result: string;
  conclusion: string;
  tested_at: string;
}

interface RawRecord extends Partial<InspectionRecord> {
  step_name?: string;
  created_at?: string;
}

interface LimsListResponse<T> {
  items?: T[];
  tasks?: T[];
  records?: T[];
}

const LimsSampleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: detailData, isPending: loading } = useQuery({
    queryKey: QUERY_KEYS.LIMS.SAMPLE(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const [sampleRes, tasksRes] = await Promise.all([
        limsApi.getSample(id),
        limsApi.listTasksBySample(id),
      ]);

      let sample: Sample | null = null;
      if (sampleRes.success && sampleRes.data) {
        sample = sampleRes.data as Sample;
      }

      let tasks: InspectionTask[] = [];
      if (tasksRes.success && tasksRes.data) {
        const tasksData = tasksRes.data as LimsListResponse<InspectionTask> | InspectionTask[];
        tasks = Array.isArray(tasksData) ? tasksData : tasksData.items || tasksData.tasks || [];
      }

      let records: SampleTestRecord[] = [];
      for (const task of tasks) {
        const recordRes = await limsApi.listRecordsByTask(task.id);
        if (recordRes.success && recordRes.data) {
          const recordData = recordRes.data as LimsListResponse<RawRecord> | RawRecord[];
          const recordArray = Array.isArray(recordData)
            ? recordData
            : recordData.records || recordData.items || [];
          const formattedRecords = recordArray.map((r: RawRecord) => ({
            id: r.id || '',
            step_name: r.step_name || r.step_id || '',
            inspector: r.inspector || '-',
            result: r.result || '-',
            conclusion: r.conclusion || '-',
            tested_at: r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : '-',
          }));
          records = [...records, ...formattedRecords];
        }
      }

      return { sample, tasks, records };
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const sample = detailData?.sample || null;
  const tasks = detailData?.tasks || [];
  const records = detailData?.records || [];

  useEffect(() => {
    if (sample) {
      setFormData({
        name: sample.name,
        description: sample.description || '',
        status: sample.status,
      });
    }
  }, [sample]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; status: string }) => {
      if (!sample) throw new Error(i18n.t('pages.lims_sample_detail_page.k0'));
      const response = await limsApi.updateSample(sample.id, data);
      if (!response.success) {
        throw new Error(i18n.t('pages.lims_sample_detail_page.k1'));
      }
      return response;
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LIMS.SAMPLE(id),
          exact: false,
          refetchType: 'active',
        });
      }
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.SAMPLES,
        exact: false,
        refetchType: 'active',
      });
      setShowEditModal(false);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.lims_sample_detail_page.k0'), error);
      addNotification({
        title: i18n.t('pages.lims_sample_detail_page.k3'),
        message: i18n.t('pages.lims_sample_detail_page.k2'),
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!sample) throw new Error(i18n.t('pages.lims_sample_detail_page.k4'));
      const response = await limsApi.deleteSample(sample.id);
      if (!response.success) {
        throw new Error(i18n.t('pages.lims_sample_detail_page.k5'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.SAMPLES,
        exact: false,
        refetchType: 'active',
      });
      navigate(LIMS_PATHS.root);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.lims_sample_detail_page.k1'), error);
      addNotification({
        title: i18n.t('pages.lims_sample_detail_page.k7'),
        message: i18n.t('pages.lims_sample_detail_page.k6'),
        type: 'error',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: {
        bg: 'warning.100',
        color: ct.yellow[600],
        label: i18n.t('pages.lims_sample_detail_page.k8'),
      },
      [i18n.t('pages.lims_sample_detail_page.k2')]: {
        bg: 'warning.100',
        color: ct.yellow[600],
        label: i18n.t('pages.lims_sample_detail_page.k9'),
      },
      in_progress: {
        bg: 'primary.100',
        color: 'primary.dark',
        label: i18n.t('pages.lims_sample_detail_page.k10'),
      },
      [i18n.t('pages.lims_sample_detail_page.k3')]: {
        bg: 'primary.100',
        color: 'primary.dark',
        label: i18n.t('pages.lims_sample_detail_page.k11'),
      },
      completed: {
        bg: 'success.lighter',
        color: 'success.dark',
        label: i18n.t('pages.lims_sample_detail_page.k12'),
      },
      [i18n.t('pages.lims_sample_detail_page.k4')]: {
        bg: 'success.lighter',
        color: 'success.dark',
        label: i18n.t('pages.lims_sample_detail_page.k13'),
      },
      cancelled: {
        bg: 'error.lighter',
        color: 'error.dark',
        label: i18n.t('pages.lims_sample_detail_page.k14'),
      },
      [i18n.t('pages.lims_sample_detail_page.k5')]: {
        bg: 'error.lighter',
        color: 'error.dark',
        label: i18n.t('pages.lims_sample_detail_page.k15'),
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

  const handleEdit = async () => {
    if (!sample) return;
    if (!formData.name.trim()) {
      addNotification({
        title: i18n.t('pages.lims_sample_detail_page.k17'),
        message: i18n.t('pages.lims_sample_detail_page.k16'),
        type: 'error',
      });
      return;
    }
    await updateMutation.mutateAsync(formData);
  };

  const handleDelete = async () => {
    if (!sample) return;
    if (
      !confirm(
        `${i18n.t('pages.lims_sample_detail_page.k6')}${sample.name}${i18n.t('pages.lims_sample_detail_page.k7')}`
      )
    )
      return;
    await deleteMutation.mutateAsync();
  };

  const getTestStatistics = () => {
    const stats = {
      total: records.length,
      passed: records.filter((r) => r.conclusion === i18n.t('pages.lims_sample_detail_page.k18'))
        .length,
      failed: records.filter((r) => r.conclusion === i18n.t('pages.lims_sample_detail_page.k19'))
        .length,
      pending: records.filter(
        (r) => r.conclusion === i18n.t('pages.lims_sample_detail_page.k20') || r.conclusion === '-'
      ).length,
    };
    return stats;
  };

  const chartData = [
    {
      name: i18n.t('pages.lims_sample_detail_page.k21'),
      value: records.length,
      fill: 'success.main',
    },
    {
      name: i18n.t('pages.lims_sample_detail_page.k22'),
      value: records.filter((r) => r.conclusion === i18n.t('pages.lims_sample_detail_page.k23'))
        .length,
      fill: 'success.dark',
    },
    {
      name: i18n.t('pages.lims_sample_detail_page.k24'),
      value: records.filter((r) => r.conclusion === i18n.t('pages.lims_sample_detail_page.k25'))
        .length,
      fill: 'error.main',
    },
    {
      name: i18n.t('pages.lims_sample_detail_page.k26'),
      value: records.filter(
        (r) => r.conclusion === i18n.t('pages.lims_sample_detail_page.k27') || r.conclusion === '-'
      ).length,
      fill: 'warning.main',
    },
  ];

  const recordColumns: ColumnDef<SampleTestRecord>[] = [
    { accessorKey: 'step_name', header: i18n.t('pages.lims_sample_detail_page.k28') },
    { accessorKey: 'inspector', header: i18n.t('pages.lims_sample_detail_page.k29') },
    { accessorKey: 'result', header: i18n.t('pages.lims_sample_detail_page.k30') },
    { accessorKey: 'conclusion', header: i18n.t('pages.lims_sample_detail_page.k31') },
    { accessorKey: 'tested_at', header: i18n.t('pages.lims_sample_detail_page.k32') },
  ];

  const stats = getTestStatistics();

  // Sidebar - 关联检验任务
  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <FileText sx={{ fontSize: 20, color: 'primary.dark' }} />
        {i18n.t('pages.lims_sample_detail_page.k8')}
      </Typography>
      {tasks.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {tasks.map((task) => (
            <Card
              key={task.id}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'grey.50' },
              }}
              onClick={() => navigate(`${LIMS_PATHS.taskDetail}?id=${task.id}`)}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {task.task_no}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {task.sample_name || i18n.t('pages.lims_sample_detail_page.k33')}
                    </Typography>
                  </Box>
                  <Chip
                    label={
                      task.status === 'completed' ||
                      task.status === i18n.t('pages.lims_sample_detail_page.k34')
                        ? i18n.t('pages.lims_sample_detail_page.k35')
                        : task.status === 'in_progress' ||
                            task.status === i18n.t('pages.lims_sample_detail_page.k36')
                          ? i18n.t('pages.lims_sample_detail_page.k37')
                          : i18n.t('pages.lims_sample_detail_page.k38')
                    }
                    size='small'
                    sx={{
                      backgroundColor:
                        task.status === 'completed' ||
                        task.status === i18n.t('pages.lims_sample_detail_page.k39')
                          ? 'success.lighter'
                          : task.status === 'in_progress' ||
                              task.status === i18n.t('pages.lims_sample_detail_page.k40')
                            ? 'primary.100'
                            : 'warning.100',
                      color:
                        task.status === 'completed' ||
                        task.status === i18n.t('pages.lims_sample_detail_page.k41')
                          ? 'success.dark'
                          : task.status === 'in_progress' ||
                              task.status === i18n.t('pages.lims_sample_detail_page.k42')
                            ? 'primary.dark'
                            : ct.yellow[600],
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'text.secondary',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <User sx={{ width: 12, height: 12 }} />
                    {task.inspector || '-'}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock sx={{ width: 12, height: 12 }} />
                    {task.created_at ? dayjs(task.created_at).format('YYYY-MM-DD') : '-'}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
          <FileText sx={{ width: 48, height: 48, opacity: 0.5, mx: 'auto', mb: 1 }} />
          <Typography variant='body2'>{i18n.t('pages.lims_sample_detail_page.k43')}</Typography>
        </Box>
      )}
    </Box>
  );

  // Sections - 检验统计
  const sections: SectionConfig[] = [
    {
      id: 'statistics',
      title: i18n.t('pages.lims_sample_detail_page.k44'),
      content: (
        <Box>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <BarChart
                data={chartData}
                layout='vertical'
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis type='number' />
                <YAxis
                  type='category'
                  dataKey='name'
                  width={60}
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    `${value} ${i18n.t('pages.lims_sample_detail_page.k9')}`,
                    i18n.t('pages.lims_sample_detail_page.k45'),
                  ]}
                  contentStyle={{
                    backgroundColor: 'common.white',
                    border: '1px solid border.default',
                    borderRadius: 'md',
                  }}
                />
                <Bar
                  dataKey='value'
                  radius={[0, 4, 4, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 2,
              mt: 2,
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                  fontWeight: 700,
                  color: 'grey.900',
                }}
              >
                {stats.total}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mt: 0.5 }}
              >
                {i18n.t('pages.lims_sample_detail_page.k10')}
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'success.light',
                borderRadius: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                  fontWeight: 700,
                  color: 'success.dark',
                }}
              >
                {stats.passed}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'success.dark', mt: 0.5 }}
              >
                {i18n.t('pages.lims_sample_detail_page.k11')}
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'error.light',
                borderRadius: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                  fontWeight: 700,
                  color: 'error.dark',
                }}
              >
                {stats.failed}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'error.dark', mt: 0.5 }}
              >
                {i18n.t('pages.lims_sample_detail_page.k12')}
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'warning.lighter',
                borderRadius: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                  fontWeight: 700,
                  color: ct.yellow[600],
                }}
              >
                {stats.pending}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: ct.yellow[600], mt: 0.5 }}
              >
                {i18n.t('pages.lims_sample_detail_page.k13')}
              </Typography>
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      id: 'records',
      title: i18n.t('pages.lims_sample_detail_page.k46'),
      content: (
        <Box>
          {records.length > 0 ? (
            <DataTable
              columns={recordColumns}
              data={records}
              enablePagination={false}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <CheckCircle sx={{ width: 64, height: 64, opacity: 0.5, mx: 'auto', mb: 2 }} />
              <Typography>{i18n.t('pages.lims_sample_detail_page.k47')}</Typography>
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
          <p style={{ color: ct.grey[600] }}>{i18n.t('pages.lims_sample_detail_page.k14')}</p>
        </div>
      </div>
    );
  }

  if (!sample) {
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
          <p style={{ color: ct.grey[600] }}>{i18n.t('pages.lims_sample_detail_page.k48')}</p>
          <Button
            onClick={() => navigate(LIMS_PATHS.root)}
            sx={{ mt: 2 }}
          >
            {i18n.t('pages.lims_sample_detail_page.k15')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          sample?.name ||
          sample?.sample_no ||
          sample?.id ||
          i18n.t('pages.lims_sample_detail_page.k49')
        }
        breadcrumbs={[
          { label: i18n.t('pages.lims_sample_detail_page.k50'), href: '/dashboard' },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: i18n.t('pages.lims_sample_detail_page.k51') },
        ]}
        backHref={LIMS_PATHS.root}
        loading={loading}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
        infoCard={{
          avatar: <Package sx={{ fontSize: 40, color: 'secondary.main' }} />,
          title: sample.name,
          subtitle: sample.sample_no || sample.id,
          tags: [sample.status],
          stats: [
            { label: i18n.t('pages.lims_sample_detail_page.k52'), value: tasks.length },
            { label: i18n.t('pages.lims_sample_detail_page.k53'), value: records.length },
          ],
        }}
        sidebar={sidebarContent}
        sections={sections}
      >
        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{i18n.t('pages.lims_sample_detail_page.k54')}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={i18n.t('pages.lims_sample_detail_page.k16')}
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                size='small'
                placeholder={i18n.t('pages.lims_sample_detail_page.k55')}
              />
              <TextField
                label={i18n.t('pages.lims_sample_detail_page.k56')}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                fullWidth
                multiline
                rows={3}
                placeholder={i18n.t('pages.lims_sample_detail_page.k57')}
              />
              <TextField
                select
                label={i18n.t('pages.lims_sample_detail_page.k58')}
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                fullWidth
                size='small'
              >
                <MenuItem value={i18n.t('pages.lims_sample_detail_page.k59')}>
                  {i18n.t('pages.lims_sample_detail_page.k60')}
                </MenuItem>
                <MenuItem value={i18n.t('pages.lims_sample_detail_page.k61')}>
                  {i18n.t('pages.lims_sample_detail_page.k62')}
                </MenuItem>
                <MenuItem value={i18n.t('pages.lims_sample_detail_page.k63')}>
                  {i18n.t('pages.lims_sample_detail_page.k64')}
                </MenuItem>
                <MenuItem value={i18n.t('pages.lims_sample_detail_page.k65')}>
                  {i18n.t('pages.lims_sample_detail_page.k66')}
                </MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowEditModal(false)}
            >
              {i18n.t('pages.lims_sample_detail_page.k17')}
            </Button>
            <Button
              variant='contained'
              onClick={handleEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending
                ? i18n.t('pages.lims_sample_detail_page.k18')
                : i18n.t('pages.lims_sample_detail_page.k67')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{i18n.t('pages.lims_sample_detail_page.k68')}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={i18n.t('pages.lims_sample_detail_page.k69')}
                fullWidth
                size='small'
                placeholder={i18n.t('pages.lims_sample_detail_page.k70')}
              />
              <TextField
                label={i18n.t('pages.lims_sample_detail_page.k71')}
                fullWidth
                size='small'
                placeholder={i18n.t('pages.lims_sample_detail_page.k72')}
              />
              <TextField
                label={i18n.t('pages.lims_sample_detail_page.k73')}
                fullWidth
                multiline
                rows={3}
                placeholder={i18n.t('pages.lims_sample_detail_page.k74')}
              />
              <TextField
                select
                label={i18n.t('pages.lims_sample_detail_page.k75')}
                fullWidth
                size='small'
              >
                <MenuItem value={i18n.t('pages.lims_sample_detail_page.k76')}>
                  {i18n.t('pages.lims_sample_detail_page.k77')}
                </MenuItem>
                <MenuItem value={i18n.t('pages.lims_sample_detail_page.k78')}>
                  {i18n.t('pages.lims_sample_detail_page.k79')}
                </MenuItem>
                <MenuItem value={i18n.t('pages.lims_sample_detail_page.k80')}>
                  {i18n.t('pages.lims_sample_detail_page.k81')}
                </MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowRecordModal(false)}
            >
              {i18n.t('pages.lims_sample_detail_page.k19')}
            </Button>
            <Button
              variant='contained'
              onClick={() => setShowRecordModal(false)}
            >
              {i18n.t('pages.lims_sample_detail_page.k20')}
            </Button>
          </DialogActions>
        </Dialog>
      </DetailPageTemplate>
    </PageContainer>
  );
};

export default LimsSampleDetailPage;
