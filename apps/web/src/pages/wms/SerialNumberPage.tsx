import React, { useState, useCallback } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { SerialNumber, CreateSerialNumberRequest, UpdateSerialNumberRequest } from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useNotificationStore } from '@/store';
import { Plus, Edit, Trash2, Hash, Search, Package, ArrowRightLeft, History } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { designTokens } from '@/theme/tokens';
import { PageContainer } from '@/components/common';
import { ConfirmDialog, FormField } from '@topems/shared-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  in_stock: { label: '在库', color: 'success' },
  out_stock: { label: '已出库', color: 'default' },
  reserved: { label: '已预留', color: 'warning' },
  frozen: { label: '冻结', color: 'error' },
  scrapped: { label: '报废', color: 'default' },
};

const qualityStatusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  qualified: { label: '合格', color: 'success' },
  unqualified: { label: '不合格', color: 'error' },
  pending: { label: '待检', color: 'warning' },
  inspecting: { label: '检验中', color: 'primary' },
};

const SerialNumberPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState<SerialNumber | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [formData, setFormData] = useState<CreateSerialNumberRequest>({
    serial_no: '',
    sku: '',
    material_name: '',
    specification: '',
    unit: '个',
    warehouse_id: '',
    location_id: '',
    supplier_id: '',
    batch_no: '',
    production_date: '',
    expiry_date: '',
    quality_status: 'qualified',
    warranty_start_date: '',
    warranty_end_date: '',
    unit_price: 0,
    remark: '',
  });

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const {
    data: serialsResponse,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.WMS.SERIAL_NUMBERS, currentPage, pageSize, searchValue],
    queryFn: async () => {
      const response = await wmsApi.serialNumbers.list({
        page: currentPage,
        pagesize: pageSize,
        serial_no: searchValue || undefined,
      });
      if (!response.success) {
        throw new Error('Failed to fetch serial numbers');
      }
      return response.data;
    },
  });

  const serials = serialsResponse?.items || [];
  const total = serialsResponse?.total || 0;

  const createMutation = useMutation({
    mutationFn: async (data: CreateSerialNumberRequest) => {
      const response = await wmsApi.serialNumbers.create(data);
      if (!response.success) {
        throw new Error('Failed to create serial number');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.SERIAL_NUMBERS] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('创建序列号失败:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSerialNumberRequest }) => {
      const response = await wmsApi.serialNumbers.update(id, data);
      if (!response.success) {
        throw new Error('Failed to update serial number');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.SERIAL_NUMBERS] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('更新序列号失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.serialNumbers.delete(id);
      if (!response.success) {
        throw new Error('Failed to delete serial number');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.SERIAL_NUMBERS] });
    },
    onError: (error) => {
      apiLogger.error('删除序列号失败:', error);
    },
  });

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedSerial) {
      const updateData: UpdateSerialNumberRequest = {
        location_id: formData.location_id,
        quality_status: formData.quality_status,
        warranty_start_date: formData.warranty_start_date,
        warranty_end_date: formData.warranty_end_date,
        remark: formData.remark,
      };
      await updateMutation.mutateAsync({ id: selectedSerial.id, data: updateData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleEdit = (serial: SerialNumber) => {
    setSelectedSerial(serial);
    setFormData({
      serial_no: serial.serial_no,
      sku: serial.sku,
      material_name: serial.material_name,
      specification: serial.specification || '',
      unit: serial.unit || '个',
      warehouse_id: serial.warehouse_id,
      location_id: serial.location_id || '',
      supplier_id: serial.supplier_id || '',
      batch_no: serial.batch_no || '',
      production_date: serial.production_date || '',
      expiry_date: serial.expiry_date || '',
      quality_status: serial.quality_status,
      warranty_start_date: serial.warranty_start_date || '',
      warranty_end_date: serial.warranty_end_date || '',
      unit_price: serial.unit_price || 0,
      remark: serial.remark || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (serial: SerialNumber) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除序列号 "${serial.serial_no}" 吗？`,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(serial.id);
      },
      danger: true,
    });
  };

  const handleTrace = async (serial: SerialNumber) => {
    try {
      const response = await wmsApi.serialNumbers.getTrace(serial.id);
      if (response.success) {
        addNotification({
          type: 'info',
          title: '追溯信息',
          message: `序列号 ${serial.serial_no} 共有 ${response.data?.length || 0} 条追溯记录`,
        });
      }
    } catch (error: unknown) {
      apiLogger.error('查询追溯失败:', error);
      addNotification({
        type: 'error',
        title: '查询失败',
        message: '查询序列号追溯信息失败',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      serial_no: '',
      sku: '',
      material_name: '',
      specification: '',
      unit: '个',
      warehouse_id: '',
      location_id: '',
      supplier_id: '',
      batch_no: '',
      production_date: '',
      expiry_date: '',
      quality_status: 'qualified',
      warranty_start_date: '',
      warranty_end_date: '',
      unit_price: 0,
      remark: '',
    });
    setIsEditing(false);
    setSelectedSerial(null);
    setActiveTab(0);
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

  const isWarrantyExpiringSoon = (serial: SerialNumber) => {
    if (!serial.warranty_end_date) return false;
    const endDate = new Date(serial.warranty_end_date);
    const now = new Date();
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays > 0;
  };

  const columns: ColumnDef<SerialNumber>[] = [
    {
      id: 'serial_no',
      label: '序列号',
      render: (row) => (
        <Box sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
          {row.serial_no}
          {isWarrantyExpiringSoon(row) && (
            <Chip
              size='small'
              label='保修临期'
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
        </Box>
      ),
    },
    {
      id: 'batch_no',
      label: '批次号',
      render: (row) => row.batch_no || '-',
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
      id: 'quality_status',
      label: '质检状态',
      render: (row) => {
        const config = qualityStatusConfig[row.quality_status] || qualityStatusConfig.pending;
        return (
          <Chip
            size='small'
            label={config.label}
            color={config.color}
            variant='outlined'
          />
        );
      },
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.in_stock;
        return (
          <Chip
            size='small'
            label={config.label}
            color={config.color}
          />
        );
      },
    },
    {
      id: 'warranty',
      label: '保修期限',
      render: (row) => (
        <Box sx={{ fontSize: '0.8rem' }}>
          {row.warranty_start_date && row.warranty_end_date ? (
            <>
              <Box>{new Date(row.warranty_start_date).toLocaleDateString('zh-CN')} ~</Box>
              <Box>{new Date(row.warranty_end_date).toLocaleDateString('zh-CN')}</Box>
            </>
          ) : (
            '-'
          )}
        </Box>
      ),
    },
  ];

  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row: SerialNumber) => handleEdit(row),
    },
    {
      label: '追溯',
      icon: <History size={14} />,
      onClick: (row: SerialNumber) => handleTrace(row),
    },
    {
      label: '调拨',
      icon: <ArrowRightLeft size={14} />,
      onClick: (_row: SerialNumber) => {
        addNotification({
          type: 'info',
          title: '功能提示',
          message: '序列号调拨功能开发中',
        });
      },
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: SerialNumber) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='序列号管理'
      subtitle='管理商品序列号，跟踪单件商品的全生命周期'
      maxWidth='xl'
      headerProps={{
        pageIcon: <Hash style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main}, ${ct.secondary.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={serials}
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
            label: '新增序列号',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={refetch}
        emptyMessage='暂无序列号数据'
        headerContent={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormField
              name='searchValue'
              size='small'
              placeholder='搜索序列号...'
              value={searchValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === 'Enter' && handleSearch()
              }
              sx={{ minWidth: 200 }}
            />
            <Button
              variant='outlined'
              startIcon={<Search size={16} />}
              onClick={handleSearch}
            >
              搜索
            </Button>
          </Box>
        }
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑序列号' : '新增序列号'}</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
            >
              <Tab
                label='基本信息'
                icon={<Hash size={16} />}
                iconPosition='start'
              />
              <Tab
                label='保修信息'
                icon={<Package size={16} />}
                iconPosition='start'
              />
            </Tabs>
          </Box>
          <form onSubmit={handleSubmit}>
            {activeTab === 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                  gap: 2,
                  py: 1,
                }}
              >
                <FormField
                  name='serial_no'
                  label='序列号 *'
                  value={formData.serial_no}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, serial_no: e.target.value })
                  }
                  size='small'
                  required
                  disabled={isEditing}
                />
                <FormField
                  name='sku'
                  label='SKU编码 *'
                  value={formData.sku}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  size='small'
                  required
                  disabled={isEditing}
                />
                <FormField
                  name='material_name'
                  label='物料名称 *'
                  value={formData.material_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, material_name: e.target.value })
                  }
                  size='small'
                  required
                  disabled={isEditing}
                />
                <FormField
                  name='specification'
                  label='规格型号'
                  value={formData.specification}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, specification: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='unit'
                  label='单位'
                  value={formData.unit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='batch_no'
                  label='批次号'
                  value={formData.batch_no}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, batch_no: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='warehouse_id'
                  label='仓库ID'
                  value={formData.warehouse_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, warehouse_id: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='location_id'
                  label='库位ID'
                  value={formData.location_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, location_id: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='supplier_id'
                  label='供应商ID'
                  value={formData.supplier_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, supplier_id: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='production_date'
                  label='生产日期'
                  type='date'
                  value={formData.production_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, production_date: e.target.value })
                  }
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } } as const}
                />
                <FormField
                  name='expiry_date'
                  label='有效期至'
                  type='date'
                  value={formData.expiry_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, expiry_date: e.target.value })
                  }
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } } as const}
                />
                <FormControl size='small'>
                  <InputLabel>质检状态</InputLabel>
                  <Select
                    value={formData.quality_status}
                    label='质检状态'
                    onChange={(e: SelectChangeEvent) =>
                      setFormData({ ...formData, quality_status: e.target.value })
                    }
                  >
                    <MenuItem value='pending'>待检</MenuItem>
                    <MenuItem value='inspecting'>检验中</MenuItem>
                    <MenuItem value='qualified'>合格</MenuItem>
                    <MenuItem value='unqualified'>不合格</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
            {activeTab === 1 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 1,
                }}
              >
                <FormField
                  name='warranty_start_date'
                  label='保修开始日期'
                  type='date'
                  value={formData.warranty_start_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, warranty_start_date: e.target.value })
                  }
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } } as const}
                />
                <FormField
                  name='warranty_end_date'
                  label='保修结束日期'
                  type='date'
                  value={formData.warranty_end_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, warranty_end_date: e.target.value })
                  }
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } } as const}
                />
                <FormField
                  name='unit_price'
                  label='单价'
                  type='number'
                  value={formData.unit_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, unit_price: Number(e.target.value) })
                  }
                  size='small'
                />
              </Box>
            )}
            <FormField
              name='remark'
              label='备注'
              multiline
              rows={2}
              value={formData.remark}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, remark: e.target.value })
              }
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

export default SerialNumberPage;
