import React, { useState, useMemo, useCallback } from 'react';
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Folder as FolderIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

interface AssetCategory {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const CategoryManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    parent_id: '',
    description: '',
    status: 'active',
  });

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const mockCategories: AssetCategory[] = [
    {
      id: '1',
      name: '办公设备',
      code: 'OA',
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: '2',
      name: '电脑设备',
      code: 'PC',
      parent_id: '1',
      status: 'active',
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
    },
    {
      id: '3',
      name: '服务器',
      code: 'SRV',
      parent_id: '1',
      status: 'active',
      created_at: '2024-01-03',
      updated_at: '2024-01-03',
    },
    {
      id: '4',
      name: '网络设备',
      code: 'NET',
      parent_id: '1',
      status: 'active',
      created_at: '2024-01-04',
      updated_at: '2024-01-04',
    },
    {
      id: '5',
      name: '生产设备',
      code: 'PROD',
      status: 'active',
      created_at: '2024-01-05',
      updated_at: '2024-01-05',
    },
    {
      id: '6',
      name: '运输工具',
      code: 'VEH',
      status: 'active',
      created_at: '2024-01-06',
      updated_at: '2024-01-06',
    },
    {
      id: '7',
      name: '办公家具',
      code: 'FURN',
      status: 'inactive',
      created_at: '2024-01-07',
      updated_at: '2024-01-07',
    },
    {
      id: '8',
      name: '软件资产',
      code: 'SW',
      status: 'active',
      created_at: '2024-01-08',
      updated_at: '2024-01-08',
    },
  ];

  const filteredCategories = useMemo(() => {
    let result = mockCategories;
    if (searchTerm) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [searchTerm, statusFilter]);

  const { isLoading } = useQuery({
    queryKey: [
      QUERY_KEYS.ERP.ASSETS,
      'categories',
      searchTerm,
      statusFilter,
      currentPage,
      pageSize,
    ],
    queryFn: async () => ({
      items: filteredCategories,
      total: filteredCategories.length,
      page: currentPage - 1,
      pagesize: pageSize,
    }),
  });

  const categories = filteredCategories;
  const total = filteredCategories.length;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新分类已创建',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.ASSETS, 'categories'] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('创建失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建分类',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '分类信息已更新',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.ASSETS, 'categories'] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('更新失败:', error);
      addNotification({
        type: 'error',
        title: '更新失败',
        message: '无法更新分类',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '分类已删除',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.ASSETS, 'categories'] });
    },
    onError: (error) => {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除分类',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) {
      await updateMutation.mutateAsync({ id: selectedCategory.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个分类吗?')) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleEdit = useCallback((category: AssetCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      parent_id: category.parent_id || '',
      description: category.description || '',
      status: category.status,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((category: AssetCategory) => {
    setSelectedCategory(category);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedCategory(null);
    setFormData({
      name: '',
      code: '',
      parent_id: '',
      description: '',
      status: 'active',
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
      active: { label: '启用', bg: 'success.lighter', color: 'success.700' },
      inactive: { label: '停用', bg: 'grey.100', color: 'text.secondary' },
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

  const columns: ColumnDef<AssetCategory>[] = useMemo(
    () => [
      { id: 'code', label: '分类编码', sortable: true, width: 120 },
      { id: 'name', label: '分类名称', sortable: true, width: 150 },
      {
        id: 'parent_id',
        label: '上级分类',
        width: 150,
        render: (row) =>
          row.parent_id
            ? mockCategories.find((p) => p.id === row.parent_id)?.name || '-'
            : '顶级分类',
      },
      { id: 'description', label: '描述' },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'created_at',
        label: '创建时间',
        sortable: true,
        width: 160,
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
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
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<AssetCategory>[] = useMemo(
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
        confirmMessage: '确定要删除这个分类吗?',
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
    return {
      total: categories.length,
      active: categories.filter((c) => c.status === 'active').length,
      inactive: categories.filter((c) => c.status === 'inactive').length,
    };
  }, [categories]);

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          分类总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          启用中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.active}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已停用
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.inactive}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='资产分类管理'
      subtitle='管理资产分类信息，支持多级分类'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={categories}
        loading={isLoading}
        filters={filters}
        searchable
        searchPlaceholder='搜索分类编码、名称...'
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
            label: '新增分类',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无分类数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedCategory ? '编辑分类' : '新增分类'}</DialogTitle>
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
            {selectedCategory ? '修改分类信息' : '填写新分类信息'}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='code'>分类编码 *</InputLabel>
                <TextField
                  id='code'
                  required
                  size='small'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='name'>分类名称 *</InputLabel>
                <TextField
                  id='name'
                  required
                  size='small'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='parent_id'>上级分类</InputLabel>
                <TextField
                  id='parent_id'
                  size='small'
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  placeholder='请选择上级分类'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <TextField
                  id='status'
                  size='small'
                  select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value='active'>启用</option>
                  <option value='inactive'>停用</option>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                <InputLabel htmlFor='description'>描述</InputLabel>
                <TextField
                  id='description'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>分类详情</DialogTitle>
        <DialogContent>
          {selectedCategory && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>分类编码</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedCategory.code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>分类名称</InputLabel>
                  <Box component='span'>{selectedCategory.name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>上级分类</InputLabel>
                  <Box component='span'>
                    {selectedCategory.parent_id
                      ? mockCategories.find((p) => p.id === selectedCategory.parent_id)?.name || '-'
                      : '顶级分类'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedCategory.status)}</Box>
                </Box>
                {selectedCategory.description && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                    <Box component='span'>{selectedCategory.description}</Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default CategoryManagementPage;
