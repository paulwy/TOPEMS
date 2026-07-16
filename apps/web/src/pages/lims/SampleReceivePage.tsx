import React, { useState } from 'react';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  TestTube,
  Plus,
  Edit,
  Eye,
  Download,
  Upload,
  Filter,
  Trash2,
  CheckCircle,
  Clock,
  Package,
} from 'lucide-react';
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
  MenuItem,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { limsApi } from '@/api/lims';
import type { Sample, CreateSampleRequest, UpdateSampleRequest, LifecycleEvent } from '@/api/lims';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

const ct = designTokens.colors;

interface LimsListResponse<T> {
  items?: T[];
  samples?: T[];
}

const SampleReceivePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [formData, setFormData] = useState<CreateSampleRequest>({
    name: '',
    description: '',
    status: '待登记',
    sample_type: '',
    source: '',
    quantity: undefined,
    unit: '',
    storage_condition: '',
    location: '',
    responsible_person: '',
    received_date: new Date().toISOString().split('T')[0],
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isEditing, setIsEditing] = useState(false);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: samplesData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.LIMS.SAMPLES,
    queryFn: async () => {
      const response = await limsApi.listSamples();
      if (response.success && response.data) {
        const data = response.data as LimsListResponse<Sample> | Sample[];
        if (Array.isArray(data)) return data;
        if (data.items && Array.isArray(data.items)) return data.items;
        if (data.samples && Array.isArray(data.samples)) return data.samples;
      }
      return [];
    },
  });

  const samples = samplesData || [];

  const { data: lifecycleData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.SAMPLE_LIFECYCLE(selectedSample?.id || ''),
    queryFn: async () => {
      if (!selectedSample) return [];
      const response = await limsApi.getSampleLifecycle(selectedSample.id);
      if (response.success && response.data) {
        return response.data as LifecycleEvent[];
      }
      return [];
    },
    enabled: !!selectedSample && showDetailModal,
  });

  const lifecycleEvents: Record<string, LifecycleEvent[]> =
    selectedSample && lifecycleData ? { [selectedSample.id]: lifecycleData } : {};

  const createMutation = useMutation({
    mutationFn: async (data: CreateSampleRequest) => {
      const response = await limsApi.createSample(data);
      if (!response.success) {
        throw new Error(response.message || '登记失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.SAMPLES });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      logger.error('登记样品失败:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSampleRequest }) => {
      const response = await limsApi.updateSample(id, data);
      if (!response.success) {
        throw new Error(response.message || '更新失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.SAMPLES });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      logger.error('更新样品失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await limsApi.deleteSample(id);
      if (!response.success) {
        throw new Error(response.message || '删除失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.SAMPLES });
      setShowDetailModal(false);
    },
    onError: (error: unknown) => {
      logger.error('删除样品失败:', error);
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { sample_id: string; target_stage: string; operator: string; remarks: string };
    }) => {
      const response = await limsApi.transitionSampleStage(id, data);
      if (!response.success) {
        throw new Error(response.message || '状态变更失败');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.SAMPLES });
    },
    onError: (error: unknown) => {
      logger.error('样品状态变更失败:', error);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待登记: { bg: 'grey.100', color: 'text.secondary' },
      待接收: { bg: 'warning.light', color: 'warning.dark' },
      已接收: { bg: 'primary.light', color: 'primary.dark' },
      待确认: { bg: 'secondary.light', color: 'secondary.dark' },
      已确认: { bg: 'success.lighter', color: 'success.dark' },
      检测中: { bg: 'primary.light', color: 'primary.dark' },
      已完成: { bg: 'success.lighter', color: 'success.dark' },
      pending: { bg: 'grey.100', color: 'text.secondary' },
      received: { bg: 'warning.light', color: 'warning.dark' },
      confirmed: { bg: 'success.lighter', color: 'success.dark' },
      in_progress: { bg: 'primary.light', color: 'primary.dark' },
      completed: { bg: 'success.lighter', color: 'success.dark' },
      cancelled: { bg: 'error.lighter', color: 'error.dark' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getStageStep = (status: string): number => {
    const stageMap: Record<string, number> = {
      待登记: 0,
      待接收: 1,
      已接收: 2,
      待确认: 3,
      已确认: 4,
      检测中: 4,
      已完成: 5,
      pending: 0,
      received: 1,
      confirmed: 3,
      in_progress: 4,
      completed: 5,
    };
    return stageMap[status] ?? 0;
  };

  const handleReceive = async (sample: Sample) => {
    await transitionMutation.mutateAsync({
      id: sample.id,
      data: {
        sample_id: sample.id,
        target_stage: '已接收',
        operator: formData.responsible_person || '系统用户',
        remarks: '样本已接收',
      },
    });
  };

  const handleConfirm = async (sample: Sample) => {
    await transitionMutation.mutateAsync({
      id: sample.id,
      data: {
        sample_id: sample.id,
        target_stage: '已确认',
        operator: formData.responsible_person || '系统用户',
        remarks: '样本已确认',
      },
    });
  };

  const columns: ColumnDef<Sample>[] = [
    { id: 'sample_no', label: '样品编号' },
    { id: 'name', label: '样品名称' },
    {
      id: 'description',
      label: '检测项目',
      render: (row) => row.description || '-',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'received_date',
      label: '接收日期',
      render: (row) =>
        row.received_date ? new Date(row.received_date).toLocaleDateString('zh-CN') : '-',
    },
    {
      id: 'location',
      label: '存放位置',
      render: (row) => row.location || '-',
    },
  ];

  const rowActions: RowAction<Sample>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => {
        setSelectedSample(row);
        setShowDetailModal(true);
      },
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleEdit(row),
    },
    {
      label: '接收',
      icon: <Package style={{ width: 16, height: 16 }} />,
      color: 'warning',
      show: (row) => row.status === '待接收' || row.status === 'received',
      onClick: (row) => handleReceive(row),
    },
    {
      label: '确认',
      icon: <CheckCircle style={{ width: 16, height: 16 }} />,
      color: 'success',
      show: (row) => row.status === '已接收' || row.status === 'confirmed',
      onClick: (row) => handleConfirm(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '待登记', value: '待登记' },
        { label: '待接收', value: '待接收' },
        { label: '已接收', value: '已接收' },
        { label: '待确认', value: '待确认' },
        { label: '已确认', value: '已确认' },
        { label: '已完成', value: '已完成' },
      ],
      value: statusFilter,
      onChange: (value: unknown) => setStatusFilter(value as string),
    },
  ];

  const filteredSamples = samples.filter((sample) => {
    const matchesSearch =
      sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sample.sample_no || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedData = filteredSamples.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (sample: Sample) => {
    setSelectedSample(sample);
    setShowDetailModal(true);
  };

  const handleEdit = (sample: Sample) => {
    setSelectedSample(sample);
    setIsEditing(true);
    setFormData({
      name: sample.name,
      description: sample.description || '',
      status: sample.status,
      sample_type: sample.sample_type || '',
      source: sample.source || '',
      quantity: sample.quantity,
      unit: sample.unit || '',
      storage_condition: sample.storage_condition || '',
      location: sample.location || '',
      responsible_person: sample.responsible_person || '',
      received_date: sample.received_date
        ? new Date(sample.received_date).toISOString().split('T')[0]
        : '',
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedSample(null);
    setIsEditing(false);
    setFormData({
      name: '',
      description: '',
      status: '待登记',
      sample_type: '',
      source: '',
      quantity: undefined,
      unit: '',
      storage_condition: '',
      location: '',
      responsible_person: '',
      received_date: new Date().toISOString().split('T')[0],
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addNotification({
        title: '错误',
        message: '请输入样品名称',
        type: 'error',
      });
      return;
    }

    if (isEditing && selectedSample) {
      await updateMutation.mutateAsync({
        id: selectedSample.id,
        data: formData as UpdateSampleRequest,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const saving =
    createMutation.isPending || updateMutation.isPending || transitionMutation.isPending;

  const handleDelete = async (sample: Sample) => {
    if (!confirm(`确定要删除样品 "${sample.name}" 吗？`)) return;
    await deleteMutation.mutateAsync(sample.id);
  };

  const stats = {
    total: samples.length,
    pending: samples.filter((s) => ['待登记', '待接收'].includes(s.status)).length,
    received: samples.filter((s) => ['已接收', '待确认'].includes(s.status)).length,
    confirmed: samples.filter((s) => ['已确认', '检测中', '已完成'].includes(s.status)).length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: 'success.light' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'grey.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TestTube sx={{ width: 20, height: 20, color: 'text.secondary' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                样品总数
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
                bgcolor: 'warning.light',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                待处理
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.pending}
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
              <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已确认
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.confirmed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const workflowSteps = ['待登记', '待接收', '已接收', '待确认', '已确认'];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.teal[50]} 0%, ${ct.background.default} 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'info.main',
              borderTopColor: 'primary.main',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title='样本接收'
      subtitle='Sample Receive Management'
      headerProps={{
        pageIcon: <TestTube style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS' },
          { label: '样本接收' },
        ]}
        backButton={{ onClick: () => navigate(DASHBOARD_PATHS.dashboard) }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索样品编号或名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredSamples.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '导入',
            icon: <Upload style={{ width: 18, height: 18 }} />,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download style={{ width: 18, height: 18 }} />,
            variant: 'outlined',
          },
          {
            label: '样本登记',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑样品' : '样本登记'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='样品名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入样品名称'
            />
            <TextField
              fullWidth
              label='检测项目'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入检测项目，多个用逗号分隔'
              multiline
              rows={2}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                select
                label='状态'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value='待登记'>待登记</MenuItem>
                <MenuItem value='待接收'>待接收</MenuItem>
                <MenuItem value='已接收'>已接收</MenuItem>
                <MenuItem value='待确认'>待确认</MenuItem>
                <MenuItem value='已确认'>已确认</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label='样品类型'
                value={formData.sample_type}
                onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                placeholder='请输入样品类型'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='来源'
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder='请输入样品来源'
              />
              <TextField
                fullWidth
                label='接收日期'
                type='date'
                value={formData.received_date}
                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='数量'
                type='number'
                value={formData.quantity ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder='请输入数量'
              />
              <TextField
                fullWidth
                label='单位'
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder='请输入单位'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='存放位置'
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder='请输入存放位置'
              />
              <TextField
                fullWidth
                label='负责人'
                value={formData.responsible_person}
                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                placeholder='请输入负责人'
              />
            </Box>
            <TextField
              fullWidth
              label='储存条件'
              value={formData.storage_condition}
              onChange={(e) => setFormData({ ...formData, storage_condition: e.target.value })}
              placeholder='请输入储存条件'
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
            disabled={saving}
            sx={{ bgcolor: 'info.main' }}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>样本详情</DialogTitle>
        <DialogContent>
          {selectedSample && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  工作流程
                </Typography>
                <Stepper
                  activeStep={getStageStep(selectedSample.status)}
                  alternativeLabel
                >
                  {workflowSteps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    样品编号
                  </Box>
                  <Box sx={{ fontWeight: 500 }}>
                    {selectedSample.sample_no || selectedSample.id}
                  </Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    样品名称
                  </Box>
                  <Box sx={{ fontWeight: 500 }}>{selectedSample.name}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    检测项目
                  </Box>
                  <Box>{selectedSample.description || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    状态
                  </Box>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedSample.status)}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    接收日期
                  </Box>
                  <Box>
                    {selectedSample.received_date
                      ? new Date(selectedSample.received_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    样品类型
                  </Box>
                  <Box>{selectedSample.sample_type || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    来源
                  </Box>
                  <Box>{selectedSample.source || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    数量
                  </Box>
                  <Box>
                    {selectedSample.quantity !== undefined
                      ? `${selectedSample.quantity} ${selectedSample.unit || ''}`
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    存放位置
                  </Box>
                  <Box>{selectedSample.location || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    负责人
                  </Box>
                  <Box>{selectedSample.responsible_person || '-'}</Box>
                </Box>
              </Box>

              {lifecycleEvents[selectedSample.id] &&
                lifecycleEvents[selectedSample.id].length > 0 && (
                  <Box>
                    <Typography
                      variant='subtitle2'
                      sx={{ mb: 2, fontWeight: 600 }}
                    >
                      生命周期记录
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      {lifecycleEvents[selectedSample.id].map((event, index) => (
                        <Box
                          key={event.id}
                          sx={{ mb: 2 }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                              }}
                            />
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {event.stage_name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {new Date(event.occurred_at).toLocaleString('zh-CN')}
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 3 }}>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              {event.description || event.event_type}
                              {event.operator && ` - 操作人: ${event.operator}`}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            color='error'
            startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
            onClick={() => selectedSample && handleDelete(selectedSample)}
          >
            删除
          </Button>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedSample) {
                handleEdit(selectedSample);
              }
            }}
            sx={{ bgcolor: 'info.main' }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default SampleReceivePage;
