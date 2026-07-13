import React, { useState, useMemo } from 'react';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Plus, Edit, Eye, Download, Upload, Filter, Trash2 } from 'lucide-react';
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
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { limsApi } from '@/api/lims';
import type { Sample, CreateSampleRequest, UpdateSampleRequest } from '@/api/lims';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useCrudOperations } from '@/hooks/useCrudQueries';

const ct = designTokens.colors;

const sampleCrudApi = {
  list: (params?: Record<string, unknown>) => limsApi.listSamples(params as any),
  get: (id: string) => limsApi.getSample(id),
  create: (data: CreateSampleRequest) => limsApi.createSample(data),
  update: (id: string, data: UpdateSampleRequest) => limsApi.updateSample(id, data),
  delete: (id: string) => limsApi.deleteSample(id),
} as any;

const LimsSamplePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [formData, setFormData] = useState<CreateSampleRequest>({
    name: '',
    description: '',
    status: '待接收',
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

  const {
    data: samples,
    loading,
    refresh,
    create: createSample,
    update: updateSample,
    delete: deleteSample,
  } = useCrudOperations<Sample, CreateSampleRequest, UpdateSampleRequest>({
    api: sampleCrudApi,
    queryKey: 'lims-samples',
    defaultPageSize: 100,
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待接收: { bg: 'grey.100', color: 'text.secondary' },
      待检测: { bg: 'warning.100', color: ct.yellow[600] },
      检测中: { bg: 'primary.100', color: 'primary.dark' },
      已完成: { bg: 'success.lighter', color: 'success.dark' },
      pending: { bg: 'grey.100', color: 'text.secondary' },
      in_progress: { bg: 'primary.100', color: 'primary.dark' },
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

  const getTestItems = (sample: Sample): string => {
    return sample.description || '-';
  };

  const getTestResult = (sample: Sample): string => {
    if (sample.status === '已完成' || sample.status === 'completed') {
      return '已完成';
    }
    return '-';
  };

  const columns: ColumnDef<Sample>[] = [
    { id: 'sample_no', label: '样品编号' },
    { id: 'name', label: '样品名称' },
    {
      id: 'description',
      label: '检测项目',
      render: (row) => getTestItems(row),
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
      id: 'test_result',
      label: '检测结果',
      render: (row) => getTestResult(row),
    },
  ];

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
      status: '待接收',
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
      await updateSample(selectedSample.id, formData as UpdateSampleRequest);
      setShowCreateModal(false);
    } else {
      await createSample(formData);
      setShowCreateModal(false);
    }
  };

  const handleDelete = async (sample: Sample) => {
    if (!confirm(`确定要删除样品 "${sample.name}" 吗？`)) return;
    await deleteSample(sample.id);
    setShowDetailModal(false);
  };

  const rowActions: RowAction<Sample>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleEdit(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '待接收', value: '待接收' },
        { label: '待检测', value: '待检测' },
        { label: '检测中', value: '检测中' },
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

  const stats = {
    total: samples.length,
    pending: samples.filter(
      (s) => s.status === '待接收' || s.status === '待检测' || s.status === 'pending'
    ).length,
    inProgress: samples.filter((s) => s.status === '检测中' || s.status === 'in_progress').length,
    completed: samples.filter((s) => s.status === '已完成' || s.status === 'completed').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: 'teal.light' }}>
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
              <FlaskConical sx={{ width: 20, height: 20, color: 'info.main' }} />
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
              <Filter sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
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
                bgcolor: 'primary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlaskConical sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                检测中
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.inProgress}
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
              <FlaskConical sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已完成
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='样品管理'
      subtitle='Sample Management'
      headerProps={{
        pageIcon: <FlaskConical style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS' },
          { label: '样品管理' },
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
            label: '样品登记',
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
        <DialogTitle>{isEditing ? '编辑样品' : '样品登记'}</DialogTitle>
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
                <MenuItem value='待接收'>待接收</MenuItem>
                <MenuItem value='待检测'>待检测</MenuItem>
                <MenuItem value='检测中'>检测中</MenuItem>
                <MenuItem value='已完成'>已完成</MenuItem>
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
                slotProps={{ inputLabel: { shrink: true } } as any}
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
            disabled={loading}
            sx={{ bgcolor: 'info.main' }}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>样品详情</DialogTitle>
        <DialogContent>
          {selectedSample && (
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
                  样品编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedSample.sample_no || selectedSample.id}</Box>
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
                <Box>{getTestItems(selectedSample)}</Box>
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
                  检测结果
                </Box>
                <Box>{getTestResult(selectedSample)}</Box>
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
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  储存条件
                </Box>
                <Box>{selectedSample.storage_condition || '-'}</Box>
              </Box>
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

export default LimsSamplePage;
