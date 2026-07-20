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

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;



const SerialNumberPage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
  > = {
    in_stock: { label: t('wms.serial_number_page.status_in_stock'), color: 'success' },
    out_stock: { label: t('wms.serial_number_page.status_out_stock'), color: 'default' },
    reserved: { label: t('wms.serial_number_page.text_ba07b1'), color: 'warning' },
    frozen: { label: t('wms.serial_number_page.text_28a286'), color: 'error' },
    scrapped: { label: t('wms.serial_number_page.scrap'), color: 'default' },
  };
  const qualityStatusConfig: Record<
    string,
    { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
  > = {
    qualified: { label: t('wms.serial_number_page.qualified'), color: 'success' },
    unqualified: { label: t('wms.serial_number_page.unqualified'), color: 'error' },
    pending: { label: t('wms.serial_number_page.text_5930e6'), color: 'warning' },
    inspecting: { label: t('wms.serial_number_page.inspection'), color: 'primary' },
  };

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
    unit: t('wms.serial_number_page.text_930882'),
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
      apiLogger.error(t('wms.serial_number_page.create'), error);
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
      apiLogger.error(t('wms.serial_number_page.update'), error);
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
      apiLogger.error(t('wms.serial_number_page.delete'), error);
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
      unit: serial.unit || t('wms.serial_number_page.text_930882'),
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
      title: t('wms.serial_number_page.dialog_delete_title'),
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
          title: t('wms.serial_number_page.info'),
          message: `序列号 ${serial.serial_no} 共有 ${response.data?.length || 0} 条追溯记录`,
        });
      }
    } catch (error: unknown) {
      apiLogger.error(t('wms.serial_number_page.search'), error);
      addNotification({
        type: 'error',
        title: t('wms.serial_number_page.search_1'),
        message: t('wms.serial_number_page.search_2'),
      });
    }
  };

  const resetForm = () => {
    setFormData({
      serial_no: '',
      sku: '',
      material_name: '',
      specification: '',
      unit: t('wms.serial_number_page.text_930882'),
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
      label: t('wms.serial_number_page.column_serial_number'),
      render: (row) => (
        <Box sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
          {row.serial_no}
          {isWarrantyExpiringSoon(row) && (
            <Chip
              size='small'
              label={t('wms.serial_number_page.text_996830')}
              color='warning'
              sx={{ ml: 1, fontSize: '0.625rem', height: 16 }}
            />
          )}
        </Box>
      ),
    },
    {
      id: 'material_info',
      label: t('wms.serial_number_page.info_1'),
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 500 }}>{row.material_name}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>SKU: {row.sku}</Box>
        </Box>
      ),
    },
    {
      id: 'batch_no',
      label: t('wms.serial_number_page.text_51767c'),
      render: (row) => row.batch_no || '-',
    },
    {
      id: 'location',
      label: t('wms.serial_number_page.field_location'),
      render: (row) => row.location_code || row.warehouse_name || '-',
    },
    {
      id: 'supplier_name',
      label: t('wms.serial_number_page.supplier'),
      render: (row) => row.supplier_name || '-',
    },
    {
      id: 'quality_status',
      label: t('wms.serial_number_page.status'),
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
      label: t('wms.serial_number_page.filter_status'),
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
      label: t('wms.serial_number_page.text_6a1188'),
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
      label: t('wms.serial_number_page.action_edit'),
      icon: <Edit size={14} />,
      onClick: (row: SerialNumber) => handleEdit(row),
    },
    {
      label: t('wms.serial_number_page.text_958e95'),
      icon: <History size={14} />,
      onClick: (row: SerialNumber) => handleTrace(row),
    },
    {
      label: t('wms.serial_number_page.transfer'),
      icon: <ArrowRightLeft size={14} />,
      onClick: (_row: SerialNumber) => {
        addNotification({
          type: 'info',
          title: t('wms.serial_number_page.hint'),
          message: t('wms.serial_number_page.transfer_1'),
        });
      },
    },
    {
      label: t('wms.serial_number_page.action_delete'),
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: SerialNumber) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title={t('wms.serial_number_page.breadcrumb_current')}
      subtitle={t('wms.serial_number_page.text_cccf00')}
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
            label: t('wms.serial_number_page.dialog_create_title'),
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
        emptyMessage={t('wms.serial_number_page.empty_message')}
        headerContent={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormField
              name='searchValue'
              size='small'
              placeholder={t('wms.serial_number_page.search_placeholder')}
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
        <DialogTitle>{isEditing ? t('wms.serial_number_page.dialog_edit_title') : t('wms.serial_number_page.dialog_create_title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
            >
              <Tab
                label={t('wms.serial_number_page.info_2')}
                icon={<Hash size={16} />}
                iconPosition='start'
              />
              <Tab
                label={t('wms.serial_number_page.info_3')}
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
                  label={t('wms.serial_number_page.field_serial_number_required')}
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
                  label={t('wms.serial_number_page.code')}
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
                  label={t('wms.serial_number_page.field_material_name_required')}
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
                  label={t('wms.serial_number_page.spec')}
                  value={formData.specification}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, specification: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='unit'
                  label={t('wms.serial_number_page.unit')}
                  value={formData.unit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='batch_no'
                  label={t('wms.serial_number_page.text_51767c')}
                  value={formData.batch_no}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, batch_no: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='warehouse_id'
                  label={t('wms.serial_number_page.warehouse')}
                  value={formData.warehouse_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, warehouse_id: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='location_id'
                  label={t('wms.serial_number_page.location')}
                  value={formData.location_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, location_id: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='supplier_id'
                  label={t('wms.serial_number_page.supplier_1')}
                  value={formData.supplier_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, supplier_id: e.target.value })
                  }
                  size='small'
                />
                <FormField
                  name='production_date'
                  label={t('wms.serial_number_page.date')}
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
                  label={t('wms.serial_number_page.text_6460f4')}
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
                    label={t('wms.serial_number_page.status')}
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
                  label={t('wms.serial_number_page.start_date')}
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
                  label={t('wms.serial_number_page.end_date')}
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
                  label={t('wms.serial_number_page.text_da4abd')}
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
              label={t('wms.serial_number_page.field_remark')}
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
                {isEditing ? t('wms.serial_number_page.update_1') : t('wms.serial_number_page.save')}
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
