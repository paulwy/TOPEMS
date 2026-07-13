import React, { useState, useMemo } from 'react';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Eye, Edit, Trash2, Search } from 'lucide-react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Typography,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { limsApi } from '@/api/lims';
import type { TestMethod, CreateTestMethodRequest, UpdateTestMethodRequest } from '@/api/lims';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useCrudOperations } from '@/hooks/useCrudQueries';

const ct = designTokens.colors;

interface TestMethodForm extends CreateTestMethodRequest {
  status?: string;
}

const testMethodCrudApi = {
  list: (params?: Record<string, unknown>) => limsApi.listTestMethods(params as any),
  get: (id: string) => limsApi.getTestMethod(id),
  create: (data: CreateTestMethodRequest) => limsApi.createTestMethod(data),
  update: (id: string, data: UpdateTestMethodRequest) => limsApi.updateTestMethod(id, data),
  delete: (id: string) => limsApi.deleteTestMethod(id),
} as any;

const LimsTestMethodPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<TestMethod | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const initialFormData: TestMethodForm = {
    method_code: '',
    method_name: '',
    standard: '',
    description: '',
    status: '草稿',
  };

  const [formData, setFormData] = useState<TestMethodForm>(initialFormData);

  const {
    data: methods,
    loading,
    refresh,
    create: createMethod,
    update: updateMethod,
    delete: deleteMethod,
  } = useCrudOperations<TestMethod, CreateTestMethodRequest, UpdateTestMethodRequest>({
    api: testMethodCrudApi,
    queryKey: 'lims-test-methods',
    defaultPageSize: 100,
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      草稿: { bg: 'grey.100', color: 'text.secondary' },
      已发布: { bg: 'success.lighter', color: 'success.700' },
      已归档: { bg: 'primary.100', color: 'primary.dark' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const columns: ColumnDef<TestMethod>[] = [
    { id: 'method_code', label: '方法编号', sortable: true },
    { id: 'method_name', label: '方法名称', sortable: true },
    { id: 'category_name', label: '方法分类', render: (row) => row.category_name || '-' },
    { id: 'standard', label: '参考标准', render: (row) => row.standard || '-' },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    { id: 'version', label: '版本' },
    {
      id: 'updated_at',
      label: '更新时间',
      render: (row) =>
        row.updated_at ? new Date(row.updated_at).toLocaleDateString('zh-CN') : '-',
    },
  ];

  const handleView = (method: TestMethod) => {
    setSelectedMethod(method);
    setShowDetailModal(true);
  };

  const handleEdit = (method: TestMethod) => {
    setSelectedMethod(method);
    setIsEditing(true);
    setFormData({
      method_code: method.method_code,
      method_name: method.method_name,
      standard: method.standard || '',
      description: method.description || '',
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedMethod(null);
    setIsEditing(false);
    setFormData(initialFormData);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.method_code.trim() || !formData.method_name.trim()) {
      addNotification({
        title: '错误',
        message: '请输入方法编号和方法名称',
        type: 'error',
      });
      return;
    }

    if (isEditing && selectedMethod) {
      const updateData: UpdateTestMethodRequest = {
        method_name: formData.method_name,
        standard: formData.standard,
        description: formData.description,
      };
      await updateMethod(selectedMethod.id, updateData);
      setShowCreateModal(false);
    } else {
      await createMethod(formData);
      setShowCreateModal(false);
    }
  };

  const handleDelete = async (method: TestMethod) => {
    await deleteMethod(method.id);
  };

  const rowActions: RowAction<TestMethod>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      confirm: true,
      confirmMessage: '确定要删除该检测方法吗？',
      onClick: (row) => handleDelete(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'category',
      label: '方法分类',
      type: 'select',
      options: [
        { label: '全部分类', value: 'all' },
        { label: '理化分析', value: '理化分析' },
        { label: '微生物检测', value: '微生物检测' },
        { label: '仪器分析', value: '仪器分析' },
        { label: '感官检验', value: '感官检验' },
      ],
      value: categoryFilter,
      onChange: (value: unknown) => setCategoryFilter(value as string),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部状态', value: 'all' },
        { label: '草稿', value: '草稿' },
        { label: '已发布', value: '已发布' },
        { label: '已归档', value: '已归档' },
      ],
      value: statusFilter,
      onChange: (value: unknown) => setStatusFilter(value as string),
    },
  ];

  const filteredMethods = methods.filter((method) => {
    const matchesSearch =
      method.method_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.method_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || method.category_name === categoryFilter;
    const matchesStatus = statusFilter === 'all' || method.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const paginatedData = filteredMethods.slice(page * pageSize, page * pageSize + pageSize);

  const stats = {
    total: methods.length,
    draft: methods.filter((m) => m.status === '草稿').length,
    published: methods.filter((m) => m.status === '已发布').length,
    archived: methods.filter((m) => m.status === '已归档').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: ct.success[50] }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: ct.success[100],
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen sx={{ width: 20, height: 20, color: 'success.700' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                方法总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary[600]})`,
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen sx={{ width: 20, height: 20, color: ct.background.paper }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                草稿
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.draft}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${ct.success.main}, ${ct.success[600]})`,
                boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen sx={{ width: 20, height: 20, color: ct.background.paper }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已发布
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.published}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已归档
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.archived}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='检测方法管理'
      subtitle='Test Method Management'
      headerProps={{
        pageIcon: <BookOpen style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS' },
          { label: '检测方法管理' },
        ]}
        backButton={{ onClick: () => navigate(DASHBOARD_PATHS.dashboard) }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索方法编号或名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredMethods.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新增方法',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑检测方法' : '新增检测方法'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='方法编号 *'
                value={formData.method_code}
                onChange={(e) => setFormData({ ...formData, method_code: e.target.value })}
                placeholder='请输入方法编号'
                disabled={isEditing}
              />
              <TextField
                fullWidth
                label='方法名称 *'
                value={formData.method_name}
                onChange={(e) => setFormData({ ...formData, method_name: e.target.value })}
                placeholder='请输入方法名称'
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>方法分类</InputLabel>
              <Select
                value={formData.category_id || ''}
                label='方法分类'
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <MenuItem value=''>请选择分类</MenuItem>
                <MenuItem value='理化分析'>理化分析</MenuItem>
                <MenuItem value='微生物检测'>微生物检测</MenuItem>
                <MenuItem value='仪器分析'>仪器分析</MenuItem>
                <MenuItem value='感官检验'>感官检验</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label='参考标准'
              value={formData.standard || ''}
              onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
              placeholder='请输入参考标准编号'
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status || '草稿'}
                label='状态'
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value='草稿'>草稿</MenuItem>
                <MenuItem value='已发布'>已发布</MenuItem>
                <MenuItem value='已归档'>已归档</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label='描述'
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入方法描述'
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={loading}
            sx={{ bgcolor: ct.success[600] }}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>检测方法详情</DialogTitle>
        <DialogContent>
          {selectedMethod && (
            <Box sx={{ pt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  方法编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedMethod.method_code}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  方法名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedMethod.method_name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  方法分类
                </Box>
                <Box>{selectedMethod.category_name || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  参考标准
                </Box>
                <Box>{selectedMethod.standard || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  版本
                </Box>
                <Box>{selectedMethod.version || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedMethod.status)}</Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  描述
                </Box>
                <Box>{selectedMethod.description || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  创建时间
                </Box>
                <Box>
                  {selectedMethod.created_at
                    ? new Date(selectedMethod.created_at).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  更新时间
                </Box>
                <Box>
                  {selectedMethod.updated_at
                    ? new Date(selectedMethod.updated_at).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            color='error'
            startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
            onClick={() => selectedMethod && handleDelete(selectedMethod)}
          >
            删除
          </Button>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedMethod) handleEdit(selectedMethod);
            }}
            sx={{ bgcolor: ct.success[600] }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default LimsTestMethodPage;
