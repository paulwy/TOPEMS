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

const ct = designTokens.colors;

const EnvironmentPage: React.FC = () => {
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
                  ? '维护中'
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
      active: '正常',
      inactive: '停用',
      maintenance: '维护中',
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
        label: '监测点编号',
        render: (row) => row.monitor_no || '-',
      },
      {
        id: 'name',
        label: '监测点名称',
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
        label: '监测类型',
        render: (row) => row.monitor_type || '-',
      },
      {
        id: 'location',
        label: '位置',
        render: (row) => row.location || '-',
      },
      {
        id: 'status',
        label: '状态',
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
        label: '详情',
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
        label: '监测类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: '水质', label: '水质监测' },
          { value: '空气质量', label: '空气质量' },
          { value: '噪声', label: '噪声监测' },
          { value: '土壤', label: '土壤监测' },
        ],
        value: typeFilter,
        onChange: (value) => setTypeFilter(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'active', label: '正常' },
          { value: 'inactive', label: '停用' },
          { value: 'maintenance', label: '维护中' },
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
      addNotification({ title: '成功', message: '环境监测点创建成功', type: 'success' });
      setShowCreateModal(false);
    },
    onError: (err) => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建环境监测点失败:', err);
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
      label: '新增监测点',
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
        title='环境监测点列表'
        columns={columns}
        data={filteredMonitors}
        loading={loading}
        searchable
        searchPlaceholder='搜索监测点名称或编号...'
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
              label='监测点名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入监测点名称'
            />
            <FormControl fullWidth>
              <InputLabel>监测类型 *</InputLabel>
              <Select
                value={formData.monitor_type}
                label='监测类型 *'
                onChange={(e) => setFormData({ ...formData, monitor_type: e.target.value })}
              >
                <MenuItem value='水质'>水质监测</MenuItem>
                <MenuItem value='空气质量'>空气质量</MenuItem>
                <MenuItem value='噪声'>噪声监测</MenuItem>
                <MenuItem value='土壤'>土壤监测</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label='位置'
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder='请输入位置'
            />
            <TextField
              fullWidth
              label='监测频率'
              value={formData.monitor_frequency}
              onChange={(e) => setFormData({ ...formData, monitor_frequency: e.target.value })}
              placeholder='如：每日一次'
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label='标准值'
                value={formData.standard_value}
                onChange={(e) => setFormData({ ...formData, standard_value: e.target.value })}
                placeholder='标准值'
              />
              <TextField
                fullWidth
                label='单位'
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder='单位'
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label='预警阈值'
                type='number'
                value={formData.warning_threshold}
                onChange={(e) => setFormData({ ...formData, warning_threshold: e.target.value })}
                placeholder='预警阈值'
              />
              <TextField
                fullWidth
                label='报警阈值'
                type='number'
                value={formData.alarm_threshold}
                onChange={(e) => setFormData({ ...formData, alarm_threshold: e.target.value })}
                placeholder='报警阈值'
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label='状态'
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
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入描述'
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
