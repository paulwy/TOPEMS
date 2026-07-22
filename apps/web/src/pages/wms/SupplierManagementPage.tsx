import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Checkbox,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import React, { useState, useCallback } from 'react';
import type { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useNotificationStore } from '@/store';
import { FormField } from '@topems/shared-components';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { ImageUpload, PageContainer } from '@/components/common';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

import { useTranslation } from 'react-i18next';
const SupplierManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateSupplierRequest & { images?: string[] }>({
    name: '',
    short_name: '',
    contact_name: '',
    contact_phone: '',
    email: '',
    address: '',
    bank_account: '',
    tax_number: '',
  });

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const { data: suppliersResponse, isLoading: loading } = useQuery({
    queryKey: [QUERY_KEYS.SCM.SUPPLIERS, currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await scmApi.suppliers.list(params);
      if (!response.success) {
        throw new Error('Failed to fetch suppliers');
      }
      return response.data;
    },
  });

  const suppliers = suppliersResponse?.items || [];
  const total = suppliersResponse?.total || 0;

  const createMutation = useMutation({
    mutationFn: async (data: CreateSupplierRequest) => {
      const response = await scmApi.suppliers.create(data);
      if (!response.success) {
        throw new Error('Failed to create supplier');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCM.SUPPLIERS] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error(t('wms.supplier_management_page.supplier'), error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSupplierRequest }) => {
      const response = await scmApi.suppliers.update(id, data);
      if (!response.success) {
        throw new Error('Failed to update supplier');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCM.SUPPLIERS] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error(t('wms.supplier_management_page.supplier_1'), error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await scmApi.suppliers.delete(id);
      if (!response.success) {
        throw new Error('Failed to delete supplier');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCM.SUPPLIERS] });
    },
    onError: (error) => {
      apiLogger.error(t('wms.supplier_management_page.supplier_2'), error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSupplier) {
      await updateMutation.mutateAsync({
        id: selectedSupplier.id,
        data: formData as UpdateSupplierRequest,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('wms.supplier_management_page.supplier_3'))) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      short_name: supplier.short_name || '',
      contact_name: supplier.contact_name || '',
      contact_phone: supplier.contact_phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      bank_account: supplier.bank_account || '',
      tax_number: supplier.tax_number || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setFormData({
      name: '',
      short_name: '',
      contact_name: '',
      contact_phone: '',
      email: '',
      address: '',
      bank_account: '',
      tax_number: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
      }
    > = {
      active: { label: t('wms.supplier_management_page.active'), variant: 'default' },
      inactive: { label: t('wms.supplier_management_page.inactive'), variant: 'secondary' },
      blocked: { label: t('wms.supplier_management_page.text_92cff4'), variant: 'destructive' },
    };
    const s = statusMap[status] || { label: status, variant: 'outline' };
    return (
      <Chip
        size='small'
        variant={s.variant === 'outline' ? 'outlined' : 'filled'}
        label={s.label}
      />
    );
  };

  const columns: ColumnDef<Supplier>[] = [
    {
      id: 'name',
      label: t('wms.supplier_management_page.column_supplier_name'),
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.name}</Box>,
    },
    { id: 'short_name', label: t('wms.supplier_management_page.field_short_name'), render: (row) => row.short_name || '-' },
    {
      id: 'contact_name',
      label: t('wms.supplier_management_page.field_contact_person'),
      render: (row) => row.contact_name || '-',
    },
    {
      id: 'contact_phone',
      label: t('wms.supplier_management_page.phone'),
      render: (row) => row.contact_phone || '-',
    },
    { id: 'email', label: t('wms.supplier_management_page.field_email'), render: (row) => row.email || '-' },
    {
      id: 'status',
      label: t('wms.supplier_management_page.filter_status'),
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const rowActions = [
    {
      label: t('wms.supplier_management_page.action_view_detail'),
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: handleViewDetail,
    },
    {
      label: t('wms.supplier_management_page.action_edit'),
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: handleEdit,
    },
    {
      label: t('wms.supplier_management_page.action_delete'),
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      onClick: (row: Supplier) => handleDelete(row.id),
      color: 'error' as const,
      divider: true,
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: t('wms.supplier_management_page.status'),
      type: 'select',
      value: statusFilter,
      options: [
        { label: t('wms.supplier_management_page.filter_option_all_status'), value: '' },
        { label: t('wms.supplier_management_page.active'), value: 'active' },
        { label: t('wms.supplier_management_page.inactive'), value: 'inactive' },
        { label: t('wms.supplier_management_page.text_92cff4'), value: 'blocked' },
      ],
      onChange: (value) => {
        setStatusFilter(value as string);
        setCurrentPage(1);
      },
    },
  ];

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  return (
    <PageContainer
      title={t('wms.supplier_management_page.breadcrumb_current')}
      subtitle={t('wms.supplier_management_page.supplier_4')}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={suppliers}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        globalSearch={{
          fields: ['name', 'contact_name'],
          placeholder: t('wms.supplier_management_page.supplier_name'),
        }}
        searchValue={searchTerm}
        onSearch={handleSearchChange}
        filters={filters}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: t('wms.supplier_management_page.dialog_create_title'),
            icon: <Plus style={{ width: 16, height: 16 }} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
          },
        ]}
        rowActions={rowActions}
        emptyMessage={t('wms.supplier_management_page.empty_message')}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedSupplier ? t('wms.supplier_management_page.dialog_edit_title') : t('wms.supplier_management_page.dialog_create_title')}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 2 }}
          >
            {selectedSupplier ? t('wms.supplier_management_page.supplier_5') : t('wms.supplier_management_page.supplier_6')}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormField
                  name='name'
                  label={t('wms.supplier_management_page.field_supplier_name_required')}
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  size='small'
                  fullWidth
                />
                <FormField
                  name='short_name'
                  label={t('wms.supplier_management_page.field_short_name')}
                  value={formData.short_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, short_name: e.target.value })
                  }
                  size='small'
                  fullWidth
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormField
                  name='contact_name'
                  label={t('wms.supplier_management_page.field_contact_person')}
                  value={formData.contact_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  size='small'
                  fullWidth
                />
                <FormField
                  name='contact_phone'
                  label={t('wms.supplier_management_page.phone')}
                  value={formData.contact_phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, contact_phone: e.target.value })
                  }
                  size='small'
                  fullWidth
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormField
                  name='email'
                  label={t('wms.supplier_management_page.field_email')}
                  type='email'
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  size='small'
                  fullWidth
                />
                <FormField
                  name='bank_account'
                  label={t('wms.supplier_management_page.text_c85e1d')}
                  value={formData.bank_account}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, bank_account: e.target.value })
                  }
                  size='small'
                  fullWidth
                />
              </Box>
              <FormField
                name='address'
                label={t('wms.supplier_management_page.field_address')}
                value={formData.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                size='small'
                fullWidth
              />
              <FormField
                name='tax_number'
                label={t('wms.supplier_management_page.text_98a33d')}
                value={formData.tax_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, tax_number: e.target.value })
                }
                size='small'
                fullWidth
              />
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mb: 1, display: 'block' }}
                >
                  供应商图片
                </Typography>
                <ImageUpload
                  value={formData.images || []}
                  onChange={(files) => setFormData({ ...formData, images: files })}
                  maxCount={9}
                  accept='image/*'
                  cropEnabled
                  height={150}
                />
              </Box>
            </Box>
            <DialogActions sx={{ mt: 3 }}>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button type='submit'>保存</Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>供应商详情</DialogTitle>
        <DialogContent>
          {selectedSupplier && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    供应商名称
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{selectedSupplier.name}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    简称
                  </Typography>
                  <Typography>{selectedSupplier.short_name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    联系人
                  </Typography>
                  <Typography>{selectedSupplier.contact_name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    联系电话
                  </Typography>
                  <Typography>{selectedSupplier.contact_phone || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    邮箱
                  </Typography>
                  <Typography>{selectedSupplier.email || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    银行账户
                  </Typography>
                  <Typography>{selectedSupplier.bank_account || '-'}</Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    地址
                  </Typography>
                  <Typography>{selectedSupplier.address || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    税号
                  </Typography>
                  <Typography>{selectedSupplier.tax_number || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedSupplier.status)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    创建时间
                  </Typography>
                  <Typography>
                    {new Date(selectedSupplier.created_at).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary' }}
                  >
                    更新时间
                  </Typography>
                  <Typography>
                    {new Date(selectedSupplier.updated_at).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default SupplierManagementPage;
