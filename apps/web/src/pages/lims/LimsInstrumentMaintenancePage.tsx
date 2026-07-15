import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  Wrench,
  Calendar,
  User,
  DollarSign,
  FileText,
  Clock,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  MenuItem,
  Button,
  useTheme,
} from '@mui/material';

import { limsApi } from '@/api/lims';
import type { Instrument, MaintenanceRecord, CreateMaintenanceRecordRequest } from '@/api/lims';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { logger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';

const ct = designTokens.colors;

interface LimsListResponse<T> {
  items?: T[];
}

const LimsInstrumentMaintenancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [formData, setFormData] = useState({
    maintenance_type: '',
    description: '',
    performed_by: '',
    performed_at: new Date().toISOString().split('T')[0],
    next_maintenance_date: '',
    cost: '',
    notes: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: detailData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.LIMS.INSTRUMENT(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const [instrumentRes, maintenanceRes] = await Promise.all([
        limsApi.getInstrument(id),
        limsApi.listMaintenanceByInstrument(id),
      ]);

      let instrument: Instrument | null = null;
      if (instrumentRes.success && instrumentRes.data) {
        instrument = instrumentRes.data as Instrument;
      }

      let maintenanceRecords: MaintenanceRecord[] = [];
      if (maintenanceRes.success && maintenanceRes.data) {
        const maintenanceData = maintenanceRes.data as
          LimsListResponse<MaintenanceRecord> | MaintenanceRecord[];
        maintenanceRecords = Array.isArray(maintenanceData)
          ? maintenanceData
          : maintenanceData.items || [];
      }

      return { instrument, maintenanceRecords };
    },
    enabled: !!id,
  });

  const instrument = detailData?.instrument || null;
  const maintenanceRecords = detailData?.maintenanceRecords || [];

  const invalidateMaintenance = () => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.INSTRUMENT(id) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.MAINTENANCE_BY_INSTRUMENT(id),
      });
    }
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.MAINTENANCE });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateMaintenanceRecordRequest) => {
      const response = await limsApi.createMaintenance(data);
      if (!response.success) {
        throw new Error(response.message || '创建失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      invalidateMaintenance();
      setShowAddModal(false);
      resetForm();
    },
    onError: (error: unknown) => {
      logger.error('创建维护记录失败:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateMaintenanceRecordRequest>;
    }) => {
      const response = await limsApi.updateMaintenance(id, data);
      if (!response.success) {
        throw new Error(response.message || '更新失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      invalidateMaintenance();
      setShowEditModal(false);
      resetForm();
      setEditingRecord(null);
    },
    onError: (error: unknown) => {
      logger.error('更新维护记录失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const response = await limsApi.deleteMaintenance(recordId);
      if (!response.success) {
        throw new Error(response.message || '删除失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      invalidateMaintenance();
    },
    onError: (error: unknown) => {
      logger.error('删除维护记录失败:', error);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      normal: { bg: 'success.lighter', color: 'success.dark', label: '正常' },
      正常: { bg: 'success.lighter', color: 'success.dark', label: '正常' },
      calibration: { bg: 'warning.100', color: ct.yellow[600], label: '校准中' },
      校准中: { bg: 'warning.100', color: ct.yellow[600], label: '校准中' },
      maintenance: { bg: 'error.lighter', color: 'error.dark', label: '维修中' },
      维修中: { bg: 'error.lighter', color: 'error.dark', label: '维修中' },
      disabled: { bg: 'grey.100', color: 'text.secondary', label: '停用' },
      停用: { bg: 'grey.100', color: 'text.secondary', label: '停用' },
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

  const handleCreateMaintenance = async () => {
    if (!instrument) return;
    if (!formData.maintenance_type.trim()) {
      addNotification({
        title: '错误',
        message: '请选择维护类型',
        type: 'error',
      });
      return;
    }
    if (!formData.description.trim()) {
      addNotification({
        title: '错误',
        message: '请输入维护描述',
        type: 'error',
      });
      return;
    }
    if (!formData.performed_by.trim()) {
      addNotification({
        title: '错误',
        message: '请输入执行人',
        type: 'error',
      });
      return;
    }
    await createMutation.mutateAsync({
      instrument_id: instrument.id,
      maintenance_type: formData.maintenance_type,
      description: formData.description,
      performed_by: formData.performed_by,
      performed_at: formData.performed_at,
      next_maintenance_date: formData.next_maintenance_date,
      cost: parseFloat(formData.cost) || 0,
      notes: formData.notes,
    });
  };

  const handleUpdateMaintenance = async () => {
    if (!editingRecord || !instrument) return;
    if (!formData.maintenance_type.trim()) {
      addNotification({
        title: '错误',
        message: '请选择维护类型',
        type: 'error',
      });
      return;
    }
    if (!formData.description.trim()) {
      addNotification({
        title: '错误',
        message: '请输入维护描述',
        type: 'error',
      });
      return;
    }
    if (!formData.performed_by.trim()) {
      addNotification({
        title: '错误',
        message: '请输入执行人',
        type: 'error',
      });
      return;
    }
    await updateMutation.mutateAsync({
      id: editingRecord.id,
      data: {
        maintenance_type: formData.maintenance_type,
        description: formData.description,
        performed_by: formData.performed_by,
        performed_at: formData.performed_at,
        next_maintenance_date: formData.next_maintenance_date,
        cost: parseFloat(formData.cost) || 0,
        notes: formData.notes,
      },
    });
  };

  const handleDeleteMaintenance = async (recordId: string) => {
    if (!confirm('确定要删除这条维护记录吗？')) return;
    await deleteMutation.mutateAsync(recordId);
  };

  const resetForm = () => {
    setFormData({
      maintenance_type: '',
      description: '',
      performed_by: '',
      performed_at: new Date().toISOString().split('T')[0],
      next_maintenance_date: '',
      cost: '',
      notes: '',
    });
  };

  const openEditModal = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      maintenance_type: record.maintenance_type || '',
      description: record.description || '',
      performed_by: record.performed_by || '',
      performed_at: record.performed_at
        ? new Date(record.performed_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      next_maintenance_date: record.next_maintenance_date
        ? new Date(record.next_maintenance_date).toISOString().split('T')[0]
        : '',
      cost: record.cost?.toString() || '',
      notes: record.notes || '',
    });
    setShowEditModal(true);
  };

  const maintenanceColumns: ColumnDef<MaintenanceRecord>[] = [
    {
      id: 'maintenance_type',
      label: '维护类型',
      render: (row) => (
        <Chip
          label={row.maintenance_type || '-'}
          size='small'
          sx={{ backgroundColor: 'primary.100', color: 'primary.dark' }}
        />
      ),
    },
    { id: 'performed_by', label: '维护人员' },
    {
      id: 'performed_at',
      label: '维护日期',
      render: (row) => (
        <span>
          {row.performed_at ? new Date(row.performed_at).toLocaleDateString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      id: 'cost',
      label: '费用 (元)',
      render: (row) => (
        <span style={{ fontWeight: 500, color: theme.palette.grey[900] }}>
          {row.cost?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      id: 'actions',
      label: '操作',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='text'
            size='small'
            onClick={() => openEditModal(row)}
            startIcon={
              <Box
                component={Edit3}
                sx={{ fontSize: 16 }}
              />
            }
          />
          <Button
            variant='text'
            size='small'
            sx={{ color: 'error.dark', '&:hover': { backgroundColor: 'error.light' } }}
            onClick={() => handleDeleteMaintenance(row.id)}
            startIcon={
              <Box
                component={Trash2}
                sx={{ fontSize: 16 }}
              />
            }
          />
        </Box>
      ),
    },
  ];

  const totalMaintenanceCost = maintenanceRecords.reduce(
    (sum, record) => sum + (record.cost || 0),
    0
  );

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
              border: `4px solid ${ct.teal[200]}`,
              borderTop: `4px solid ${ct.teal[600]}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto',
            }}
          ></div>
          <p style={{ color: ct.grey[600] }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!instrument) {
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
              margin: '0 auto 16px auto',
            }}
          />
          <p style={{ color: ct.grey[600] }}>仪器不存在或已被删除</p>
          <Button
            onClick={() => navigate(LIMS_PATHS.root)}
            sx={{ mt: 2 }}
          >
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const headerActions = [
    {
      label: '添加维护记录',
      icon: <Plus style={{ width: 18, height: 18 }} />,
      variant: 'contained' as const,
      color: 'primary' as const,
      onClick: () => setShowAddModal(true),
    },
  ];

  return (
    <PageContainer
      title='仪器维护记录'
      subtitle='Instrument Maintenance'
      headerProps={{
        pageIcon: <Wrench style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]}, ${ct.teal[600]})`,
        backButton: { onClick: () => navigate(LIMS_PATHS.root) },
        actions: headerActions,
      }}
      maxWidth='xl'
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            gridColumn: { lg: 'span 1' },
          }}
        >
          <Card>
            <CardHeader sx={{ pb: 1 }}>
              <Typography
                variant='h6'
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box
                  component={Wrench}
                  sx={{ fontSize: 20, color: ct.teal[400] }}
                />
                仪器信息
              </Typography>
            </CardHeader>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.grey[600] }}>仪器编号</p>
                  <p
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: theme.palette.grey[900],
                      marginTop: 4,
                    }}
                  >
                    {instrument.code || instrument.id}
                  </p>
                </div>
                {getStatusBadge(instrument.status)}
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: theme.palette.grey[600] }}>仪器名称</p>
                <p
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    color: theme.palette.grey[900],
                    marginTop: 4,
                  }}
                >
                  {instrument.name}
                </p>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <div>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.grey[600] }}>型号</p>
                  <p style={{ color: theme.palette.grey[900], marginTop: 4 }}>
                    {instrument.model || '-'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.grey[600] }}>分类</p>
                  <p style={{ color: theme.palette.grey[900], marginTop: 4 }}>
                    {instrument.category || '-'}
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <div>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.grey[600] }}>位置</p>
                  <p style={{ color: theme.palette.grey[900], marginTop: 4 }}>
                    {instrument.location || '-'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.grey[600] }}>负责人</p>
                  <p style={{ color: theme.palette.grey[900], marginTop: 4 }}>
                    {instrument.responsible_person || '-'}
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: theme.palette.grey[600],
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Calendar sx={{ width: 12, height: 12 }} />
                    采购日期
                  </p>
                  <p style={{ color: theme.palette.grey[900], marginTop: 4 }}>
                    {instrument.purchase_date
                      ? new Date(instrument.purchase_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: theme.palette.grey[600],
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Clock sx={{ width: 12, height: 12 }} />
                    下次校准
                  </p>
                  <p style={{ color: theme.palette.grey[900], marginTop: 4 }}>
                    {instrument.next_calibration_date
                      ? new Date(instrument.next_calibration_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader sx={{ pb: 1 }}>
              <Typography
                variant='h6'
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box
                  component={DollarSign}
                  sx={{ fontSize: 20, color: 'success.dark' }}
                />
                维护统计
              </Typography>
            </CardHeader>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    padding: 12,
                    backgroundColor: theme.palette.success.light,
                    borderRadius: 8,
                  }}
                >
                  <p style={{ fontSize: '0.875rem', color: theme.palette.success.dark }}>
                    维护次数
                  </p>
                  <p
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: 'success.700',
                    }}
                  >
                    {maintenanceRecords.length}
                  </p>
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    padding: 12,
                    backgroundColor: 'primary.100',
                    borderRadius: 8,
                  }}
                >
                  <p style={{ fontSize: '0.875rem', color: theme.palette.primary.dark }}>
                    累计费用
                  </p>
                  <p
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: theme.palette.primary.dark,
                    }}
                  >
                    ¥{totalMaintenanceCost.toFixed(2)}
                  </p>
                </div>
              </div>
              {maintenanceRecords.length > 0 && (
                <div style={{ paddingTop: 16, borderTop: '1px solid border.default' }}>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.grey[600] }}>最近维护</p>
                  <p style={{ color: theme.palette.grey[900], marginTop: 4 }}>
                    {new Date(maintenanceRecords[0].performed_at || Date.now()).toLocaleDateString(
                      'zh-CN'
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ gridColumn: { lg: 'span 2' } }}>
          <Card>
            <CardHeader
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 1,
              }}
            >
              <Typography
                variant='h6'
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box
                  component={FileText}
                  sx={{ fontSize: 20, color: 'primary.dark' }}
                />
                维护记录列表
              </Typography>
            </CardHeader>
            <CardContent>
              <ListPageTemplate
                columns={maintenanceColumns}
                data={maintenanceRecords}
                getRowId={(row) => row.id}
                emptyMessage='暂无维护记录'
                emptyIcon={
                  <FileText
                    size={64}
                    color='grey.400'
                  />
                }
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>添加维护记录</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                select
                label='维护类型 *'
                value={formData.maintenance_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maintenance_type: e.target.value,
                  }))
                }
                fullWidth
                size='small'
              >
                <MenuItem value=''>请选择类型</MenuItem>
                <MenuItem value='定期维护'>定期维护</MenuItem>
                <MenuItem value='故障维修'>故障维修</MenuItem>
                <MenuItem value='校准'>校准</MenuItem>
                <MenuItem value='升级改造'>升级改造</MenuItem>
              </TextField>
              <TextField
                label='维护人员 *'
                value={formData.performed_by}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    performed_by: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                placeholder='请输入维护人员'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                type='date'
                label='维护日期 *'
                value={formData.performed_at}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    performed_at: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                type='date'
                label='下次维护日期'
                value={formData.next_maintenance_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    next_maintenance_date: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
            </Box>
            <TextField
              type='number'
              label='费用 (元)'
              value={formData.cost}
              onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
              fullWidth
              size='small'
              placeholder='0.00'
            />
            <TextField
              label='维护描述'
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
              placeholder='请描述维护内容...'
            />
            <TextField
              label='备注'
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              placeholder='其他备注信息...'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAddModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateMaintenance}
          >
            保存记录
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑维护记录</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                select
                label='维护类型 *'
                value={formData.maintenance_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maintenance_type: e.target.value,
                  }))
                }
                fullWidth
                size='small'
              >
                <MenuItem value=''>请选择类型</MenuItem>
                <MenuItem value='定期维护'>定期维护</MenuItem>
                <MenuItem value='故障维修'>故障维修</MenuItem>
                <MenuItem value='校准'>校准</MenuItem>
                <MenuItem value='升级改造'>升级改造</MenuItem>
              </TextField>
              <TextField
                label='维护人员 *'
                value={formData.performed_by}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    performed_by: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                placeholder='请输入维护人员'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                type='date'
                label='维护日期 *'
                value={formData.performed_at}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    performed_at: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                type='date'
                label='下次维护日期'
                value={formData.next_maintenance_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    next_maintenance_date: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
            </Box>
            <TextField
              type='number'
              label='费用 (元)'
              value={formData.cost}
              onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
              fullWidth
              size='small'
              placeholder='0.00'
            />
            <TextField
              label='维护描述'
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
              placeholder='请描述维护内容...'
            />
            <TextField
              label='备注'
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              placeholder='其他备注信息...'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowEditModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdateMaintenance}
          >
            保存更改
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default LimsInstrumentMaintenancePage;
