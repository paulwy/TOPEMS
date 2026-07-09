import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import {
  Microscope,
  Plus,
  Edit,
  Eye,
  Download,
  Upload,
  Filter,
  Trash2,
  AlertTriangle,
  Settings,
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
import type { Instrument, CreateInstrumentRequest } from '@/api/lims';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const InstrumentPage: React.FC = () => {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [formData, setFormData] = useState<CreateInstrumentRequest>({
    name: '',
    code: '',
    type: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    location: '',
    status: '正常',
    purchase_date: '',
    calibration_date: '',
    next_calibration_date: '',
    responsible_person: '',
    description: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const addNotification = useAppStore((state) => state.addNotification);

  const loadInstruments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await limsApi.listInstruments();
      if (response.success && response.data) {
        const data = response.data as any;
        let rawInstruments: Instrument[] = [];
        if (Array.isArray(data)) {
          rawInstruments = data;
        } else if (data.items && Array.isArray(data.items)) {
          rawInstruments = data.items;
        }
        setInstruments(rawInstruments);
      } else {
        setInstruments([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载仪器列表失败:', err);
      setInstruments([]);
      addNotification({
        title: '错误',
        message: '加载仪器列表失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      正常: { bg: 'success.lighter', color: 'success.dark' },
      校准中: { bg: 'info.lighter', color: 'info.dark' },
      维修中: { bg: 'warning.lighter', color: 'warning.dark' },
      停用: { bg: 'grey.100', color: 'text.secondary' },
      normal: { bg: 'success.lighter', color: 'success.dark' },
      calibrating: { bg: 'info.lighter', color: 'info.dark' },
      maintenance: { bg: 'warning.lighter', color: 'warning.dark' },
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

  const needsCalibration = (instrument: Instrument): boolean => {
    if (!instrument.next_calibration_date) return false;
    return new Date(instrument.next_calibration_date) < new Date();
  };

  const columns: ColumnDef<Instrument>[] = [
    { id: 'code', label: '仪器编号' },
    { id: 'name', label: '仪器名称' },
    { id: 'type', label: '类型' },
    { id: 'manufacturer', label: '生产厂家' },
    {
      id: 'location',
      label: '存放位置',
      render: (row) => row.location || '-',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status || '正常'),
    },
    {
      id: 'next_calibration_date',
      label: '下次校准',
      render: (row) => {
        if (!row.next_calibration_date) return '-';
        const needs = needsCalibration(row);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {needs && <AlertTriangle style={{ width: 14, height: 14, color: ct.yellow[600] }} />}
            <span style={{ color: needs ? ct.yellow[600] : 'inherit' }}>
              {new Date(row.next_calibration_date).toLocaleDateString('zh-CN')}
            </span>
          </Box>
        );
      },
    },
  ];

  const rowActions: RowAction<Instrument>[] = [
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
      label: '维护记录',
      icon: <Settings style={{ width: 16, height: 16 }} />,
      onClick: (row) => navigate(`/lims/instrument/${row.id}`),
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
        { label: '校准中', value: '校准中' },
        { label: '维修中', value: '维修中' },
        { label: '停用', value: '停用' },
      ],
      value: statusFilter,
      onChange: (value: unknown) => setStatusFilter(value as string),
    },
  ];

  const filteredInstruments = instruments.filter((instrument) => {
    const matchesSearch =
      instrument.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (instrument.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (instrument.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || instrument.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedData = filteredInstruments.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setShowDetailModal(true);
  };

  const handleEdit = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setIsEditing(true);
    setFormData({
      name: instrument.name,
      code: instrument.code,
      type: instrument.type,
      manufacturer: instrument.manufacturer || '',
      model: instrument.model || '',
      serial_number: instrument.serial_number || '',
      location: instrument.location || '',
      status: instrument.status,
      purchase_date: instrument.purchase_date || '',
      calibration_date: instrument.calibration_date || '',
      next_calibration_date: instrument.next_calibration_date || '',
      responsible_person: instrument.responsible_person || '',
      description: instrument.description || '',
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedInstrument(null);
    setIsEditing(false);
    setFormData({
      name: '',
      code: '',
      type: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      location: '',
      status: '正常',
      purchase_date: '',
      calibration_date: '',
      next_calibration_date: '',
      responsible_person: '',
      description: '',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addNotification({
        title: '错误',
        message: '请输入仪器名称',
        type: 'error',
      });
      return;
    }
    if (!formData.code.trim()) {
      addNotification({
        title: '错误',
        message: '请输入仪器编号',
        type: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      if (isEditing && selectedInstrument) {
        const response = await limsApi.updateInstrument(selectedInstrument.id, formData);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '仪器更新成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadInstruments();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '更新失败，请稍后重试',
            type: 'error',
          });
        }
      } else {
        const response = await limsApi.createInstrument(formData);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '仪器创建成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadInstruments();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '创建失败，请稍后重试',
            type: 'error',
          });
        }
      }
    } catch (err: unknown) {
      apiLogger.error('保存仪器失败:', err);
      addNotification({
        title: '错误',
        message: isEditing ? '更新仪器失败，请稍后重试' : '创建仪器失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (instrument: Instrument) => {
    if (!confirm(`确定要删除仪器 "${instrument.name}" 吗？`)) return;
    try {
      const response = await limsApi.deleteInstrument(instrument.id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '仪器删除成功',
          type: 'success',
        });
        setShowDetailModal(false);
        loadInstruments();
      } else {
        addNotification({
          title: '错误',
          message: response.message || '删除失败，请稍后重试',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('删除仪器失败:', err);
      addNotification({
        title: '错误',
        message: '删除仪器失败，请稍后重试',
        type: 'error',
      });
    }
  };

  const stats = {
    total: instruments.length,
    normal: instruments.filter((i) => i.status === '正常' || i.status === 'normal').length,
    calibrating: instruments.filter((i) => i.status === '校准中' || i.status === 'calibrating')
      .length,
    maintenance: instruments.filter((i) => i.status === '维修中' || i.status === 'maintenance')
      .length,
    needsCalibration: instruments.filter((i) => needsCalibration(i)).length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(5, 1fr)' },
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
              <Microscope sx={{ width: 20, height: 20, color: 'info.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                仪器总数
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
              <Microscope sx={{ width: 20, height: 20, color: 'success.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                正常
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
                bgcolor: 'info.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings sx={{ width: 20, height: 20, color: 'info.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                校准中
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.calibrating}
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
                维修中
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
                待校准
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.needsCalibration}
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
              borderTopColor: 'cyan.dark',
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
      title='仪器管理'
      subtitle='Instrument Management'
      headerProps={{
        pageIcon: <Microscope style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS' },
          { label: '仪器管理' },
        ]}
        backButton={{ onClick: () => navigate('/dashboard') }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索仪器编号、名称或类型...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredInstruments.length,
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
            label: '添加仪器',
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
        <DialogTitle>{isEditing ? '编辑仪器' : '添加仪器'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='仪器名称 *'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='请输入仪器名称'
              />
              <TextField
                fullWidth
                label='仪器编号 *'
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder='请输入仪器编号'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='类型'
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder='请输入仪器类型'
              />
              <TextField
                fullWidth
                label='型号'
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder='请输入型号'
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
                label='序列号'
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder='请输入序列号'
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
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='购买日期'
                type='date'
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                fullWidth
                label='最近校准日期'
                type='date'
                value={formData.calibration_date}
                onChange={(e) => setFormData({ ...formData, calibration_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='下次校准日期'
                type='date'
                value={formData.next_calibration_date}
                onChange={(e) =>
                  setFormData({ ...formData, next_calibration_date: e.target.value })
                }
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                fullWidth
                select
                label='状态'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value='正常'>正常</MenuItem>
                <MenuItem value='校准中'>校准中</MenuItem>
                <MenuItem value='维修中'>维修中</MenuItem>
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
        <DialogTitle>仪器详情</DialogTitle>
        <DialogContent>
          {selectedInstrument && (
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
                  仪器编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>
                  {selectedInstrument.code || selectedInstrument.id}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  仪器名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedInstrument.name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  类型
                </Box>
                <Box>{selectedInstrument.type || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  型号
                </Box>
                <Box>{selectedInstrument.model || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  生产厂家
                </Box>
                <Box>{selectedInstrument.manufacturer || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  序列号
                </Box>
                <Box>{selectedInstrument.serial_number || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  存放位置
                </Box>
                <Box>{selectedInstrument.location || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  负责人
                </Box>
                <Box>{selectedInstrument.responsible_person || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  购买日期
                </Box>
                <Box>
                  {selectedInstrument.purchase_date
                    ? new Date(selectedInstrument.purchase_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  最近校准日期
                </Box>
                <Box>
                  {selectedInstrument.calibration_date
                    ? new Date(selectedInstrument.calibration_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  下次校准日期
                </Box>
                <Box>
                  {selectedInstrument.next_calibration_date ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {needsCalibration(selectedInstrument) && (
                        <AlertTriangle style={{ width: 14, height: 14, color: ct.yellow[600] }} />
                      )}
                      <span
                        style={{
                          color: needsCalibration(selectedInstrument) ? ct.yellow[600] : 'inherit',
                        }}
                      >
                        {new Date(selectedInstrument.next_calibration_date).toLocaleDateString(
                          'zh-CN'
                        )}
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
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedInstrument.status || '正常')}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  备注
                </Box>
                <Box>{selectedInstrument.description || '-'}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            color='error'
            startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
            onClick={() => selectedInstrument && handleDelete(selectedInstrument)}
          >
            删除
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedInstrument) {
                handleEdit(selectedInstrument);
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

export default InstrumentPage;
