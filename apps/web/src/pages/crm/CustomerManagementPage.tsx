import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box,
  Typography,
  Grid,
  OutlinedInput,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { StatusBadge, Hidden, ConfirmDialog } from '@topems/shared-components';
import { useResponsive } from '@/hooks/useResponsive';
import { useConfirmDialog, useCrudMutations, useUrlListState } from '@/hooks';
import {
  FormField,
  FormSelect,
  ActionButton,
  PageContainer,
  DataExport,
} from '@/components/common';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest, Tag } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { Plus, Edit, Trash2, Eye, Download, Upload, Tag as TagIcon, Users } from 'lucide-react';
import { CRM_PATHS } from '@/modules/crm/config';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const customerColumns = [
  { key: 'name', title: '客户名称' },
  { key: 'code', title: '客户代码' },
  { key: 'industry', title: '行业' },
  { key: 'companysize', title: '公司规模' },
  { key: 'customer_type', title: '客户类型' },
  { key: 'rating', title: '评级' },
  { key: 'phone', title: '电话' },
  { key: 'email', title: '邮箱' },
  { key: 'status', title: '状态' },
  { key: 'created_at', title: '创建时间' },
];

const companySizes = [
  { value: '', label: '请选择' },
  { value: 'micro', label: '微型 (<10人)' },
  { value: 'small', label: '小型 (10-50人)' },
  { value: 'medium', label: '中型 (50-200人)' },
  { value: 'large', label: '大型 (200-1000人)' },
  { value: 'enterprise', label: '集团 (>1000人)' },
];

const customerTypes = [
  { value: '', label: '请选择' },
  { value: 'potential', label: '潜在客户' },
  { value: 'active', label: '活跃客户' },
  { value: 'inactive', label: '非活跃客户' },
  { value: 'churned', label: '流失客户' },
];

const customerSources = [
  { value: '', label: '请选择' },
  { value: 'website', label: '官网' },
  { value: 'referral', label: '转介绍' },
  { value: 'campaign', label: '营销活动' },
  { value: 'trade_show', label: '展会' },
  { value: 'direct_sales', label: '直销' },
  { value: 'other', label: '其他' },
];

const ratingOptions = [
  { value: '', label: '请选择' },
  { value: 'A', label: 'A - 优秀' },
  { value: 'B', label: 'B - 良好' },
  { value: 'C', label: 'C - 一般' },
  { value: 'D', label: 'D - 较差' },
];

const CustomerManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // URL 同步的列表状态（搜索、分页、筛选）
  const listState = useUrlListState<{
    status: string;
    customer_type: string;
    rating: string;
    industry: string;
  }>({
    defaultSearch: '',
    defaultPageSize: 20,
    defaultFilters: {
      status: '',
      customer_type: '',
      rating: '',
      industry: '',
    },
    historyMode: 'replace',
  });

  const {
    searchQuery,
    debouncedSearch,
    currentPage,
    pageSize,
    filters: urlFilters,
    setSearchQuery,
    setCurrentPage,
    setPageSize,
    setFilter,
    setFilters,
  } = listState;
  const searchTerm = debouncedSearch;

  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [customerTags, setCustomerTags] = useState<Tag[]>([]);
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: '',
    code: '',
    industry: '',
    companysize: '',
    website: '',
    email: '',
    phone: '',
    fax: '',
    address: '',
    city: '',
    province: '',
    country: '',
    postal_code: '',
    customer_type: '',
    source: '',
    rating: '',
    revenue: undefined,
    employee_count: undefined,
    notes: '',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  // React Query - 客户列表
  const customersQuery = useQuery({
    queryKey: [
      'crm-customers',
      currentPage,
      pageSize,
      searchTerm,
      urlFilters.status,
      urlFilters.customer_type,
      urlFilters.rating,
      urlFilters.industry,
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (urlFilters.status) params.status = urlFilters.status;
      if (urlFilters.customer_type) params.customer_type = urlFilters.customer_type;
      if (urlFilters.rating) params.rating = urlFilters.rating;
      if (urlFilters.industry) params.industry = urlFilters.industry;
      return crmApi.customers.list(params);
    },
    staleTime: 5 * 60 * 1000,
  });

  const customers =
    customersQuery.data?.success && customersQuery.data.data
      ? customersQuery.data.data.items || []
      : [];
  const total =
    customersQuery.data?.success && customersQuery.data.data
      ? customersQuery.data.data.total || 0
      : 0;
  const loading = customersQuery.isLoading;

  // React Query - 所有标签
  const allTagsQuery = useQuery({
    queryKey: ['crm-tags'],
    queryFn: () => crmApi.tags.list(),
    staleTime: 30 * 60 * 1000,
  });

  const allTags =
    allTagsQuery.data?.success && allTagsQuery.data.data ? allTagsQuery.data.data.items || [] : [];

  // React Query - Mutations
  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<
    CreateCustomerRequest,
    UpdateCustomerRequest,
    string
  >({
    queryKeyToInvalidate: ['crm-customers'],
    createFn: async (data) => crmApi.customers.create(data),
    updateFn: async ({ id, data }) => crmApi.customers.update(String(id), data),
    deleteFn: async (id) => crmApi.customers.delete(String(id)),
    entityName: '客户',
  });

  const loadCustomerTags = async (customerId: string) => {
    try {
      const response = await crmApi.customers.getTags(customerId);
      if (response.success) {
        setCustomerTags(response.data || []);
      }
    } catch (error: unknown) {
      logger.error('加载客户标签失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedCustomer) {
        await updateMutation.mutateAsync({
          id: selectedCustomer.id,
          data: formData as UpdateCustomerRequest,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch (error: unknown) {
      logger.error('操作失败:', error);
    }
  };

  const handleDelete = (id: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个客户吗?',
      danger: true,
      onConfirm: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        await crmApi.customers.delete(id);
      }
      addNotification({
        type: 'success',
        title: '批量删除成功',
        message: `已删除 ${selectedIds.length} 个客户`,
      });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['crm-customers'] });
    } catch (error: unknown) {
      logger.error('批量删除失败:', error);
      addNotification({
        type: 'error',
        title: '批量删除失败',
        message: '部分客户删除失败',
      });
    }
  }, [selectedIds, addNotification, queryClient]);

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      code: customer.code || '',
      industry: customer.industry || '',
      companysize: customer.companysize || '',
      website: customer.website || '',
      email: customer.email || '',
      phone: customer.phone || '',
      fax: customer.fax || '',
      address: customer.address || '',
      city: customer.city || '',
      province: customer.province || '',
      country: customer.country || '',
      postal_code: customer.postal_code || '',
      customer_type: customer.customer_type || '',
      source: customer.source || '',
      rating: customer.rating || '',
      revenue: customer.revenue,
      employee_count: customer.employee_count,
      notes: customer.notes || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (customer: Customer) => {
    navigate(CRM_PATHS.customerDetail.replace(':id', customer.id));
  };

  const handleManageTags = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await loadCustomerTags(customer.id);
    setShowTagDialog(true);
  };

  const handleAddTag = async (tagId: string) => {
    if (!selectedCustomer) return;
    try {
      await crmApi.customers.addTag(selectedCustomer.id, tagId);
      await loadCustomerTags(selectedCustomer.id);
      addNotification({
        type: 'success',
        title: '添加成功',
        message: '标签已添加',
      });
    } catch (error: unknown) {
      logger.error('添加标签失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '添加标签失败',
      });
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!selectedCustomer) return;
    try {
      await crmApi.customers.removeTag(selectedCustomer.id, tagId);
      await loadCustomerTags(selectedCustomer.id);
      addNotification({
        type: 'success',
        title: '移除成功',
        message: '标签已移除',
      });
    } catch (error: unknown) {
      logger.error('移除标签失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '移除标签失败',
      });
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setFormData({
      name: '',
      code: '',
      industry: '',
      companysize: '',
      website: '',
      email: '',
      phone: '',
      fax: '',
      address: '',
      city: '',
      province: '',
      country: '',
      postal_code: '',
      customer_type: '',
      source: '',
      rating: '',
      revenue: undefined,
      employee_count: undefined,
      notes: '',
    });
  };

  const getStatusChip = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      active: { label: '活跃', color: 'success' },
      inactive: { label: '非活跃', color: 'default' },
      prospect: { label: '潜在', color: 'info' },
    };
    const s = statusMap[status] || { label: status, color: 'default' };
    return (
      <StatusBadge
        status={status}
        label={s.label}
        color={s.color}
        size='sm'
      />
    );
  };

  const getCustomerTypeChip = (customerType: string | undefined) => {
    const typeMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      potential: { label: '潜在', color: 'info' },
      active: { label: '活跃', color: 'success' },
      inactive: { label: '非活跃', color: 'default' },
      churned: { label: '流失', color: 'error' },
    };
    if (!customerType) return '-';
    const t = typeMap[customerType] || {
      label: customerType,
      color: 'default',
    };
    return (
      <StatusBadge
        status={customerType}
        label={t.label}
        color={t.color}
        size='sm'
      />
    );
  };

  const getRatingChip = (rating: string | undefined) => {
    const ratingMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      A: { label: 'A', color: 'success' },
      B: { label: 'B', color: 'primary' },
      C: { label: 'C', color: 'warning' },
      D: { label: 'D', color: 'error' },
    };
    if (!rating) return '-';
    const r = ratingMap[rating] || { label: rating, color: 'default' };
    return (
      <StatusBadge
        status={rating}
        label={r.label}
        color={r.color}
        size='sm'
      />
    );
  };

  const getCompanySizeLabel = (size: string | undefined) => {
    const sizeMap: Record<string, string> = {
      micro: '微型',
      small: '小型',
      medium: '中型',
      large: '大型',
      enterprise: '集团',
    };
    return sizeMap[size || ''] || size || '-';
  };

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => {
      const baseColumns = [
        {
          id: 'name',
          label: '客户名称',
          render: (row: Customer) => (
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.name}
            </Typography>
          ),
        },
        {
          id: 'customer_type',
          label: '客户类型',
          render: (row: Customer) => getCustomerTypeChip(row.customer_type),
        },
        {
          id: 'status',
          label: '状态',
          render: (row: Customer) => getStatusChip(row.status),
        },
      ];

      if (isMobile) {
        return baseColumns;
      }

      if (isTablet) {
        return [
          ...baseColumns.slice(0, 1),
          {
            id: 'code',
            label: '客户代码',
            render: (row) => row.code || '-',
          },
          ...baseColumns.slice(1),
          {
            id: 'rating',
            label: '评级',
            render: (row) => getRatingChip(row.rating),
          },
        ];
      }

      return [
        ...baseColumns.slice(0, 1),
        {
          id: 'code',
          label: '客户代码',
          render: (row) => row.code || '-',
        },
        {
          id: 'industry',
          label: '行业',
          render: (row) => row.industry || '-',
        },
        ...baseColumns.slice(1),
        {
          id: 'rating',
          label: '评级',
          render: (row) => getRatingChip(row.rating),
        },
        {
          id: 'phone',
          label: '电话',
          render: (row) => row.phone || '-',
        },
        {
          id: 'email',
          label: '邮箱',
          render: (row) => row.email || '-',
        },
      ];
    },
    [isMobile, isTablet]
  );

  const rowActions = useMemo<RowAction<Customer>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '标签',
        icon: <TagIcon size={16} />,
        onClick: (row) => handleManageTags(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个客户吗?',
      },
    ],

    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '非活跃' },
          { value: 'prospect', label: '潜在' },
        ],
        value: urlFilters.status,
        onChange: (value) => {
          setFilter('status', value as string);
        },
      },
      {
        id: 'customer_type',
        label: '客户类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'potential', label: '潜在客户' },
          { value: 'active', label: '活跃客户' },
          { value: 'inactive', label: '非活跃客户' },
          { value: 'churned', label: '流失客户' },
        ],
        value: urlFilters.customer_type,
        onChange: (value) => {
          setFilter('customer_type', value as string);
        },
      },
      {
        id: 'rating',
        label: '评级',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'A', label: 'A - 优秀' },
          { value: 'B', label: 'B - 良好' },
          { value: 'C', label: 'C - 一般' },
          { value: 'D', label: 'D - 较差' },
        ],
        value: urlFilters.rating,
        onChange: (value) => {
          setFilter('rating', value as string);
        },
      },
    ],
    [urlFilters.status, urlFilters.customer_type, urlFilters.rating, setFilter]
  );

  const availableTags = allTags.filter((tag) => !customerTags.some((ct) => ct.id === tag.id));

  return (
    <PageContainer
      title='客户管理'
      subtitle='管理客户信息，包括客户基本信息、联系方式、分类和标签等'
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Users style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary.dark})`,
      }}
    >
      <>
        <ListPageTemplate<Customer>
          title=''
          subtitle=''
          backButton={{
            href: '/dashboard',
          }}
          columns={columns}
          data={customers}
          loading={loading}
          searchable
          searchPlaceholder='搜索客户名称或代码...'
          searchValue={searchQuery}
          onSearch={(value) => {
            setSearchQuery(value);
          }}
          filters={filters}
          rowActions={rowActions}
          pagination={{
            page: currentPage - 1,
            pageSize,
            total,
            onPageChange: (page) => {
              setCurrentPage(page + 1);
            },
            onPageSizeChange: (newPageSize) => {
              setPageSize(newPageSize);
            },
          }}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
          batchActions={[
            {
              label: '批量删除',
              icon: <Trash2 size={16} />,
              color: 'error',
              confirm: true,
              confirmMessage: '确定要删除选中的客户吗？',
              onClick: handleBatchDelete,
            },
          ]}
          actions={[
            {
              label: '导入',
              icon: <Upload size={18} />,
              onClick: () => {},
              variant: 'outlined',
            },
            {
              label: '新建客户',
              icon: <Plus size={18} />,
              onClick: () => {
                resetForm();
                setShowDialog(true);
              },
              variant: 'contained',
            },
          ]}
          headerContent={
            <DataExport
              data={customers as unknown as Record<string, unknown>[]}
              fields={customerColumns}
              defaultFileName='客户数据'
              buttonText=''
            />
          }
          exportable
          exportFileName='客户列表'
          emptyActionButton={{
            label: '新建客户',
            icon: <Plus size={18} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
          }}
        />

        <Dialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          maxWidth={isMobile ? 'sm' : 'lg'}
          fullWidth={isMobile}
        >
          <DialogTitle>{selectedCustomer ? '编辑客户' : '新建客户'}</DialogTitle>
          <DialogContent>
            <Box
              component='form'
              onSubmit={handleSubmit}
              sx={{ mt: 2 }}
            >
              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='name'
                    label='客户名称'
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='code'
                    label='客户代码'
                    value={formData.code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value }))
                    }
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormSelect
                    name='customer_type'
                    label='客户类型'
                    value={formData.customer_type}
                    options={customerTypes.filter((c) => c.value !== undefined)}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        customer_type: value as string,
                      }))
                    }
                    placeholder='请选择客户类型'
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormSelect
                    name='rating'
                    label='评级'
                    value={formData.rating}
                    options={ratingOptions.filter((r) => r.value !== undefined)}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        rating: value as string,
                      }))
                    }
                    placeholder='请选择评级'
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='industry'
                    label='行业'
                    value={formData.industry}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        industry: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormSelect
                    name='companysize'
                    label='公司规模'
                    value={formData.companysize}
                    options={companySizes.filter((c) => c.value !== undefined)}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        companysize: value as string,
                      }))
                    }
                    placeholder='请选择公司规模'
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='source'
                    label='客户来源'
                    value={formData.source}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, source: e.target.value }))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='employee_count'
                    label='员工数量'
                    type='number'
                    value={formData.employee_count || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        employee_count: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='revenue'
                    label='年营收(元)'
                    type='number'
                    value={formData.revenue || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        revenue: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='website'
                    label='网站'
                    value={formData.website}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='email'
                    label='邮箱'
                    type='email'
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='phone'
                    label='电话'
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='fax'
                    label='传真'
                    value={formData.fax}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, fax: e.target.value }))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='postal_code'
                    label='邮编'
                    value={formData.postal_code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        postal_code: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <FormField
                    name='country'
                    label='国家'
                    value={formData.country}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormField
                    name='province'
                    label='省份'
                    value={formData.province}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        province: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormField
                    name='city'
                    label='城市'
                    value={formData.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormField
                    name='address'
                    label='详细地址'
                    value={formData.address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormField
                    name='notes'
                    label='备注'
                    value={formData.notes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    fullWidth
                    multiline
                    rows={3}
                  />
                </Grid>
              </Grid>
              <DialogActions>
                <ActionButton
                  label='取消'
                  variant='secondary'
                  onClick={() => setShowDialog(false)}
                />
                <ActionButton
                  label={selectedCustomer ? '保存修改' : '创建客户'}
                  variant='primary'
                  type='submit'
                />
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showTagDialog}
          onClose={() => setShowTagDialog(false)}
          maxWidth={isMobile ? 'sm' : 'md'}
          fullWidth={isMobile}
        >
          <DialogTitle>管理客户标签 - {selectedCustomer?.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='subtitle2'
                sx={{ mb: 2 }}
              >
                已添加的标签
              </Typography>
              {customerTags.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                  {customerTags.map((tag) => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                      onDelete={() => handleRemoveTag(tag.id)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography
                  variant='body2'
                  color='textSecondary'
                  sx={{ mb: 4 }}
                >
                  暂无标签，点击下方标签添加
                </Typography>
              )}

              <Typography
                variant='subtitle2'
                sx={{ mb: 2 }}
              >
                可用标签
              </Typography>
              {availableTags.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableTags.map((tag) => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                      onClick={() => handleAddTag(tag.id)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography
                  variant='body2'
                  color='textSecondary'
                >
                  暂无可用标签
                </Typography>
              )}
            </Box>
            <DialogActions>
              <ActionButton
                label='关闭'
                variant='secondary'
                onClick={() => setShowTagDialog(false)}
              />
            </DialogActions>
          </DialogContent>
        </Dialog>
      </>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default CustomerManagementPage;

// Phase 7-2: React Query migration tagged
