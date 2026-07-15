import { Box, Typography, Chip, IconButton, Tooltip, Stack } from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import {
  FolderOpen,
  Upload,
  FolderPlus,
  RefreshCw,
  Search,
  FileText,
  FileSpreadsheet,
  File,
  Image,
  Eye,
  Download,
  Share2,
  Trash2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotificationStore } from '@/store';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { designTokens } from '@/theme/tokens';
import { docApi, type FileMetadata } from '@/api/doc';
import { apiLogger } from '@/utils/logger';

const ct = designTokens.colors;

const getFileType = (contentType: string): string => {
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('word') || contentType.includes('doc')) return 'word';
  if (contentType.includes('sheet') || contentType.includes('excel')) return 'excel';
  if (contentType.includes('presentation') || contentType.includes('ppt')) return 'ppt';
  if (contentType.startsWith('image/')) return 'image';
  return 'pdf';
};

const TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  ppt: 'PPT',
  image: '图片',
};

const TYPE_COLORS: Record<string, string> = {
  pdf: 'error.main',
  word: 'primary.main',
  excel: 'success.main',
  ppt: 'warning.main',
  image: 'secondary.main',
};

const getFileIcon = (type: string) => {
  const color = TYPE_COLORS[type] || ct.grey[500];
  switch (type) {
    case 'pdf':
      return (
        <FileText
          size={20}
          style={{ color }}
        />
      );
    case 'word':
      return (
        <File
          size={20}
          style={{ color }}
        />
      );
    case 'excel':
      return (
        <FileSpreadsheet
          size={20}
          style={{ color }}
        />
      );
    case 'ppt':
      return (
        <File
          size={20}
          style={{ color }}
        />
      );
    case 'image':
      return (
        <Image
          size={20}
          style={{ color }}
        />
      );
    default:
      return (
        <File
          size={20}
          style={{ color }}
        />
      );
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const DocumentListPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const { data: files = [], isLoading: loading } = useQuery({
    queryKey: ['document-list'],
    queryFn: async () => {
      const response = await docApi.list();
      if (response.success && response.data?.files) {
        return response.data.files;
      }
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => docApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-list'] });
    },
  });

  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

  const documents = useMemo(() => {
    return files.map((f: FileMetadata) => ({
      id: f.id,
      name: f.name,
      type: getFileType(f.content_type || ''),
      size: formatFileSize(f.size || 0),
      folder: f.folder_id || '根目录',
      category: 'work' as const,
      updatedAt: new Date(f.updated_at).toLocaleString('zh-CN'),
    }));
  }, [files]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (typeFilter !== 'all' && doc.type !== typeFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [documents, searchQuery, typeFilter, categoryFilter]);

  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage, pageSize]);

  const total = filteredDocuments.length;

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['document-list'] });
    addNotification({
      title: '成功',
      message: '刷新成功',
      type: 'success',
    });
  }, [addNotification, queryClient]);

  const handleDelete = useCallback(
    (doc: { id: string; name: string }) => {
      openConfirmDialog({
        title: '确认删除',
        message: `确定要删除文档"${doc.name}"吗？此操作可以在回收站中恢复。`,
        danger: true,
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync(doc.id);
            addNotification({
              title: '成功',
              message: '文档已删除',
              type: 'success',
            });
          } catch (err: unknown) {
            apiLogger.error('删除文档失败:', err);
            addNotification({
              title: '失败',
              message: '删除文档失败',
              type: 'error',
            });
          }
        },
      });
    },
    [addNotification, openConfirmDialog, deleteMutation]
  );

  const handleDownload = useCallback(
    async (doc: { id: string; name: string }) => {
      try {
        const blob = await docApi.download(doc.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        addNotification({
          title: '成功',
          message: '文件下载成功',
          type: 'success',
        });
      } catch (err: unknown) {
        apiLogger.error('下载失败:', err);
        addNotification({
          title: '失败',
          message: '文件下载失败',
          type: 'error',
        });
      }
    },
    [addNotification]
  );

  const handleShare = useCallback(
    (doc: { name: string }) => {
      addNotification({
        title: '提示',
        message: `分享功能开发中 - ${doc.name}`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleOpen = useCallback(
    (doc: { name: string }) => {
      addNotification({
        title: '打开文档',
        message: `正在打开"${doc.name}"...`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const typeFilterOptions = [
    { label: '全部类型', value: 'all' },
    { label: 'PDF', value: 'pdf' },
    { label: 'Word', value: 'word' },
    { label: 'Excel', value: 'excel' },
    { label: 'PPT', value: 'ppt' },
    { label: '图片', value: 'image' },
  ];

  const categoryFilterOptions = [
    { label: '全部分类', value: 'all' },
    { label: '工作', value: 'work' },
    { label: '个人', value: 'personal' },
    { label: '项目', value: 'project' },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'type',
      label: '类型',
      type: 'select',
      options: typeFilterOptions,
      value: typeFilter,
      onChange: (value: unknown) => {
        setTypeFilter(value as string);
        setCurrentPage(1);
      },
    },
    {
      id: 'category',
      label: '分类',
      type: 'select',
      options: categoryFilterOptions,
      value: categoryFilter,
      onChange: (value: unknown) => {
        setCategoryFilter(value as string);
        setCurrentPage(1);
      },
    },
  ];

  const columns: ColumnDef<{
    id: string;
    name: string;
    type: string;
    size: string;
    folder: string;
    category: string;
    updatedAt: string;
  }>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '文档名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
              }}
            >
              {getFileIcon(row.type)}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.name}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.category}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'type',
        label: '类型',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            label={TYPE_LABELS[row.type]}
            sx={{
              bgcolor: `${TYPE_COLORS[row.type]}15`,
              color: TYPE_COLORS[row.type],
              fontWeight: 500,
            }}
          />
        ),
      },
      {
        id: 'size',
        label: '大小',
        width: 100,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.size}
          </Typography>
        ),
      },
      {
        id: 'folder',
        label: '所在文件夹',
        width: 140,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <FolderOpen
              size={14}
              style={{ color: ct.grey[500] }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.folder}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'updatedAt',
        label: '修改时间',
        width: 160,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.updatedAt}
          </Typography>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        width: 160,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title='打开'>
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpen(row);
                }}
              >
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='下载'>
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(row);
                }}
              >
                <Download size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='分享'>
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare(row);
                }}
              >
                <Share2 size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='删除'>
              <IconButton
                size='small'
                color='error'
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row);
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleOpen, handleDownload, handleShare, handleDelete]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FolderOpen size={20} />,
        backButton: {
          href: '/document/dashboard',
        },
      }}
    >
      <ListPageTemplate
        title='文档列表'
        subtitle='管理您的所有文档'
        columns={columns}
        data={paginatedDocuments}
        loading={loading}
        searchable
        searchPlaceholder='搜索文档名称...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ type: typeFilter, category: categoryFilter }}
        onFilterChange={(filters) => {
          if (filters.type !== undefined) {
            setTypeFilter(filters.type as string);
          }
          if (filters.category !== undefined) {
            setCategoryFilter(filters.category as string);
          }
          setCurrentPage(1);
        }}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        onRowClick={handleOpen}
        actions={[
          {
            label: '上传',
            icon: <Upload size={16} />,
            onClick: () => {
              addNotification({
                title: '提示',
                message: '上传文档功能开发中',
                type: 'info',
              });
            },
            variant: 'contained',
          },
          {
            label: '新建文件夹',
            icon: <FolderPlus size={16} />,
            onClick: () => {
              addNotification({
                title: '提示',
                message: '新建文件夹功能开发中',
                type: 'info',
              });
            },
            variant: 'outlined',
          },
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: handleRefresh,
            variant: 'outlined',
          },
        ]}
        onRefresh={handleRefresh}
        emptyMessage='暂无文档'
      />

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

export default DocumentListPage;
