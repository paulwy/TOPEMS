import React, { useState, useEffect, useCallback } from 'react';
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
import type { Reagent, CreateReagentRequest, UpdateReagentRequest } from '@/api/lims';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

const ReagentPage: React.FC = () => {
  const navigate = useNavigate();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null);
  const [formData, setFormData] = useState<CreateReagentRequest>({
    name: '',
    code: '',
    category: '',
    specification: '',
    batch_no: '',
    manufacturer: '',
    supplier: '',
    cas_no: '',
    molecular_formula: '',
    purity: '',
    quantity: 0,
    unit: '',
    min_stock: undefined,
    storage_condition: '',
    hazardlevel: '',
    received_date: '',
    expiry_date: '',
    status: '正常',
    responsible_person: '',
    location: '',
    description: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const addNotification = useAppStore((state) => state.addNotification);

  const loadReagents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await limsApi.listReagents();
      if (response.success && response.data) {
        const data = response.data as any;
        let rawReagents: Reagent[] = [];
        if (Array.isArray(data)) {
          rawReagents = data;
        } else if (data.items && Array.isArray(data.items)) {
          rawReagents = data.items;
        }
        setReagents(rawReagents);
      } else {
        setReagents([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载试剂列表失败:', err);
      setReagents([]);
      addNotification({
        title: '错误',
        message: '加载试剂列表失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadReagents();
  }, [loadReagents]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      正常: { bg: 'success.lighter', color: 'success.dark' },
      库存不足: { bg: 'error.lighter', color: 'error.dark' },
      已过期: { bg: 'warning.lighter', color: 'warning.dark' },
      停用: { bg: 'grey.100', color: 'text.secondary' },
      normal: { bg: 'success.lighter', color: 'success.dark' },
      low_stock: { bg: 'error.lighter', color: 'error.dark' },
      expired: { bg: 'warning.lighter', color: 'warning.dark' },
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
    return reagent.min_stock !== undefined && reagent.quantity < reagent.min_stock;
  };

  const isExpired = (reagent: Reagent): boolean => {
    if (!reagent.expiry_date) return false;
    return new Date(reagent.expiry_date) < new Date();
  };

  const columns: ColumnDef<Reagent>[] = [
    { id: 'code', label: '试剂编号' },
    { id: 'name', label: '试剂名称' },
    { id: 'category', label: '分类' },
    {
      id: 'quantity',
      label: '库存',
      render: (row) => `${row.quantity} ${row.unit || ''}`,
    },
    {
      id: 'expiry_date',
      label: '有效期',
      render: (row) =>
        row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('zh-CN') : '-',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => {
        if (isExpired(row)) return getStatusBadge('已过期');
        if (isLowStock(row)) return getStatusBadge('库存不足');
        return getStatusBadge(row.status || '正常');
      },
    },
    {
      id: 'warning',
      label: '',
      render: (row) => {
        if (isExpired(row) || isLowStock(row)) {
          return <AlertTriangle style={{ width: 16, height: 16, color: '#ca8a04' }} />;
        }
        return null;
      },
    },
  ];

  const rowActions: RowAction<Reagent>[] = [
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
        { label: '正常', value: '正常' },
        { label: '库存不足', value: '库存不足' },
        { label: '已过期', value: '已过期' },
        { label: '停用', value: '停用' },
      ],
      value: statusFilter,
      onChange: (value) => setStatusFilter(value),
    },
  ];

  const filteredReagents = reagents.filter((reagent) => {
    const matchesSearch =
      reagent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reagent.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = statusFilter === 'all';
    if (statusFilter === '库存不足') matchesStatus = isLowStock(reagent);
    else if (statusFilter === '已过期') matchesStatus = isExpired(reagent);
    else if (statusFilter === '正常')
      matchesStatus =
        !isLowStock(reagent) &&
        !isExpired(reagent) &&
        (reagent.status === '正常' || reagent.status === 'normal');
    else if (statusFilter === '停用')
      matchesStatus = reagent.status === '停用' || reagent.status === 'disabled';
    return matchesSearch && matchesStatus;
  });

  const paginatedData = filteredReagents.slice(page * pageSize, page * pageSize + pageSize);

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
      specification: reagent.specification || '',
      batch_no: reagent.batch_no || '',
      manufacturer: reagent.manufacturer || '',
      supplier: reagent.supplier || '',
      cas_no: reagent.cas_no || '',
      molecular_formula: reagent.molecular_formula || '',
      purity: reagent.purity || '',
      quantity: reagent.quantity,
      unit: reagent.unit || '',
      min_stock: reagent.min_stock,
      storage_condition: reagent.storage_condition || '',
      hazardlevel: reagent.hazardlevel || '',
      received_date: reagent.received_date || '',
      expiry_date: reagent.expiry_date || '',
      status: reagent.status,
      responsible_person: reagent.responsible_person || '',
      location: reagent.location || '',
      description: reagent.description || '',
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
      specification: '',
      batch_no: '',
      manufacturer: '',
      supplier: '',
      cas_no: '',
      molecular_formula: '',
      purity: '',
      quantity: 0,
      unit: '',
      min_stock: undefined,
      storage_condition: '',
      hazardlevel: '',
      received_date: '',
      expiry_date: '',
      status: '正常',
      responsible_person: '',
      location: '',
      description: '',
    });
    setShowCreateModal(true);
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

    try {
      setSaving(true);
      if (isEditing && selectedReagent) {
        const response = await limsApi.updateReagent(
          selectedReagent.id,
          formData as UpdateReagentRequest
        );
        if (response.success) {
          addNotification({
            title: '成功',
            message: '试剂更新成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadReagents();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '更新失败，请稍后重试',
            type: 'error',
          });
        }
      } else {
        const response = await limsApi.createReagent(formData);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '试剂创建成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadReagents();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '创建失败，请稍后重试',
            type: 'error',
          });
        }
      }
    } catch (err: unknown) {
      apiLogger.error('保存试剂失败:', err);
      addNotification({
        title: '错误',
        message: isEditing ? '更新试剂失败，请稍后重试' : '创建试剂失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reagent: Reagent) => {
    if (!confirm(`确定要删除试剂 "${reagent.name}" 吗？`)) return;
    try {
      const response = await limsApi.deleteReagent(reagent.id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '试剂删除成功',
          type: 'success',
        });
        setShowDetailModal(false);
        loadReagents();
      } else {
        addNotification({
          title: '错误',
          message: response.message || '删除失败，请稍后重试',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('删除试剂失败:', err);
      addNotification({
        title: '错误',
        message: '删除试剂失败，请稍后重试',
        type: 'error',
      });
    }
  };

  const stats = {
    total: reagents.length,
    normal: reagents.filter(
      (r) => !isLowStock(r) && !isExpired(r) && (r.status === '正常' || r.status === 'normal')
    ).length,
    lowStock: reagents.filter((r) => isLowStock(r)).length,
    expired: reagents.filter((r) => isExpired(r)).length,
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
      <Card sx={{ bgcolor: '#f0fdfa' }}>
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
                库存不足
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
                bgcolor: 'warning.light',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Filter sx={{ width: 20, height: 20, color: '#ca8a04' }} />
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
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'info.main',
              borderTopColor: '#0891b2',
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
      title='试剂管理'
      subtitle='Reagent Management'
      headerProps={{
        pageIcon: <FlaskConical style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS' },
          { label: '试剂管理' },
        ]}
        backButton={{ onClick: () => navigate('/dashboard') }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索试剂编号或名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredReagents.length,
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
                label='分类'
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder='请输入分类'
              />
              <TextField
                fullWidth
                label='规格'
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder='请输入规格'
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
                label='CAS号'
                value={formData.cas_no}
                onChange={(e) => setFormData({ ...formData, cas_no: e.target.value })}
                placeholder='请输入CAS号'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='生产厂家'
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder='请输入生产厂家'
              />
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
                label='分子式'
                value={formData.molecular_formula}
                onChange={(e) => setFormData({ ...formData, molecular_formula: e.target.value })}
                placeholder='请输入分子式'
              />
              <TextField
                fullWidth
                label='纯度'
                value={formData.purity}
                onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                placeholder='请输入纯度'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='库存数量 *'
                type='number'
                value={formData.quantity ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: e.target.value ? Number(e.target.value) : 0,
                  })
                }
                placeholder='请输入库存数量'
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
                label='最低库存'
                type='number'
                value={formData.min_stock ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_stock: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder='请输入最低库存'
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
                label='接收日期'
                type='date'
                value={formData.received_date}
                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                label='有效期至'
                type='date'
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='储存条件'
                value={formData.storage_condition}
                onChange={(e) => setFormData({ ...formData, storage_condition: e.target.value })}
                placeholder='请输入储存条件'
              />
              <TextField
                fullWidth
                label='危害等级'
                value={formData.hazardlevel}
                onChange={(e) => setFormData({ ...formData, hazardlevel: e.target.value })}
                placeholder='请输入危害等级'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='负责人'
                value={formData.responsible_person}
                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                placeholder='请输入负责人'
              />
              <TextField
                fullWidth
                select
                label='状态'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value='正常'>正常</MenuItem>
                <MenuItem value='停用'>停用</MenuItem>
              </TextField>
            </Box>
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
                  分类
                </Box>
                <Box>{selectedReagent.category || '-'}</Box>
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
                  批号
                </Box>
                <Box>{selectedReagent.batch_no || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  CAS号
                </Box>
                <Box>{selectedReagent.cas_no || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  生产厂家
                </Box>
                <Box>{selectedReagent.manufacturer || '-'}</Box>
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
                  库存数量
                </Box>
                <Box sx={{ fontWeight: 500 }}>
                  {selectedReagent.quantity} {selectedReagent.unit || ''}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  最低库存
                </Box>
                <Box>
                  {selectedReagent.min_stock !== undefined ? selectedReagent.min_stock : '-'}
                </Box>
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
                  有效期至
                </Box>
                <Box>
                  {selectedReagent.expiry_date
                    ? new Date(selectedReagent.expiry_date).toLocaleDateString('zh-CN')
                    : '-'}
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
                  危害等级
                </Box>
                <Box>{selectedReagent.hazardlevel || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  负责人
                </Box>
                <Box>{selectedReagent.responsible_person || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(
                    isExpired(selectedReagent)
                      ? '已过期'
                      : isLowStock(selectedReagent)
                        ? '库存不足'
                        : selectedReagent.status || '正常'
                  )}
                </Box>
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
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedReagent) {
                handleEdit(selectedReagent);
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

export default ReagentPage;
