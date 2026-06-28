import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '@/api/erp';
import { erpApi } from '@/api/erp';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  User,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const CustomerManagementPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    customer_code: '',
    customer_name: '',
    short_name: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    country: '中国',
    province: '',
    city: '',
    zip_code: '',
    tax_number: '',
    bank_account: '',
    bank_name: '',
    credit_limit: 0,
    credit_rating: '',
    status: 'active',
    category: '',
    industry: '',
    remark: '',
  });

  const { addNotification } = useAppStore();

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (industryFilter !== 'all') params.industry = industryFilter;

      const response = await erpApi.customers.list(params);
      if (response.success && response.data) {
        setCustomers(response.data.customers || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载客户列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载客户列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, categoryFilter, industryFilter, addNotification]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedCustomer) {
        await erpApi.customers.update(selectedCustomer.id, formData as UpdateCustomerRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '客户信息已更新',
        });
      } else {
        await erpApi.customers.create(formData);
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
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedCustomer ? '更新客户失败' : '创建客户失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个客户吗?')) return;
      try {
        await erpApi.customers.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '客户已删除',
        });
        loadCustomers();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除客户',
        });
      }
    },
    [loadCustomers, addNotification]
  );

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      customer_code: customer.customer_code,
      customer_name: customer.customer_name,
      short_name: customer.short_name,
      contact_person: customer.contact_person,
      contact_phone: customer.contact_phone,
      contact_email: customer.contact_email,
      address: customer.address,
      country: customer.country,
      province: customer.province,
      city: customer.city,
      zip_code: customer.zip_code,
      tax_number: customer.tax_number,
      bank_account: customer.bank_account,
      bank_name: customer.bank_name,
      credit_limit: customer.credit_limit,
      credit_rating: customer.credit_rating,
      status: customer.status,
      category: customer.category,
      industry: customer.industry,
      remark: customer.remark,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedCustomer(null);
    setFormData({
      customer_code: '',
      customer_name: '',
      short_name: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      address: '',
      country: '中国',
      province: '',
      city: '',
      zip_code: '',
      tax_number: '',
      bank_account: '',
      bank_name: '',
      credit_limit: 0,
      credit_rating: '',
      status: 'active',
      category: '',
      industry: '',
      remark: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      active: { label: '正常合作', bg: 'success.lighter', color: '#15803d' },
      inactive: { label: '暂停合作', bg: 'grey.100', color: 'text.secondary' },
      blacklisted: { label: '黑名单', bg: 'error.lighter', color: 'error.dark' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<Customer>[] = useMemo(
    () => [
      { id: 'customer_code', label: '客户编码', sortable: true },
      { id: 'customer_name', label: '客户名称', sortable: true },
      { id: 'contact_person', label: '联系人' },
      { id: 'contact_phone', label: '联系电话' },
      { id: 'category', label: '客户分类' },
      { id: 'industry', label: '所属行业' },
      { id: 'credit_rating', label: '信用等级' },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '正常合作', value: 'active' },
          { label: '暂停合作', value: 'inactive' },
          { label: '黑名单', value: 'blacklisted' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        },
      },
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '大型企业', value: '大型企业' },
          { label: '中型企业', value: '中型企业' },
          { label: '小型企业', value: '小型企业' },
          { label: '政府机构', value: '政府机构' },
          { label: '个人客户', value: '个人客户' },
        ],
        value: categoryFilter,
        onChange: (value) => {
          setCategoryFilter(value);
          setCurrentPage(1);
        },
      },
      {
        id: 'industry',
        label: '行业',
        type: 'select',
        options: [
          { label: '全部行业', value: 'all' },
          { label: '电子制造', value: '电子制造' },
          { label: '机械制造', value: '机械制造' },
          { label: '化工', value: '化工' },
          { label: '金融', value: '金融' },
          { label: '互联网', value: '互联网' },
          { label: '医疗', value: '医疗' },
        ],
        value: industryFilter,
        onChange: (value) => {
          setIndustryFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, categoryFilter, industryFilter]
  );

  const rowActions: RowAction<Customer>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
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
    [handleViewDetail, handleEdit, handleDelete]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    const totalCredit = customers.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
    return {
      total: customers.length,
      active: customers.filter((c) => c.status === 'active').length,
      inactive: customers.filter((c) => c.status === 'inactive').length,
      totalCredit,
    };
  }, [customers]);

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          客户总数
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          正常合作
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {stats.active}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          暂停合作
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {stats.inactive}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          授信总额
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700, color: '#4338ca' }}>
          ¥{stats.totalCredit.toLocaleString('zh-CN')}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='客户管理'
      subtitle='管理客户基础信息，包括编码、名称、联系人、信用等级等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={customers}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索客户编码、名称或联系人...'
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: '新增客户',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无客户数据'
        getRowId={(row) => row.id}
      />

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth='lg'>
        <DialogTitle>{selectedCustomer ? '编辑客户' : '新增客户'}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedCustomer ? '修改客户信息' : '填写新客户信息'}
          </Box>
          <form onSubmit={handleSubmit}>
            <Typography variant='subtitle2' sx={{ mb: 1, mt: 1, fontWeight: 600 }}>
              基本信息
            </Typography>
            <Grid container spacing={2} sx={{ py: 1 }}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='customer_code'>客户编码 *</InputLabel>
                <TextField
                  id='customer_code'
                  required
                  size='small'
                  fullWidth
                  value={formData.customer_code}
                  onChange={(e) => setFormData({ ...formData, customer_code: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='customer_name'>客户名称 *</InputLabel>
                <TextField
                  id='customer_name'
                  required
                  size='small'
                  fullWidth
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='short_name'>简称</InputLabel>
                <TextField
                  id='short_name'
                  size='small'
                  fullWidth
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='category'>客户分类</InputLabel>
                <FormControl size='small' fullWidth>
                  <Select
                    id='category'
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <MenuItem value='大型企业'>大型企业</MenuItem>
                    <MenuItem value='中型企业'>中型企业</MenuItem>
                    <MenuItem value='小型企业'>小型企业</MenuItem>
                    <MenuItem value='政府机构'>政府机构</MenuItem>
                    <MenuItem value='个人客户'>个人客户</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='industry'>所属行业</InputLabel>
                <FormControl size='small' fullWidth>
                  <Select
                    id='industry'
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  >
                    <MenuItem value='电子制造'>电子制造</MenuItem>
                    <MenuItem value='机械制造'>机械制造</MenuItem>
                    <MenuItem value='化工'>化工</MenuItem>
                    <MenuItem value='金融'>金融</MenuItem>
                    <MenuItem value='互联网'>互联网</MenuItem>
                    <MenuItem value='医疗'>医疗</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl size='small' fullWidth>
                  <Select
                    id='status'
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='active'>正常合作</MenuItem>
                    <MenuItem value='inactive'>暂停合作</MenuItem>
                    <MenuItem value='blacklisted'>黑名单</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant='subtitle2' sx={{ mb: 1, mt: 2, fontWeight: 600 }}>
              联系信息
            </Typography>
            <Grid container spacing={2} sx={{ py: 1 }}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='contact_person'>联系人</InputLabel>
                <TextField
                  id='contact_person'
                  size='small'
                  fullWidth
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='contact_phone'>联系电话</InputLabel>
                <TextField
                  id='contact_phone'
                  size='small'
                  fullWidth
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InputLabel htmlFor='contact_email'>电子邮箱</InputLabel>
                <TextField
                  id='contact_email'
                  size='small'
                  fullWidth
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <InputLabel htmlFor='address'>详细地址</InputLabel>
                <TextField
                  id='address'
                  size='small'
                  fullWidth
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <InputLabel htmlFor='country'>国家</InputLabel>
                <TextField
                  id='country'
                  size='small'
                  fullWidth
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <InputLabel htmlFor='province'>省份</InputLabel>
                <TextField
                  id='province'
                  size='small'
                  fullWidth
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <InputLabel htmlFor='city'>城市</InputLabel>
                <TextField
                  id='city'
                  size='small'
                  fullWidth
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <InputLabel htmlFor='zip_code'>邮编</InputLabel>
                <TextField
                  id='zip_code'
                  size='small'
                  fullWidth
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </Grid>
            </Grid>

            <Typography variant='subtitle2' sx={{ mb: 1, mt: 2, fontWeight: 600 }}>
              财务与信用
            </Typography>
            <Grid container spacing={2} sx={{ py: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputLabel htmlFor='tax_number'>税号</InputLabel>
                <TextField
                  id='tax_number'
                  size='small'
                  fullWidth
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputLabel htmlFor='bank_name'>开户银行</InputLabel>
                <TextField
                  id='bank_name'
                  size='small'
                  fullWidth
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputLabel htmlFor='bank_account'>银行账号</InputLabel>
                <TextField
                  id='bank_account'
                  size='small'
                  fullWidth
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <InputLabel htmlFor='credit_limit'>信用额度</InputLabel>
                <TextField
                  id='credit_limit'
                  type='number'
                  size='small'
                  fullWidth
                  value={formData.credit_limit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credit_limit: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <InputLabel htmlFor='credit_rating'>信用等级</InputLabel>
                <FormControl size='small' fullWidth>
                  <Select
                    id='credit_rating'
                    value={formData.credit_rating}
                    onChange={(e) => setFormData({ ...formData, credit_rating: e.target.value })}
                  >
                    <MenuItem value='AAA'>AAA (极好)</MenuItem>
                    <MenuItem value='AA'>AA (优良)</MenuItem>
                    <MenuItem value='A'>A (良好)</MenuItem>
                    <MenuItem value='BBB'>BBB (一般)</MenuItem>
                    <MenuItem value='BB'>BB (较差)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <InputLabel htmlFor='remark'>备注</InputLabel>
              <TextField
                id='remark'
                size='small'
                multiline
                rows={2}
                fullWidth
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              />
            </Box>

            <DialogActions sx={{ mt: 3 }}>
              <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit' variant='contained'>
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth='lg'>
        <DialogTitle>客户详情</DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                基本信息
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>客户编码</InputLabel>
                  <Box component='span' sx={{ fontWeight: 500 }}>
                    {selectedCustomer.customer_code}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>客户名称</InputLabel>
                  <Box component='span'>{selectedCustomer.customer_name}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedCustomer.status)}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>客户分类</InputLabel>
                  <Box component='span'>{selectedCustomer.category || '-'}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>所属行业</InputLabel>
                  <Box component='span'>{selectedCustomer.industry || '-'}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>信用等级</InputLabel>
                  <Box component='span'>{selectedCustomer.credit_rating || '-'}</Box>
                </Grid>
              </Grid>

              <Typography variant='subtitle2' sx={{ fontWeight: 600, mt: 2 }}>
                联系信息
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>联系人</InputLabel>
                  <Box component='span'>{selectedCustomer.contact_person || '-'}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>联系电话</InputLabel>
                  <Box component='span'>{selectedCustomer.contact_phone || '-'}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>电子邮箱</InputLabel>
                  <Box component='span'>{selectedCustomer.contact_email || '-'}</Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>地址</InputLabel>
                  <Box component='span'>{selectedCustomer.address || '-'}</Box>
                </Grid>
              </Grid>

              <Typography variant='subtitle2' sx={{ fontWeight: 600, mt: 2 }}>
                财务与信用
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>税号</InputLabel>
                  <Box component='span'>{selectedCustomer.tax_number || '-'}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>开户银行</InputLabel>
                  <Box component='span'>{selectedCustomer.bank_name || '-'}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>银行账号</InputLabel>
                  <Box component='span'>{selectedCustomer.bank_account || '-'}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>信用额度</InputLabel>
                  <Box component='span'>
                    {selectedCustomer.credit_limit
                      ? `¥${selectedCustomer.credit_limit.toLocaleString('zh-CN')}`
                      : '-'}
                  </Box>
                </Grid>
              </Grid>

              {selectedCustomer.remark && (
                <>
                  <Typography variant='subtitle2' sx={{ fontWeight: 600, mt: 2 }}>
                    备注
                  </Typography>
                  <Box component='span'>{selectedCustomer.remark}</Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default CustomerManagementPage;
