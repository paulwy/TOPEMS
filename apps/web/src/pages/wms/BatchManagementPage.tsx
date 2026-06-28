import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type {
  Batch,
  CreateBatchRequest,
  UpdateBatchRequest,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Layers, AlertTriangle, Package, ArrowRightLeft } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const statusConfig: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  in_stock: { label: '在库', color: 'success' },
  out_stock: { label: '已出库', color: 'default' },
  reserved: { label: '已预留', color: 'warning' },
  frozen: { label: '冻结', color: 'error' },
  scrapped: { label: '报废', color: 'default' },
};

const qualityStatusConfig: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  qualified: { label: '合格', color: 'success' },
  unqualified: { label: '不合格', color: 'error' },
  pending: { label: '待检', color: 'warning' },
  inspecting: { label: '检验中', color: 'primary' },
};

const BatchManagementPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [formData, setFormData] = useState<CreateBatchRequest>({
    batch_no: '',
    sku: '',
    material_name: '',
    specification: '',
    unit: '个',
    quantity: 0,
    warehouse_id: '',
    location_id: '',
    supplier_id: '',
    production_date: '',
    expiry_date: '',
    receipt_date: '',
    quality_status: 'qualified',
    shelf_life_days: 0,
    unit_price: 0,
    remark: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadBatches();
  }, [currentPage, pageSize]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const response = await wmsApi.batches.list({
        page: currentPage,
        pagesize: pageSize,
      });
      if (response.success && response.data) {
        setBatches(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载批次失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载批次数据',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedBatch) {
        const updateData: UpdateBatchRequest = {
          quantity: formData.quantity,
          location_id: formData.location_id,
          quality_status: formData.quality_status,
          expiry_date: formData.expiry_date,
          remark: formData.remark,
        };
        await wmsApi.batches.update(selectedBatch.id, updateData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '批次已更新',
        });
      } else {
        await wmsApi.batches.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新批次已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadBatches();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新批次失败' : '创建批次失败',
      });
    }
  };

  const handleEdit = (batch: Batch) => {
    setSelectedBatch(batch);
    setFormData({
      batch_no: batch.batch_no,
      sku: batch.sku,
      material_name: batch.material_name,
      specification: batch.specification || '',
      unit: batch.unit || '个',
      quantity: batch.quantity,
      warehouse_id: batch.warehouse_id,
      location_id: batch.location_id || '',
      supplier_id: batch.supplier_id || '',
      production_date: batch.production_date || '',
      expiry_date: batch.expiry_date || '',
      receipt_date: batch.receipt_date || '',
      quality_status: batch.quality_status,
      shelf_life_days: batch.shelf_life_days || 0,
      unit_price: batch.unit_price || 0,
      remark: batch.remark || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (batch: Batch) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除批次 "${batch.batch_no}" 吗？`,
      onConfirm: async () => {
        try {
          await wmsApi.batches.delete(batch.id);
          addNotification({
            type: 'success',
            title: '删除成功',
            message: '批次已删除',
          });
          loadBatches();
        } catch (error: unknown) {
          apiLogger.error('删除失败:', error);
          addNotification({
            type: 'error',
            title: '删除失败',
            message: '删除批次失败',
          });
        }
      },
      danger: true,
    });
  };

  const resetForm = () => {
    setFormData({
      batch_no: '',
      sku: '',
      material_name: '',
      specification: '',
      unit: '个',
      quantity: 0,
      warehouse_id: '',
      location_id: '',
      supplier_id: '',
      production_date: '',
      expiry_date: '',
      receipt_date: '',
      quality_status: 'qualified',
      shelf_life_days: 0,
      unit_price: 0,
      remark: '',
    });
    setIsEditing(false);
    setSelectedBatch(null);
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

  const isExpiringSoon = (batch: Batch) => {
    if (!batch.expiry_date || !batch.shelf_life_days) return false;
    const expiryDate = new Date(batch.expiry_date);
    const now = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (batch: Batch) => {
    if (!batch.expiry_date) return false;
    return new Date(batch.expiry_date) < new Date();
  };

  const columns: ColumnDef<Batch>[] = [
    {
      id: 'batch_no',
      label: '批次号',
      render: (row) => (
        <Box sx={{ fontWeight: 500 }}>
          {row.batch_no}
          {isExpired(row) && (
            <Chip
              size='small'
              label='已过期'
              color='error'
              sx={{ ml: 1, fontSize: '0.625rem', height: 16 }}
            />
          )}
          {isExpiringSoon(row) && !isExpired(row) && (
            <Chip
              size='small'
              label='临期'
              color='warning'
              sx={{ ml: 1, fontSize: '0.625rem', height: 16 }}
            />
          )}
        </Box>
      ),
    },
    {
      id: 'material_info',
      label: '物料信息',
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 500 }}>{row.material_name}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>SKU: {row.sku}</Box>
          {row.specification && (
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{row.specification}</Box>
          )}
        </Box>
      ),
    },
    {
      id: 'quantity',
      label: '数量',
      align: 'right',
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 500 }}>
            {row.quantity.toLocaleString()} {row.unit}
          </Box>
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            可用: {row.available_quantity.toLocaleString()}
          </Box>
        </Box>
      ),
    },
    {
      id: 'location',
      label: '库位',
      render: (row) => row.location_code || row.warehouse_name || '-',
    },
    {
      id: 'supplier_name',
      label: '供应商',
      render: (row) => row.supplier_name || '-',
    },
    {
      id: 'production_date',
      label: '生产日期',
      render: (row) =>
        row.production_date ? new Date(row.production_date).toLocaleDateString('zh-CN') : '-',
    },
    {
      id: 'expiry_date',
      label: '有效期至',
      render: (row) => (
        <Box sx={{ color: isExpired(row) ? 'error.main' : isExpiringSoon(row) ? 'warning.main' : 'inherit' }}>
          {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('zh-CN') : '-'}
          {row.remaining_days !== undefined && row.remaining_days >= 0 && (
            <Box sx={{ fontSize: '0.75rem' }}>剩余 {row.remaining_days} 天</Box>
          )}
        </Box>
      ),
    },
    {
      id: 'quality_status',
      label: '质检状态',
      render: (row) => {
        const config = qualityStatusConfig[row.quality_status] || qualityStatusConfig.pending;
        return <Chip size='small' label={config.label} color={config.color} variant='outlined' />;
      },
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.in_stock;
        return <Chip size='small' label={config.label} color={config.color} />;
      },
    },
  ];

  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row: Batch) => handleEdit(row),
    },
    {
      label: '调拨',
      icon: <ArrowRightLeft size={14} />,
      onClick: (_row: Batch) => {
        addNotification({
          type: 'info',
          title: '功能提示',
          message: '批次调拨功能开发中',
        });
      },
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: Batch) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='批次管理'
      subtitle='管理库存批次，跟踪批次信息、有效期和质检状态'
      maxWidth='xl'
      headerProps={{
        pageIcon: <Layers style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={batches}
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
            label: '新增批次',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
          {
            label: '临期预警',
            icon: <AlertTriangle size={16} />,
            onClick: () => {
              addNotification({
                type: 'info',
                title: '临期预警',
                message: '正在加载临期批次...',
              });
            },
            variant: 'outlined',
          },
          {
            label: '库存总览',
            icon: <Package size={16} />,
            onClick: () => {
              addNotification({
                type: 'info',
                title: '库存总览',
                message: '正在加载库存统计...',
              });
            },
            variant: 'outlined',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadBatches}
        emptyMessage='暂无批次数据'
      />

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth='lg' fullWidth>
        <DialogTitle>{isEditing ? '编辑批次' : '新增批次'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                gap: 2,
                py: 1,
              }}
            >
              <TextField
                label='批次号 *'
                value={formData.batch_no}
                onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                size='small'
                required
                disabled={isEditing}
              />
              <TextField
                label='SKU编码 *'
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                size='small'
                required
                disabled={isEditing}
              />
              <TextField
                label='物料名称 *'
                value={formData.material_name}
                onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                size='small'
                required
                disabled={isEditing}
              />
              <TextField
                label='规格型号'
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                size='small'
              />
              <TextField
                label='单位'
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                size='small'
              />
              <TextField
                label='数量 *'
                type='number'
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                size='small'
                required
              />
              <TextField
                label='仓库ID'
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                size='small'
              />
              <TextField
                label='库位ID'
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                size='small'
              />
              <TextField
                label='供应商ID'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                size='small'
              />
              <TextField
                label='生产日期'
                type='date'
                value={formData.production_date}
                onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label='有效期至'
                type='date'
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label='入库日期'
                type='date'
                value={formData.receipt_date}
                onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl size='small'>
                <InputLabel>质检状态</InputLabel>
                <Select
                  value={formData.quality_status}
                  label='质检状态'
                  onChange={(e) => setFormData({ ...formData, quality_status: e.target.value })}
                >
                  <MenuItem value='pending'>待检</MenuItem>
                  <MenuItem value='inspecting'>检验中</MenuItem>
                  <MenuItem value='qualified'>合格</MenuItem>
                  <MenuItem value='unqualified'>不合格</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='保质期(天)'
                type='number'
                value={formData.shelf_life_days}
                onChange={(e) => setFormData({ ...formData, shelf_life_days: Number(e.target.value) })}
                size='small'
              />
              <TextField
                label='单价'
                type='number'
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                size='small'
              />
            </Box>
            <TextField
              label='备注'
              multiline
              rows={2}
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              fullWidth
              size='small'
              sx={{ mt: 2 }}
            />
            <DialogActions sx={{ mt: 2 }}>
              <Button variant='outlined' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit' variant='contained'>
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

export default BatchManagementPage;
