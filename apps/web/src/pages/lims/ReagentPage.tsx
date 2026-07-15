import React, { useState, useMemo } from 'react';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Plus,
  Edit,
  Eye,
  Download,
  Upload,
  Filter,
  Trash2,
  AlertTriangle,
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
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { limsApi } from '@/api/lims';
import type { Reagent, CreateReagentRequest } from '@/api/lims';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const ReagentPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CreateReagentRequest>({
    name: '',
    code: '',
    category: '',
    supplier: '',
    specification: '',
    unit: '',
    quantity: 0,
    min_stock: 10,
    batch_no: '',
    received_date: '',
    expiry_date: '',
    storage_condition: '',
    location: '',
    status: '正常',
  });

  const queryKey = [
    QUERY_KEYS.LIMS.REAGENTS,
    currentPage,
    pageSize,
    searchTerm,
    statusFilter,
    categoryFilter,
  ];

  const { data: reagentsResponse, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: {
        page: number;
        pagesize: number;
        search?: string;
        status?: string;
        category?: string;
      } = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const response = await limsApi.listReagents(params);
      if (!response.success) {
        throw new Error('Failed to fetch reagents');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const reagents = reagentsResponse?.items || [];
  const total = reagentsResponse?.total || reagents.length;

  const createMutation = useMutation({
    mutationFn: async (data: CreateReagentRequest) => {
      const response = await limsApi.createReagent(data);
      if (!response.success) {
        throw new Error('Failed to create reagent');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.REAGENTS });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('创建失败:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateReagentRequest> }) => {
      const response = await limsApi.updateReagent(id, data);
      if (!response.success) {
        throw new Error('Failed to update reagent');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.REAGENTS });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('更新失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await limsApi.deleteReagent(id);
      if (!response.success) {
        throw new Error('Failed to delete reagent');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.REAGENTS });
    },
    onError: (error) => {
      apiLogger.error('删除失败:', error);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      正常: { bg: 'success.lighter', color: 'success.dark' },
      低库存: { bg: 'warning.lighter', color: 'warning.dark' },
      过期: { bg: 'error.lighter', color: 'error.dark' },
      停用: { bg: 'grey.100', color: 'text.secondary' },
      normal: { bg: 'success.lighter', color: 'success.dark' },
      low_stock: { bg: 'warning.lighter', color: 'warning.dark' },
      expired: { bg: 'error.lighter', color: 'error.dark' },
      disabled: { bg: 'grey.100', color: 'text.secondary' },
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

  const isLowStock = (reagent: Reagent): boolean => {
    return Number(reagent.quantity) <= Number(reagent.min_stock || 10);
  };

  const isExpired = (reagent: Reagent): boolean => {
    if (!reagent.expiry_date) return false;
    return new Date(reagent.expiry_date) < new Date();
  };

  const getReagentStatus = (reagent: Reagent): string => {
    if (isExpired(reagent)) return '过期';
    if (isLowStock(reagent)) return '低库存';
    return reagent.status || '正常';
  };

  const columns: ColumnDef<Reagent>[] = useMemo(
    () => [
      { id: 'code', label: '试剂编号' },
      { id: 'name', label: '试剂名称' },
      { id: 'category', label: '类别', render: (row) => row.category || '-' },
      { id: 'supplier', label: '供应商', render: (row) => row.supplier || '-' },
      {
        id: 'quantity',
        label: '库存数量',
        render: (row) => {
          const lowStock = isLowStock(row);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {lowStock && (
                <AlertTriangle style={{ width: 14, height: 14, color: ct.yellow[600] }} />
              )}
              <span style={{ color: lowStock ? ct.yellow[600] : 'inherit' }}>
                {row.quantity} {row.unit}
              </span>
            </Box>
          );
        },
      },
      {
        id: 'expiry_date',
        label: '有效期至',
        render: (row) => {
          if (!row.expiry_date) return '-';
          const expired = isExpired(row);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {expired && <AlertTriangle style={{ width: 14, height: 14, color: ct.error[600] }} />}
              <span style={{ color: expired ? ct.error[600] : 'inherit' }}>
                {new Date(row.expiry_date).toLocaleDateString('zh-CN')}
              </span>
            </Box>
          );
        },
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(getReagentStatus(row)),
      },
      { id: 'location', label: '存放位置', render: (row) => row.location || '-' },
    ],
    []
  );

  const rowActions: RowAction<Reagent>[] = useMemo(
    () => [
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
      {
        label: '出入库记录',
        icon: <Package style={{ width: 16, height: 16 }} />,
        onClick: (row) => navigate(`${LIMS_PATHS.reagent}?id=${row.id}`),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '正常', value: '正常' },
          { label: '低库存', value: '低库存' },
          { label: '过期', value: '过期' },
          { label: '停用', value: '停用' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(0);
        },
      },
      {
        id: 'category',
        label: '类别',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '标准品', value: '标准品' },
          { label: '试剂', value: '试剂' },
          { label: '耗材', value: '耗材' },
          { label: '其他', value: '其他' },
        ],
        value: categoryFilter,
        onChange: (value: unknown) => {
          setCategoryFilter(value as string);
          setCurrentPage(0);
        },
      },
    ],
    [statusFilter, categoryFilter]
  );

  const handleView = (reagent: Reagent) => {
    setSelectedReagent(reagent);
    setShowDetailModal(true);
  };

  const handleEdit = (reagent: Reagent) => {
    setSelectedReagent(reagent);
    setIsEditing(true);
    setFormData({
      name: reagent.name,
      code: reagent.code,
      category: reagent.category || '',
      supplier: reagent.supplier || '',
      specification: reagent.specification || '',
      unit: reagent.unit || '',
      quantity: Number(reagent.quantity) || 0,
      min_stock: Number(reagent.min_stock) || 10,
      batch_no: reagent.batch_no || '',
      received_date: reagent.received_date || '',
      expiry_date: reagent.expiry_date || '',
      storage_condition: reagent.storage_condition || '',
      location: reagent.location || '',
      status: reagent.status,
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedReagent(null);
    setIsEditing(false);
    setFormData({
      name: '',
      code: '',
      category: '',
      supplier: '',
      specification: '',
      unit: '',
      quantity: 0,
      min_stock: 10,
      batch_no: '',
      received_date: '',
      expiry_date: '',
      storage_condition: '',
      location: '',
      status: '正常',
      description: '',
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setSelectedReagent(null);
    setIsEditing(false);
    setFormData({
      name: '',
      code: '',
      category: '',
      supplier: '',
      specification: '',
      unit: '',
      quantity: 0,
      min_stock: 10,
      batch_no: '',
      received_date: '',
      expiry_date: '',
      storage_condition: '',
      location: '',
      status: '正常',
      description: '',
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addNotification({
        title: '错误',
        message: '请输入试剂名称',
        type: 'error',
      });
      return;
    }
    if (!formData.code.trim()) {
      addNotification({
        title: '错误',
        message: '请输入试剂编号',
        type: 'error',
      });
      return;
    }

    if (isEditing && selectedReagent) {
      await updateMutation.mutateAsync({ id: selectedReagent.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async (reagent: Reagent) => {
    if (!window.confirm(`确定要删除试剂 "${reagent.name}" 吗？`)) return;
    await deleteMutation.mutateAsync(reagent.id);
    setShowDetailModal(false);
  };

  const stats = useMemo(
    () => ({
      total,
      normal: reagents.filter((r) => {
        const status = getReagentStatus(r);
        return status === '正常' || status === 'normal';
      }).length,
      lowStock: reagents.filter((r) => isLowStock(r)).length,
      expired: reagents.filter((r) => isExpired(r)).length,
      totalQuantity: reagents.reduce((sum, r) => sum + Number(r.quantity || 0), 0),
    }),
    [reagents, total]
  );

  const statsCards = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card sx={{ bgcolor: 'indigo.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FlaskConical sx={{ width: 20, height: 20, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  试剂总数
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
                <FlaskConical sx={{ width: 20, height: 20, color: 'success.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  正常库存
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.normal}
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
                <AlertTriangle sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  低库存
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.lowStock}
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
                  bgcolor: 'error.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle sx={{ width: 20, height: 20, color: 'error.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  已过期
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.expired}
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
                  bgcolor: 'purple.light',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package sx={{ width: 20, height: 20, color: 'purple.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  库存总量
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.totalQuantity}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    ),
    [stats]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(0);
  };

  return (
    <PageContainer
      title='试剂管理'
      subtitle='Reagent Management'
      headerProps={{
        pageIcon: <FlaskConical style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary[400]} 0%, ${ct.primary[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS' },
          { label: '试剂管理' },
        ]}
        backButton={{ onClick: () => navigate(DASHBOARD_PATHS.dashboard) }}
        columns={columns}
        data={reagents}
        loading={isLoading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索试剂编号、名称或供应商...'
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
          onPageSizeChange: () => {},
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
            label: '添加试剂',
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
        <DialogTitle>{isEditing ? '编辑试剂' : '添加试剂'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='试剂名称 *'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='请输入试剂名称'
              />
              <TextField
                fullWidth
                label='试剂编号 *'
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder='请输入试剂编号'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                select
                label='类别'
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <MenuItem value=''>请选择类别</MenuItem>
                <MenuItem value='标准品'>标准品</MenuItem>
                <MenuItem value='试剂'>试剂</MenuItem>
                <MenuItem value='耗材'>耗材</MenuItem>
                <MenuItem value='其他'>其他</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label='供应商'
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder='请输入供应商'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='规格'
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder='请输入规格'
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
                label='库存数量'
                type='number'
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                placeholder='请输入库存数量'
              />
              <TextField
                fullWidth
                label='最低库存'
                type='number'
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                placeholder='请输入最低库存'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='批号'
                value={formData.batch_no}
                onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                placeholder='请输入批号'
              />
              <TextField
                fullWidth
                label='存放位置'
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder='请输入存放位置'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='生产日期'
                type='date'
                value={formData.received_date}
                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                fullWidth
                label='有效期至'
                type='date'
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
            </Box>
            <TextField
              fullWidth
              label='储存条件'
              value={formData.storage_condition}
              onChange={(e) => setFormData({ ...formData, storage_condition: e.target.value })}
              placeholder='请输入储存条件'
            />
            <TextField
              fullWidth
              label='备注'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入备注'
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
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ bgcolor: 'primary.main' }}
          >
            {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>试剂详情</DialogTitle>
        <DialogContent>
          {selectedReagent && (
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
                  试剂编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedReagent.code || selectedReagent.id}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  试剂名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedReagent.name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  类别
                </Box>
                <Box>{selectedReagent.category || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  供应商
                </Box>
                <Box>{selectedReagent.supplier || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  规格
                </Box>
                <Box>{selectedReagent.specification || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  单位
                </Box>
                <Box>{selectedReagent.unit || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  库存数量
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {isLowStock(selectedReagent) && (
                      <AlertTriangle style={{ width: 14, height: 14, color: ct.yellow[600] }} />
                    )}
                    <span
                      style={{
                        color: isLowStock(selectedReagent) ? ct.yellow[600] : 'inherit',
                      }}
                    >
                      {selectedReagent.quantity} {selectedReagent.unit}
                    </span>
                  </Box>
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  最低库存
                </Box>
                <Box>{selectedReagent.min_stock || 10}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  批号
                </Box>
                <Box>{selectedReagent.batch_no || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  存放位置
                </Box>
                <Box>{selectedReagent.location || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  生产日期
                </Box>
                <Box>
                  {selectedReagent.received_date
                    ? new Date(selectedReagent.received_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  有效期至
                </Box>
                <Box>
                  {selectedReagent.expiry_date ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isExpired(selectedReagent) && (
                        <AlertTriangle style={{ width: 14, height: 14, color: ct.error[600] }} />
                      )}
                      <span
                        style={{
                          color: isExpired(selectedReagent) ? ct.error[600] : 'inherit',
                        }}
                      >
                        {new Date(selectedReagent.expiry_date).toLocaleDateString('zh-CN')}
                      </span>
                    </Box>
                  ) : (
                    '-'
                  )}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  储存条件
                </Box>
                <Box>{selectedReagent.storage_condition || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(getReagentStatus(selectedReagent))}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  备注
                </Box>
                <Box>{selectedReagent.description || '-'}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            color='error'
            startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
            onClick={() => selectedReagent && handleDelete(selectedReagent)}
          >
            删除
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedReagent) {
                handleEdit(selectedReagent);
              }
            }}
            sx={{ bgcolor: 'primary.main' }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ReagentPage;
