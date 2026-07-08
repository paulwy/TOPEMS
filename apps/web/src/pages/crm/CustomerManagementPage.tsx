import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import {
  FormField,
  FormSelect,
  ActionButton,
  PageContainer,
  DataExport,
} from '@/components/common';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest, Tag } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';
import { Plus, Edit, Trash2, Eye, Download, Upload, Tag as TagIcon, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';
const ct = designTokens.colors;

/**
 * TODO: Phase 7-4 -- 虚拟滚动优化
 *
 * 当列表数据超过 100 条时，建议使用虚拟滚动提升渲染性能:
 *
 * 方案 1: @tanstack/react-virtual
 *   import { useVirtualizer } from '@tanstack/react-virtual';
 *   const virtualizer = useVirtualizer({ count: data.length, getScrollElement: () => parentRef.current });
 *
 * 方案 2: react-virtuoso (MUI 友好)
 *   import { TableVirtuoso } from 'react-virtuoso';
 *   <TableVirtuoso data={data} components={{ TableBody, TableRow, TableCell }} />
 *
 * 当前预估数据量: 客户列表 (企业级数据量)
 */

/**
 * TODO: Phase 7-2 — React Query 迁移
 *
 * 模块: 客户管理 (CustomerManagementPage)
 *
 * 1. 将 useState(loading) + useState(data) + useEffect(fetch) 替换为 useQuery:
 *    const { data: response, isLoading, error, refetch } = useQuery({
 *      queryKey: ['crm-customers', page, rowsPerPage, searchText],
 *      queryFn: () => crmApi.getList({ page: page + 1, pageSize: rowsPerPage, keyword: searchText }),
 *      placeholderData: (prev) => prev,
 *    });
 *    const data = response?.data?.items || [];
 *    const total = response?.data?.total || 0;
 *
 * 2. 将 create/update/delete handler 中的 setState + API 调用替换为 useMutation:
 *    const queryClient = useQueryClient();
 *    const deleteMutation = useMutation({
 *      mutationFn: (id: string) => crmApi.delete(id),
 *      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-customers'] }),
 *    });
 *
 * 3. 保留 UI 状态（page, rowsPerPage, searchText, dialogOpen 等）的 useState
 */
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [customerTags, setCustomerTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
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
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 20,
    total: 0,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadCustomers();
  }, [
    searchTerm,
    statusFilter,
    customerTypeFilter,
    ratingFilter,
    industryFilter,
    pagination.page,
    pagination.pageSize,
  ]);

  useEffect(() => {
    loadAllTags();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: pagination.page + 1,
        pagesize: pagination.pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (customerTypeFilter) params.customer_type = customerTypeFilter;
      if (ratingFilter) params.rating = ratingFilter;
      if (industryFilter) params.industry = industryFilter;

      const response = await crmApi.customers.list(params);
      if (response.success && response.data) {
        setCustomers(response.data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data?.total || 0,
        }));
      }
    } catch (error: unknown) {
      logger.error('加载客户列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载客户列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllTags = async () => {
    try {
      const response = await crmApi.tags.list();
      if (response.success && response.data) {
        setAllTags(response.data.items || []);
      }
    } catch (error: unknown) {
      logger.error('加载标签列表失败:', error);
    }
  };

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
        await crmApi.customers.update(selectedCustomer.id, formData as UpdateCustomerRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '客户信息已更新',
        });
      } else {
        await crmApi.customers.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新客户已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadCustomers();
    } catch (error: unknown) {
      logger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedCustomer ? '更新客户失败' : '创建客户失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个客户吗?')) return;
    try {
      await crmApi.customers.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '客户已删除',
      });
      loadCustomers();
    } catch (error: unknown) {
      logger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除客户',
      });
    }
  };

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
    navigate(`/crm/customers/${customer.id}`);
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
      <Chip
        label={s.label}
        color={s.color}
        size='small'
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
      <Chip
        label={t.label}
        color={t.color}
        size='small'
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
      <Chip
        label={r.label}
        color={r.color}
        size='small'
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
    () => [
      {
        id: 'name',
        label: '客户名称',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.name}
          </Typography>
        ),
      },
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
      {
        id: 'customer_type',
        label: '客户类型',
        render: (row) => getCustomerTypeChip(row.customer_type),
      },
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
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusChip(row.status),
      },
    ],
    []
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
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
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
        value: customerTypeFilter,
        onChange: (value) => {
          setCustomerTypeFilter(value as string);
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
        value: ratingFilter,
        onChange: (value) => {
          setRatingFilter(value as string);
        },
      },
    ],
    [statusFilter, customerTypeFilter, ratingFilter]
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
          searchValue={searchTerm}
          onSearch={(value) => {
            setSearchTerm(value);
          }}
          filters={filters}
          rowActions={rowActions}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: (page) => {
              setPagination((prev) => ({ ...prev, page }));
            },
            onPageSizeChange: (pageSize) => {
              setPagination((prev) => ({ ...prev, pageSize, page: 0 }));
            },
          }}
          actions={[
            {
              label: '导入',
              icon: <Upload size={18} />,
              onClick: () => {},
              variant: 'outlined',
            },
            {
              label: '导出',
              icon: <Download size={18} />,
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
        />

        <Dialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          maxWidth='lg'
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='code'
                    label='客户代码'
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
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
                    onChange={(e) =>
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='employee_count'
                    label='员工数量'
                    type='number'
                    value={formData.employee_count || ''}
                    onChange={(e) =>
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
                    onChange={(e) =>
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
                    onChange={(e) =>
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='phone'
                    label='电话'
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='fax'
                    label='传真'
                    value={formData.fax}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fax: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormField
                    name='postal_code'
                    label='邮编'
                    value={formData.postal_code}
                    onChange={(e) =>
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
                    onChange={(e) =>
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
                    onChange={(e) =>
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormField
                    name='address'
                    label='详细地址'
                    value={formData.address}
                    onChange={(e) =>
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
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
          maxWidth='md'
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
    </PageContainer>
  );
};

export default CustomerManagementPage;

// Phase 7-2: React Query migration tagged
