import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  Button,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import type {
  DeliveryAppointmentStatus,
  SupplierDeliveryAppointment,
  CreateSupplierDeliveryAppointmentRequest,
  UpdateSupplierDeliveryAppointmentRequest,
  DeliveryAppointmentStats,
} from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  XCircle,
  Truck,
  CalendarCheck,
  PackageCheck,
  Ban,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const STATUS_OPTIONS: { value: DeliveryAppointmentStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已驳回' },
  { value: 'arrived', label: '已到货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const DELIVERY_METHOD_OPTIONS = [
  '公路运输',
  '铁路运输',
  '水路运输',
  '航空运输',
  '快递',
  '自提',
  '其他',
];

const statusChipColor = (
  status: DeliveryAppointmentStatus
): 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'info';
    case 'rejected':
      return 'error';
    case 'arrived':
      return 'primary';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
};

const statusLabel = (status: DeliveryAppointmentStatus): string => {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);
  return opt ? opt.label : status;
};

const ScmDeliveryAppointmentPage: React.FC = () => {
  const [appointments, setAppointments] = useState<SupplierDeliveryAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<DeliveryAppointmentStatus | ''>('');
  const [keyword, setKeyword] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<SupplierDeliveryAppointment | null>(null);
  const [stats, setStats] = useState<DeliveryAppointmentStats | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [formData, setFormData] = useState<CreateSupplierDeliveryAppointmentRequest>({
    purchase_order_id: '',
    purchase_order_no: '',
    supplier_id: '',
    supplier_name: '',
    delivery_date: '',
    delivery_time: '',
    delivery_method: '公路运输',
    vehicle_no: '',
    driver_name: '',
    driver_phone: '',
    cargo_description: '',
    total_quantity: 0,
    total_weight: 0,
    destination_warehouse: '',
    expected_arrival_time: '',
    applicant: '',
    remarks: '',
  });

  const { addNotification } = useAppStore();

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await scmApi.deliveryAppointments.list({
        page: currentPage,
        pageSize,
        status: statusFilter === '' ? undefined : statusFilter,
        search: keyword || undefined,
      });
      if (response.success && response.data) {
        setAppointments(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载供应商送货预约失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载供应商送货预约',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, keyword, addNotification]);

  const loadStats = useCallback(async () => {
    try {
      const response = await scmApi.deliveryAppointments.stats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: unknown) {
      apiLogger.warn('加载送货预约统计失败:', error);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id || !formData.delivery_date || !formData.delivery_method) {
      addNotification({
        type: 'error',
        title: '提交失败',
        message: '供应商、预约日期和送货方式为必填',
      });
      return;
    }
    try {
      if (isEditing && selectedAppointment) {
        const updateData: UpdateSupplierDeliveryAppointmentRequest = {
          purchase_order_id: formData.purchase_order_id || undefined,
          purchase_order_no: formData.purchase_order_no || undefined,
          delivery_date: formData.delivery_date,
          delivery_time: formData.delivery_time || undefined,
          delivery_method: formData.delivery_method,
          vehicle_no: formData.vehicle_no || undefined,
          driver_name: formData.driver_name || undefined,
          driver_phone: formData.driver_phone || undefined,
          cargo_description: formData.cargo_description || undefined,
          total_quantity: formData.total_quantity,
          total_weight: formData.total_weight,
          destination_warehouse: formData.destination_warehouse || undefined,
          expected_arrival_time: formData.expected_arrival_time || undefined,
          remarks: formData.remarks || undefined,
        };
        await scmApi.deliveryAppointments.update(selectedAppointment.id, updateData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '送货预约已更新',
        });
      } else {
        const createData: CreateSupplierDeliveryAppointmentRequest = {
          ...formData,
          purchase_order_id: formData.purchase_order_id || undefined,
          purchase_order_no: formData.purchase_order_no || undefined,
          supplier_name: formData.supplier_name || undefined,
          delivery_time: formData.delivery_time || undefined,
          vehicle_no: formData.vehicle_no || undefined,
          driver_name: formData.driver_name || undefined,
          driver_phone: formData.driver_phone || undefined,
          cargo_description: formData.cargo_description || undefined,
          destination_warehouse: formData.destination_warehouse || undefined,
          expected_arrival_time: formData.expected_arrival_time || undefined,
          applicant: formData.applicant || undefined,
          remarks: formData.remarks || undefined,
        };
        await scmApi.deliveryAppointments.create(createData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新送货预约已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadAppointments();
      loadStats();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新送货预约失败' : '创建送货预约失败',
      });
    }
  };

  const handleEdit = (apt: SupplierDeliveryAppointment) => {
    setSelectedAppointment(apt);
    setFormData({
      purchase_order_id: apt.purchase_order_id || '',
      purchase_order_no: apt.purchase_order_no || '',
      supplier_id: apt.supplier_id,
      supplier_name: apt.supplier_name || '',
      delivery_date: apt.delivery_date,
      delivery_time: apt.delivery_time || '',
      delivery_method: apt.delivery_method,
      vehicle_no: apt.vehicle_no || '',
      driver_name: apt.driver_name || '',
      driver_phone: apt.driver_phone || '',
      cargo_description: apt.cargo_description || '',
      total_quantity: apt.total_quantity || 0,
      total_weight: apt.total_weight || 0,
      destination_warehouse: apt.destination_warehouse || '',
      expected_arrival_time: apt.expected_arrival_time || '',
      applicant: apt.applicant || '',
      remarks: apt.remarks || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = (apt: SupplierDeliveryAppointment) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除预约 "${apt.appointment_no}" 吗？`,
      onConfirm: async () => {
        try {
          await scmApi.deliveryAppointments.delete(apt.id);
          addNotification({
            type: 'success',
            title: '删除成功',
            message: '送货预约已删除',
          });
          loadAppointments();
          loadStats();
        } catch (error: unknown) {
          apiLogger.error('删除失败:', error);
          addNotification({
            type: 'error',
            title: '删除失败',
            message: '删除送货预约失败',
          });
        }
      },
      danger: true,
    });
  };

  const handleApprove = useCallback(
    (apt: SupplierDeliveryAppointment) => {
      openConfirmDialog({
        title: '审批通过',
        message: `确定要审批通过预约 "${apt.appointment_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.deliveryAppointments.approve(apt.id, { remarks: '审批通过' });
            addNotification({
              type: 'success',
              title: '审批成功',
              message: '预约已审批通过',
            });
            loadAppointments();
            loadStats();
          } catch (error: unknown) {
            apiLogger.error('审批失败:', error);
            addNotification({
              type: 'error',
              title: '审批失败',
              message: '审批送货预约失败',
            });
          }
        },
      });
    },
    [addNotification, loadAppointments, loadStats]
  );

  const handleReject = useCallback(
    (apt: SupplierDeliveryAppointment) => {
      openConfirmDialog({
        title: '审批驳回',
        message: `确定要驳回预约 "${apt.appointment_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.deliveryAppointments.reject(apt.id, {
              remarks: '不符合送货要求',
            });
            addNotification({
              type: 'success',
              title: '驳回成功',
              message: '预约已驳回',
            });
            loadAppointments();
            loadStats();
          } catch (error: unknown) {
            apiLogger.error('驳回失败:', error);
            addNotification({
              type: 'error',
              title: '驳回失败',
              message: '驳回送货预约失败',
            });
          }
        },
        danger: true,
      });
    },
    [addNotification, loadAppointments, loadStats]
  );

  const handleConfirmArrival = useCallback(
    (apt: SupplierDeliveryAppointment) => {
      openConfirmDialog({
        title: '确认到货',
        message: `确定要确认预约 "${apt.appointment_no}" 已到货吗？`,
        onConfirm: async () => {
          try {
            await scmApi.deliveryAppointments.confirmArrival(apt.id, {
              remarks: '已到货',
            });
            addNotification({
              type: 'success',
              title: '到货确认成功',
              message: '已确认到货',
            });
            loadAppointments();
            loadStats();
          } catch (error: unknown) {
            apiLogger.error('到货确认失败:', error);
            addNotification({
              type: 'error',
              title: '操作失败',
              message: '到货确认失败',
            });
          }
        },
      });
    },
    [addNotification, loadAppointments, loadStats]
  );

  const handleComplete = useCallback(
    (apt: SupplierDeliveryAppointment) => {
      openConfirmDialog({
        title: '完成预约',
        message: `确定要将预约 "${apt.appointment_no}" 标记为已完成吗？`,
        onConfirm: async () => {
          try {
            await scmApi.deliveryAppointments.complete(apt.id, { remarks: '入库完成' });
            addNotification({
              type: 'success',
              title: '操作成功',
              message: '预约已完成',
            });
            loadAppointments();
            loadStats();
          } catch (error: unknown) {
            apiLogger.error('完成操作失败:', error);
            addNotification({
              type: 'error',
              title: '操作失败',
              message: '完成操作失败',
            });
          }
        },
      });
    },
    [addNotification, loadAppointments, loadStats]
  );

  const handleCancel = useCallback(
    (apt: SupplierDeliveryAppointment) => {
      openConfirmDialog({
        title: '取消预约',
        message: `确定要取消预约 "${apt.appointment_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.deliveryAppointments.cancel(apt.id, {
              reason: '业务调整',
            });
            addNotification({
              type: 'success',
              title: '取消成功',
              message: '预约已取消',
            });
            loadAppointments();
            loadStats();
          } catch (error: unknown) {
            apiLogger.error('取消失败:', error);
            addNotification({
              type: 'error',
              title: '取消失败',
              message: '取消送货预约失败',
            });
          }
        },
        danger: true,
      });
    },
    [addNotification, loadAppointments, loadStats]
  );

  const resetForm = () => {
    setFormData({
      purchase_order_id: '',
      purchase_order_no: '',
      supplier_id: '',
      supplier_name: '',
      delivery_date: '',
      delivery_time: '',
      delivery_method: '公路运输',
      vehicle_no: '',
      driver_name: '',
      driver_phone: '',
      cargo_description: '',
      total_quantity: 0,
      total_weight: 0,
      destination_warehouse: '',
      expected_arrival_time: '',
      applicant: '',
      remarks: '',
    });
    setIsEditing(false);
    setSelectedAppointment(null);
  };

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  // 统计卡片
  const renderStats = () => {
    if (!stats) return null;
    const cards = [
      { label: '预约总数', value: stats.total, color: '#1976d2' },
      { label: '即将到期', value: stats.upcoming, color: '#2e7d32' },
      { label: '已逾期', value: stats.overdue, color: '#d32f2f' },
    ];
    return (
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2 }}
      >
        {cards.map((c) => (
          <Paper
            key={c.label}
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 0.5 }}>{c.label}</Box>
            <Box sx={{ fontSize: 28, fontWeight: 600, color: c.color }}>{c.value}</Box>
          </Paper>
        ))}
      </Stack>
    );
  };

  // 自定义筛选区
  const filterBar = (
    <Stack
      direction='row'
      spacing={2}
      sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 2 }}
    >
      <TextField
        size='small'
        label='关键字'
        placeholder='预约单号 / 供应商'
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        sx={{ minWidth: 200 }}
      />
      <FormControl
        size='small'
        sx={{ minWidth: 160 }}
      >
        <InputLabel id='status-filter-label'>状态</InputLabel>
        <Select
          labelId='status-filter-label'
          label='状态'
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as DeliveryAppointmentStatus | '');
            setCurrentPage(1);
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem
              key={opt.value}
              value={opt.value}
            >
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        variant='outlined'
        onClick={() => loadAppointments()}
      >
        查询
      </Button>
      <Button
        variant='text'
        onClick={() => {
          setKeyword('');
          setStatusFilter('');
          setCurrentPage(1);
        }}
      >
        重置
      </Button>
    </Stack>
  );

  // 表格列定义
  const columns: ColumnDef<SupplierDeliveryAppointment>[] = [
    {
      id: 'appointment_no',
      label: '预约单号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.appointment_no}</Box>,
    },
    {
      id: 'supplier_name',
      label: '供应商',
      render: (row) => row.supplier_name || row.supplier_id,
    },
    {
      id: 'purchase_order_no',
      label: '采购订单',
      render: (row) => row.purchase_order_no || '-',
    },
    {
      id: 'delivery_date',
      label: '预约日期',
      render: (row) => <Box sx={{ fontSize: '0.875rem' }}>{row.delivery_date || '-'}</Box>,
    },
    {
      id: 'delivery_method',
      label: '送货方式',
    },
    {
      id: 'vehicle_no',
      label: '车牌号',
      render: (row) => row.vehicle_no || '-',
    },
    {
      id: 'driver',
      label: '司机/电话',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.driver_name || '-'}
          {row.driver_name && row.driver_phone ? ' / ' : ''}
          {row.driver_phone || ''}
        </Box>
      ),
    },
    {
      id: 'destination_warehouse',
      label: '目的仓库',
      render: (row) => row.destination_warehouse || '-',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          size='small'
          color={statusChipColor(row.status)}
          label={statusLabel(row.status)}
        />
      ),
    },
    {
      id: 'status_actions',
      label: '状态操作',
      align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {row.status === 'pending' && (
            <>
              <Button
                size='small'
                color='success'
                onClick={() => handleApprove(row)}
                startIcon={<Check size={12} />}
              >
                审批
              </Button>
              <Button
                size='small'
                color='error'
                onClick={() => handleReject(row)}
                startIcon={<XCircle size={12} />}
              >
                驳回
              </Button>
            </>
          )}
          {row.status === 'approved' && (
            <Button
              size='small'
              color='primary'
              onClick={() => handleConfirmArrival(row)}
              startIcon={<CalendarCheck size={12} />}
            >
              到货确认
            </Button>
          )}
          {row.status === 'arrived' && (
            <Button
              size='small'
              color='success'
              onClick={() => handleComplete(row)}
              startIcon={<PackageCheck size={12} />}
            >
              完成
            </Button>
          )}
          {(row.status === 'pending' || row.status === 'approved') && (
            <Button
              size='small'
              color='warning'
              onClick={() => handleCancel(row)}
              startIcon={<Ban size={12} />}
            >
              取消
            </Button>
          )}
        </Box>
      ),
    },
  ];

  // 行操作
  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row: SupplierDeliveryAppointment) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: SupplierDeliveryAppointment) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='供应商送货预约管理'
      subtitle='管理供应商送货预约，包括预约、审批、到货确认及完成全流程'
    >
      {renderStats()}
      {filterBar}

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={appointments}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
        actions={[
          {
            label: '新增预约',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={() => {
          loadAppointments();
          loadStats();
        }}
        emptyMessage='暂无送货预约数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑送货预约' : '新增送货预约'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label='供应商ID *'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                size='small'
                required
                disabled={isEditing}
              />
              <TextField
                label='供应商名称'
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                size='small'
              />
              <TextField
                label='采购订单ID'
                value={formData.purchase_order_id}
                onChange={(e) => setFormData({ ...formData, purchase_order_id: e.target.value })}
                size='small'
                disabled={isEditing}
              />
              <TextField
                label='采购订单号'
                value={formData.purchase_order_no}
                onChange={(e) => setFormData({ ...formData, purchase_order_no: e.target.value })}
                size='small'
              />
              <TextField
                label='预约日期 *'
                type='date'
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                size='small'
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label='预约时间'
                type='time'
                value={formData.delivery_time}
                onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl
                size='small'
                required
              >
                <InputLabel id='delivery-method-label'>送货方式 *</InputLabel>
                <Select
                  labelId='delivery-method-label'
                  label='送货方式 *'
                  value={formData.delivery_method}
                  onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
                >
                  {DELIVERY_METHOD_OPTIONS.map((m) => (
                    <MenuItem
                      key={m}
                      value={m}
                    >
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label='车牌号'
                value={formData.vehicle_no}
                onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                size='small'
              />
              <TextField
                label='司机姓名'
                value={formData.driver_name}
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                size='small'
              />
              <TextField
                label='司机电话'
                value={formData.driver_phone}
                onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                size='small'
              />
              <TextField
                label='目的仓库'
                value={formData.destination_warehouse}
                onChange={(e) =>
                  setFormData({ ...formData, destination_warehouse: e.target.value })
                }
                size='small'
              />
              <TextField
                label='预计到达时间'
                type='time'
                value={formData.expected_arrival_time}
                onChange={(e) =>
                  setFormData({ ...formData, expected_arrival_time: e.target.value })
                }
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label='总数量'
                type='number'
                value={formData.total_quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_quantity: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='总重量(kg)'
                type='number'
                value={formData.total_weight}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_weight: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='申请人'
                value={formData.applicant}
                onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
                size='small'
              />
            </Box>
            <TextField
              label='货物描述'
              multiline
              rows={2}
              value={formData.cargo_description}
              onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
              fullWidth
              size='small'
              sx={{ mt: 1 }}
            />
            <TextField
              label='备注'
              multiline
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              fullWidth
              size='small'
              sx={{ mt: 2 }}
            />
            <DialogActions sx={{ mt: 2 }}>
              <Button
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
                startIcon={<Truck size={14} />}
              >
                {isEditing ? '更新' : '保存'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default ScmDeliveryAppointmentPage;
