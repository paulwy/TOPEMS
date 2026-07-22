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
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { Announcement, PaginationParams } from '@/api/erp';
import { announcementApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Save, Bell, Send } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const AnnouncementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    author: '',
    priority: 'normal',
    status: 'draft',
    publish_at: '',
  });

  const params: PaginationParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.ANNOUNCEMENTS, params],
    queryFn: async () => {
      const response = await announcementApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
  });

  const announcements = data?.items || [];
  const total = data?.total || 0;

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.ANNOUNCEMENTS });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Announcement>) => announcementApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '公告已添加' });
      invalidateData();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加公告失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Announcement> }) =>
      announcementApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '公告信息已更新' });
      invalidateData();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新公告失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '公告已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除公告' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => announcementApi.publish(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '发布成功', message: '公告已发布' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('发布失败:', error);
      addNotification({ type: 'error', title: '发布失败', message: '无法发布公告' });
    },
  });

  const getPriorityText = (priority: string) => {
    const priorityMap: Record<string, string> = {
      low: '低',
      normal: '中',
      high: '高',
      urgent: '紧急',
    };
    return priorityMap[priority] || priority;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      low: { label: '低', bg: 'grey.100', color: 'text.secondary' },
      normal: { label: '中', bg: 'secondary[100]', color: 'secondary.700' },
      high: { label: '高', bg: 'warning.light', color: 'warning.700' },
      urgent: { label: '紧急', bg: 'error.lighter', color: 'error.dark' },
      draft: { label: '草稿', bg: 'grey.100', color: 'text.secondary' },
      published: { label: '已发布', bg: 'success.lighter', color: 'success.700' },
      archived: { label: '已归档', bg: 'info.light', color: 'info.700' },
    };
    const s = priorityMap[priority] || { label: priority, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这条公告吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (item: Announcement) => {
    setSelectedItem(item);
    setFormData({
      title: item.title || '',
      content: item.content || '',
      author: item.author || '',
      priority: item.priority || 'normal',
      status: item.status || 'draft',
      publish_at: item.publish_at || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (item: Announcement) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const handlePublish = (id: string) => {
    if (!window.confirm('确定要发布这条公告吗?')) return;
    publishMutation.mutate(id);
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      title: '',
      content: '',
      author: '',
      priority: 'normal',
      status: 'draft',
      publish_at: '',
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const columns: ColumnDef<Announcement>[] = useMemo(
    () => [
      { id: 'title', label: '公告标题', sortable: true },
      {
        id: 'priority',
        label: '优先级',
        render: (row) => getPriorityBadge(row.priority || 'normal'),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getPriorityBadge(row.status),
      },
      {
        id: 'author',
        label: '发布人',
        render: (row) => row.author || '-',
      },
      {
        id: 'publish_at',
        label: '发布时间',
        render: (row) =>
          row.publish_at ? new Date(row.publish_at).toLocaleString('zh-CN') : '-',
      },
      {
        id: 'created_at',
        label: '创建时间',
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
          { label: '草稿', value: 'draft' },
          { label: '已发布', value: 'published' },
          { label: '已归档', value: 'archived' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '低', value: 'low' },
          { label: '中', value: 'normal' },
          { label: '高', value: 'high' },
          { label: '紧急', value: 'urgent' },
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

  const rowActions: RowAction<Announcement>[] = useMemo(
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
        label: '发布',
        icon: <Send size={16} />,
        color: 'success',
        onClick: (row) => handlePublish(row.id),
        confirm: true,
        confirmMessage: '确定要发布这条公告吗?',
        condition: (row: Announcement) => row.status === 'draft',
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条公告吗?',
      },
    ],
    []
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const publishedCount = announcements.filter((a) => a.status === 'published').length;
  const draftCount = announcements.filter((a) => a.status === 'draft').length;
  const urgentCount = announcements.filter((a) => a.priority === 'urgent').length;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Bell size={18} sx={{ color: 'secondary.700' }} />
          <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
            公告总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{announcements.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>已发布</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>{publishedCount}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>草稿</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>{draftCount}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>紧急公告</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>{urgentCount}</Box>
      </Box>
    </Box>
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Bell style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={announcements}
        loading={isLoading}
        filters={filters}
        searchable
        searchPlaceholder='搜索公告标题...'
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
            label: '新增公告',
            icon: <Save size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无公告数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>{selectedItem ? '编辑公告' : '新增公告'}</DialogTitle>
        <DialogContent>
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
                <InputLabel htmlFor='title'>公告标题 *</InputLabel>
                <TextField
                  id='title'
                  required
                  size='small'
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='author'>发布人</InputLabel>
                <TextField
                  id='author'
                  size='small'
                  value={formData.author || ''}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='priority'>优先级</InputLabel>
                <FormControl fullWidth size='small'>
                  <Select
                    id='priority'
                    value={formData.priority || 'normal'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <MenuItem value='low'>低</MenuItem>
                    <MenuItem value='normal'>中</MenuItem>
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='urgent'>紧急</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl fullWidth size='small'>
                  <Select
                    id='status'
                    value={formData.status || 'draft'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='draft'>草稿</MenuItem>
                    <MenuItem value='published'>已发布</MenuItem>
                    <MenuItem value='archived'>已归档</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='content'>公告内容 *</InputLabel>
                <TextField
                  id='content'
                  required
                  size='small'
                  multiline
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </Box>
            </Box>

            <DialogActions sx={{ mt: 2 }}>
              <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit' variant='contained' startIcon={<Save size={16} />}>
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>公告详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>标题</InputLabel>
                  <Box sx={{ fontWeight: 500, fontSize: 18 }}>{selectedItem.title}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getPriorityBadge(selectedItem.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>优先级</InputLabel>
                  <Box>{getPriorityBadge(selectedItem.priority || 'normal')}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>发布人</InputLabel>
                  <Box component='span'>{selectedItem.author || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>发布时间</InputLabel>
                  <Box component='span'>
                    {selectedItem.publish_at ? new Date(selectedItem.publish_at).toLocaleString('zh-CN') : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>{new Date(selectedItem.created_at).toLocaleString('zh-CN')}</Box>
                </Box>
              </Box>
              <Box>
                <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>公告内容</InputLabel>
                <Box component='div' sx={{ whiteSpace: 'pre-wrap', mt: 1, p: 2, bg: 'grey.50', borderRadius: 2 }}>
                  {selectedItem.content}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AnnouncementPage;