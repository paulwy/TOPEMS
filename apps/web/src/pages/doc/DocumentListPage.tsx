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

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'word' | 'excel' | 'ppt' | 'image';
  size: string;
  folder: string;
  category: 'work' | 'personal' | 'project';
  updatedAt: string;
}

const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    name: '2024年度工作总结报告.pdf',
    type: 'pdf',
    size: '2.4 MB',
    folder: '工作文档',
    category: 'work',
    updatedAt: '2024-12-15 14:30',
  },
  {
    id: '2',
    name: '产品需求规格说明书.docx',
    type: 'word',
    size: '1.8 MB',
    folder: '项目文档',
    category: 'project',
    updatedAt: '2024-12-14 16:20',
  },
  {
    id: '3',
    name: '财务报表-第四季度.xlsx',
    type: 'excel',
    size: '3.2 MB',
    folder: '财务文档',
    category: 'work',
    updatedAt: '2024-12-13 10:15',
  },
  {
    id: '4',
    name: '项目进度汇报.pptx',
    type: 'ppt',
    size: '5.6 MB',
    folder: '项目文档',
    category: 'project',
    updatedAt: '2024-12-12 09:45',
  },
  {
    id: '5',
    name: '产品架构设计图.png',
    type: 'image',
    size: '890 KB',
    folder: '技术文档',
    category: 'project',
    updatedAt: '2024-12-11 11:30',
  },
  {
    id: '6',
    name: '员工手册.pdf',
    type: 'pdf',
    size: '1.2 MB',
    folder: '规章制度',
    category: 'work',
    updatedAt: '2024-12-10 15:00',
  },
  {
    id: '7',
    name: '个人简历模板.docx',
    type: 'word',
    size: '520 KB',
    folder: '个人文档',
    category: 'personal',
    updatedAt: '2024-12-09 08:20',
  },
  {
    id: '8',
    name: '季度销售数据.xlsx',
    type: 'excel',
    size: '2.1 MB',
    folder: '销售报表',
    category: 'work',
    updatedAt: '2024-12-08 17:40',
  },
  {
    id: '9',
    name: '培训课件-新员工入职.pptx',
    type: 'ppt',
    size: '8.3 MB',
    folder: '培训资料',
    category: 'work',
    updatedAt: '2024-12-07 13:10',
  },
  {
    id: '10',
    name: '产品原型设计稿.jpg',
    type: 'image',
    size: '1.5 MB',
    folder: '设计文档',
    category: 'project',
    updatedAt: '2024-12-06 16:55',
  },
];

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

const CATEGORY_LABELS: Record<string, string> = {
  work: '工作',
  personal: '个人',
  project: '项目',
};

const getFileIcon = (type: string) => {
  const color = TYPE_COLORS[type] || '#6B7280';
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

export const DocumentListPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [loading, setLoading] = useState(false);
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

  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

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
    setLoading(true);
    setTimeout(() => {
      setDocuments([...MOCK_DOCUMENTS]);
      setLoading(false);
      addNotification({
        title: '成功',
        message: '刷新成功',
        type: 'success',
      });
    }, 500);
  }, [addNotification]);

  const handleDelete = useCallback(
    (doc: Document) => {
      openConfirmDialog({
        title: '确认删除',
        message: `确定要删除文档"${doc.name}"吗？此操作可以在回收站中恢复。`,
        danger: true,
        onConfirm: () => {
          setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
          addNotification({
            title: '成功',
            message: '文档已删除',
            type: 'success',
          });
        },
      });
    },
    [addNotification, openConfirmDialog]
  );

  const handleDownload = useCallback(
    (doc: Document) => {
      addNotification({
        title: '下载中',
        message: `正在下载"${doc.name}"...`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleShare = useCallback(
    (doc: Document) => {
      addNotification({
        title: '提示',
        message: `分享功能开发中 - ${doc.name}`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleOpen = useCallback(
    (doc: Document) => {
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
      onChange: (value: string | string[]) => {
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
      onChange: (value: string | string[]) => {
        setCategoryFilter(value as string);
        setCurrentPage(1);
      },
    },
  ];

  const columns: ColumnDef<Document>[] = useMemo(
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
                {CATEGORY_LABELS[row.category]}
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
              style={{ color: '#6B7280' }}
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
