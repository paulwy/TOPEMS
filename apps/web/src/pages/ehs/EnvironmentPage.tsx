import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Plus, Eye, Activity, FileText, AlertTriangle } from 'lucide-react';
import { ListPageTemplate } from '@/components';
import type { ColumnDef, RowAction, FilterConfig } from '@/components';
import { PageContainer } from '@/components/common';
import { ehsApi } from '@/api/ehs';
import type { EnvironmentMonitor } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const EnvironmentPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<EnvironmentMonitor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    monitor_type: '',
    location: '',
    description: '',
    monitor_frequency: '',
    standard_value: '',
    warning_threshold: '',
    alarm_threshold: '',
    unit: '',
    status: 'active' as const,
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const monitorsQuery = useQuery<EnvironmentMonitor[]>({
    queryKey: ['ehs-environment-monitors', searchTerm, typeFilter, statusFilter],
    queryFn: async () => {
      const response = await ehsApi.listEnvironmentMonitors({
        search: searchTerm || undefined,
        monitor_type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const monitorsData = (
          Array.isArray(data)
            ? (data as unknown as Record<string, unknown>[])
            : (data.data as unknown as Record<string, unknown>[]) || []
        ) as unknown as Record<string, unknown>[];
        const adapted = monitorsData.map((item) => ({
          ...item,
          status:
            item.status === 'active'
              ? 'active'
              : item.status === 'inactive'
                ? 'inactive'
                : item.status === 'maintenance'
                  ? t('ehs.environment_page.maintenance')
                  : item.status,
        }));
        return adapted as unknown as EnvironmentMonitor[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const monitors = monitorsQuery.data || [];
  const loading = monitorsQuery.isLoading;

  const monitorDetailQuery = useQuery({
    queryKey: ['ehs-environment-monitor-detail', selectedMonitor?.id],
    queryFn: async () => {
      if (!selectedMonitor?.id) return null;
      const response = await ehsApi.getEnvironmentMonitor(selectedMonitor.id);
      if (response.success && response.data) {
        return response.data as EnvironmentMonitor;
      }
      return null;
    },
    enabled: !!selectedMonitor?.id && showDetailModal,
    staleTime: 5 * 60 * 1000,
  });

  const detailLoading = monitorDetailQuery.isLoading;
  const monitorDetail = monitorDetailQuery.data;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      active: { bg: 'success.lighter', color: 'success.dark' },
      inactive: { bg: 'error.lighter', color: 'error.dark' },
      maintenance: { bg: 'warning.lighter', color: 'warning.dark' },
      维护中: { bg: 'warning.lighter', color: 'warning.dark' },
    };
    const statusLabels: Record<string, string> = {
      active: t('ehs.environment_page.normal'),
      inactive: t('ehs.environment_page.inactive'),
      maintenance: t('ehs.environment_page.maintenance'),
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    const label = statusLabels[status] || status;
    return (
      <Chip
        label={label}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const columns = useMemo<ColumnDef<EnvironmentMonitor>[]>(
    () => [
      {
        id: 'monitor_no',
        label: t('ehs.environment_page.text_808bc7'),
        render: (row) => row.monitor_no || '-',
      },
      {
        id: 'name',
        label: t('ehs.environment_page.name'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.name}
          </Typography>
        ),
      },
      {
        id: 'monitor_type',
        label: t('ehs.environment_page.type'),
        render: (row) => row.monitor_type || '-',
      },
      {
        id: 'location',
        label: t('ehs.environment_page.text_d4d2a6'),
        render: (row) => row.location || '-',
      },
      {
        id: 'status',
        label: t('ehs.environment_page.status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const handleViewDetail = (monitor: EnvironmentMonitor) => {
    setSelectedMonitor(monitor);
    setShowDetailModal(true);
  };

  const rowActions = useMemo<RowAction<EnvironmentMonitor>[]>(
    () => [
      {
        label: t('ehs.environment_page.detail'),
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'monitor_type',
        label: t('ehs.environment_page.type'),
        type: 'select',
        options: [
          { value: '', label: t('ehs.environment_page.all') },
          { value: t('ehs.environment_page.text_319faa'), label: t('ehs.environment_page.text_c19e2d') },
          { value: t('ehs.environment_page.text_939a2d'), label: t('ehs.environment_page.text_939a2d') },
          { value: t('ehs.environment_page.text_c63ace'), label: t('ehs.environment_page.text_c0a4ed') },
          { value: t('ehs.environment_page.text_5a5df7'), label: t('ehs.environment_page.text_fffc90') },
        ],
        value: typeFilter,
        onChange: (value) => setTypeFilter(value as string),
      },
      {
        id: 'status',
        label: t('ehs.environment_page.status'),
        type: 'select',
        options: [
          { value: '', label: t('ehs.environment_page.all') },
          { value: 'active', label: t('ehs.environment_page.normal') },
          { value: 'inactive', label: t('ehs.environment_page.inactive') },
          { value: 'maintenance', label: t('ehs.environment_page.maintenance') },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [typeFilter, statusFilter]
  );

  const filteredMonitors = useMemo(() => {
    return monitors.filter((monitor) => {
      const matchesSearch =
        monitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (monitor.monitor_no || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || monitor.monitor_type === typeFilter;
      const matchesStatus = !statusFilter || monitor.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [monitors, searchTerm, typeFilter, statusFilter]);

  const handleCreate = () => {
    setFormData({
      name: '',
      monitor_type: '',
      location: '',
      description: '',
      monitor_frequency: '',
      standard_value: '',
      warning_threshold: '',
      alarm_threshold: '',
      unit: '',
      status: 'active',
    });
    setShowCreateModal(true);
  };

  const createMonitorMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return ehsApi.createEnvironmentMonitor({
        name: data.name,
        monitor_type: data.monitor_type,
        location: data.location || null,
        description: data.description || null,
        monitor_frequency: data.monitor_frequency || null,
        standard_value: data.standard_value || null,
        warning_threshold: data.warning_threshold ? Number(data.warning_threshold) : null,
        alarm_threshold: data.alarm_threshold ? Number(data.alarm_threshold) : null,
        unit: data.unit || null,
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-environment-monitors'] });
      addNotification({ title: t('ehs.environment_page.success'), message: t('ehs.environment_page.create'), type: 'success' });
      setShowCreateModal(false);
    },
    onError: (err) => {
      addNotification({ title: t('ehs.environment_page.error'), message: t('ehs.environment_page.create_1'), type: 'error' });
      apiLogger.error(t('ehs.environment_page.create_2'), err);
    },
  });

  const handleSave = () => {
    createMonitorMutation.mutate(formData);
  };

  const stats = useMemo(
    () => ({
      total: monitors.length,
      active: monitors.filter((m) => m.status === 'active').length,
      maintenance: monitors.filter((m) => m.status === 'maintenance').length,
    }),
    [monitors]
  );

  const headerActions = [
    {
      label: t('ehs.environment_page.add'),
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'success' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <Activity sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
      maxWidth='xl'
    >
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
                  监测点总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.total}
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
                  正常运行
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.active}
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
                  维护中
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.maintenance}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <ListPageTemplate<EnvironmentMonitor>
        title={t('ehs.environment_page.list')}
        columns={columns}
        data={filteredMonitors}
        loading={loading}
        searchable
        searchPlaceholder={t('ehs.environment_page.search')}
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        onRefresh={() => monitorsQuery.refetch()}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增环境监测点</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('ehs.environment_page.name_1')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('ehs.environment_page.please_input')}
            />
            <FormControl fullWidth>
              <InputLabel>监测类型 *</InputLabel>
              <Select
                value={formData.monitor_type}
                label={t('ehs.environment_page.type_1')}
                onChange={(e) => setFormData({ ...formData, monitor_type: e.target.value })}
              >
                <MenuItem value={t('ehs.environment_page.text_319faa')}>水质监测</MenuItem>
                <MenuItem value={t('ehs.environment_page.text_939a2d')}>空气质量</MenuItem>
                <MenuItem value={t('ehs.environment_page.text_c63ace')}>噪声监测</MenuItem>
                <MenuItem value={t('ehs.environment_page.text_5a5df7')}>土壤监测</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('ehs.environment_page.text_d4d2a6')}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('ehs.environment_page.please_input_1')}
            />
            <TextField
              fullWidth
              label={t('ehs.environment_page.text_bbe6ff')}
              value={formData.monitor_frequency}
              onChange={(e) => setFormData({ ...formData, monitor_frequency: e.target.value })}
              placeholder={t('ehs.environment_page.text_7a3f38')}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label={t('ehs.environment_page.standard_value')}
                value={formData.standard_value}
                onChange={(e) => setFormData({ ...formData, standard_value: e.target.value })}
                placeholder={t('ehs.environment_page.standard_value')}
              />
              <TextField
                fullWidth
                label={t('ehs.environment_page.unit')}
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder={t('ehs.environment_page.unit')}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label={t('ehs.environment_page.text_b399a0')}
                type='number'
                value={formData.warning_threshold}
                onChange={(e) => setFormData({ ...formData, warning_threshold: e.target.value })}
                placeholder={t('ehs.environment_page.text_b399a0')}
              />
              <TextField
                fullWidth
                label={t('ehs.environment_page.text_32d6d6')}
                type='number'
                value={formData.alarm_threshold}
                onChange={(e) => setFormData({ ...formData, alarm_threshold: e.target.value })}
                placeholder={t('ehs.environment_page.text_32d6d6')}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label={t('ehs.environment_page.status')}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as typeof formData.status })
                }
              >
                <MenuItem value='active'>正常</MenuItem>
                <MenuItem value='inactive'>停用</MenuItem>
                <MenuItem value='maintenance'>维护中</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('ehs.environment_page.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('ehs.environment_page.please_input_2')}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: 'success.dark' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>环境监测点详情</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 3,
                  borderColor: 'success.main',
                  borderTopColor: 'success.dark',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  mx: 'auto',
                  mb: 2,
                }}
              />
              <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
            </Box>
          ) : (
            monitorDetail && (
              <Box
                sx={{
                  pt: 2,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    监测点编号
                  </Box>
                  <Box sx={{ fontWeight: 500 }}>{monitorDetail.monitor_no || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    监测点名称
                  </Box>
                  <Box>{monitorDetail.name}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    监测类型
                  </Box>
                  <Box>{monitorDetail.monitor_type}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    状态
                  </Box>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(monitorDetail.status)}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    位置
                  </Box>
                  <Box>{monitorDetail.location || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    监测频率
                  </Box>
                  <Box>{monitorDetail.monitor_frequency || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    标准值
                  </Box>
                  <Box>
                    {monitorDetail.standard_value || '-'} {monitorDetail.unit || ''}
                  </Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    预警阈值
                  </Box>
                  <Box>{monitorDetail.warning_threshold ?? '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    报警阈值
                  </Box>
                  <Box>{monitorDetail.alarm_threshold ?? '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    描述
                  </Box>
                  <Box>{monitorDetail.description || '-'}</Box>
                </Box>
              </Box>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EnvironmentPage;
