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

const SupplierManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateSupplierRequest>({
    name: '',
    short_name: '',
    contact_name: '',
    contact_phone: '',
    email: '',
    address: '',
    bank_account: '',
    tax_number: '',
  } as any);

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
      apiLogger.error('创建供应商失败:', error);
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
      apiLogger.error('更新供应商失败:', error);
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
      apiLogger.error('删除供应商失败:', error);
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
    if (!window.confirm('确定要删除这个供应商吗?')) return;
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
      active: { label: '活跃', variant: 'default' },
      inactive: { label: '非活跃', variant: 'secondary' },
      blocked: { label: '已冻结', variant: 'destructive' },
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
      label: '供应商名称',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.name}</Box>,
    },
    { id: 'short_name', label: '简称', render: (row) => row.short_name || '-' },
    {
      id: 'contact_name',
      label: '联系人',
      render: (row) => row.contact_name || '-',
    },
    {
      id: 'contact_phone',
      label: '联系电话',
      render: (row) => row.contact_phone || '-',
    },
    { id: 'email', label: '邮箱', render: (row) => row.email || '-' },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const rowActions = [
    {
      label: '查看详情',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: handleViewDetail,
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: handleEdit,
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      onClick: (row: Supplier) => handleDelete(row.id),
      color: 'error' as const,
      divider: true,
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态筛选',
      type: 'select',
      value: statusFilter,
      options: [
        { label: '全部状态', value: '' },
        { label: '活跃', value: 'active' },
        { label: '非活跃', value: 'inactive' },
        { label: '已冻结', value: 'blocked' },
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
      title='供应商管理'
      subtitle='管理供应商信息,包括基本信息、联系方式、银行账户等'
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
          placeholder: '搜索供应商名称或联系人...',
        }}
        searchValue={searchTerm}
        onSearch={handleSearchChange}
        filters={filters}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: '新增供应商',
            icon: <Plus style={{ width: 16, height: 16 }} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无供应商数据'
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedSupplier ? '编辑供应商' : '新增供应商'}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 2 }}
          >
            {selectedSupplier ? '修改供应商信息' : '填写新供应商信息'}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormField
                  name='name'
                  label='供应商名称 *'
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  size='small'
                  fullWidth
                />
                <FormField
                  name='short_name'
                  label='简称'
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
                  label='联系人'
                  value={formData.contact_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  size='small'
                  fullWidth
                />
                <FormField
                  name='contact_phone'
                  label='联系电话'
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
                  label='邮箱'
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
                  label='银行账户'
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
                label='地址'
                value={formData.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                size='small'
                fullWidth
              />
              <FormField
                name='tax_number'
                label='税号'
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
                  value={(formData as any).images || []}
                  onChange={(files) => setFormData({ ...formData, images: files } as any)}
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
