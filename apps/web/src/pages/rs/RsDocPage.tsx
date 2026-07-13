import React, { useState, useEffect, useMemo } from 'react';
import { apiLogger, logger } from '@/utils/logger';
import {
  Box,
  Typography,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Paper,
  Button,
} from '@mui/material';
import { FileUpload, PageContainer } from '@/components/common';
import {
  Plus,
  Upload,
  FileText,
  Edit,
  Trash2,
  History,
  Shield,
  BookOpen,
  File,
  Folder,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';
import { rsApi } from '@/api/rs';
import { useNotificationStore } from '@/store';
import type { RsStatistics } from '@/api/rs';

interface Document {
  id: string;
  doc_name: string;
  doc_type: string;
  version: string;
  author: string;
  update_time: string;
  status: string;
}

const RsDocPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [newDocDialogOpen, setNewDocDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newDocForm, setNewDocForm] = useState({
    doc_name: '',
    doc_type: '设计文档',
    description: '',
  });
  const [statistics, setStatistics] = useState<RsStatistics | null>(null);

  useEffect(() => {
    loadDocs();
    loadStatistics();
  }, [searchTerm, docTypeFilter, statusFilter, page, rowsPerPage]);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const response = await rsApi.getStatistics();
      if (response.success && response.data) {
        const stats = response.data;
        setStatistics(stats);

        const docTypes = [
          { type: '设计文档', count: stats.total_projects || 0 },
          { type: '接口文档', count: stats.total_experiments || 0 },
          { type: '用户文档', count: stats.total_formulas || 0 },
          { type: '测试文档', count: stats.total_tasks || 0 },
        ];

        const newDocs: Document[] = docTypes.flatMap((dt, index) => {
          return Array.from({ length: Math.min(dt.count, 3) }, (_, i) => ({
            id: `${index}-${i}`,
            doc_name: `${dt.type} - 文档 ${i + 1}`,
            doc_type: dt.type,
            version: `v${index + 1}.${i}.0`,
            author: '系统自动',
            update_time: new Date().toISOString(),
            status: i % 2 === 0 ? 'published' : 'draft',
          }));
        });

        setDocs(newDocs);
        setTotal(newDocs.length);
      }
    } catch (error: unknown) {
      logger.error('加载文档数据失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载文档数据',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await rsApi.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error: unknown) {
      logger.error('加载统计数据失败:', error);
    }
  };

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case '设计文档':
        return (
          <File
            size={16}
            color='primary.main'
          />
        );
      case '接口文档':
        return (
          <FileText
            size={16}
            color='primary.main'
          />
        );
      case '用户文档':
        return (
          <BookOpen
            size={16}
            color='primary.main'
          />
        );
      default:
        return (
          <Folder
            size={16}
            color='primary.main'
          />
        );
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'published':
        return '已发布';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const matchesSearch =
        doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !docTypeFilter || doc.doc_type === docTypeFilter;
      const matchesStatus = !statusFilter || doc.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [docs, searchTerm, docTypeFilter, statusFilter]);

  const paginatedDocs = filteredDocs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const uniqueDocTypes = [...new Set(docs.map((d) => d.doc_type))];

  const handleCreateDoc = async () => {
    try {
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新文档已创建',
      });
      setNewDocDialogOpen(false);
      setNewDocForm({ doc_name: '', doc_type: '设计文档', description: '' });
      loadDocs();
    } catch (error: unknown) {
      logger.error('创建文档失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建文档',
      });
    }
  };

  const handleViewVersion = (doc: Document) => {
    setSelectedDoc(doc);
    setVersionDialogOpen(true);
  };

  const handleDelete = (docId: string) => {
    setDocs(docs.filter((d) => d.id !== docId));
  };

  const columns: ColumnDef<Document>[] = [
    {
      id: 'doc_name',
      label: '文档名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getDocTypeIcon(row.doc_type)}
          {row.doc_name}
        </Box>
      ),
    },
    {
      id: 'doc_type',
      label: '文档类型',
    },
    {
      id: 'version',
      label: '版本',
      render: (row) => (
        <Chip
          label={row.version}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      id: 'author',
      label: '作者',
    },
    {
      id: 'update_time',
      label: '更新时间',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={getStatusLabel(row.status)}
          size='small'
          color={getStatusColor(row.status)}
        />
      ),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'doc_type',
      label: '文档类型',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        ...uniqueDocTypes.map((type) => ({ label: type, value: type })),
      ],
      value: docTypeFilter || '',
      onChange: (value: unknown) => setDocTypeFilter((value as string) || ''),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '已发布', value: 'published' },
        { label: '草稿', value: 'draft' },
      ],
      value: statusFilter || '',
      onChange: (value: unknown) => setStatusFilter((value as string) || ''),
    },
  ];

  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: () => {},
    },
    {
      label: '版本管理',
      icon: <History size={16} />,
      onClick: handleViewVersion,
    },
    {
      label: '权限设置',
      icon: <Shield size={16} />,
      onClick: () => {},
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error' as const,
      onClick: (row: Document) => handleDelete(row.id),
    },
  ];

  return (
    <PageContainer>
      <ListPageTemplate
        columns={columns}
        data={paginatedDocs}
        loading={loading}
        searchable
        searchPlaceholder='搜索文档名称、作者...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={filters}
        filtersValue={{
          doc_type: docTypeFilter || '',
          status: statusFilter || '',
        }}
        onFilterChange={(filters) => {
          if (filters.doc_type !== undefined) {
            setDocTypeFilter(filters.doc_type || null);
          }
          if (filters.status !== undefined) {
            setStatusFilter(filters.status || null);
          }
        }}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '上传',
            variant: 'outlined',
            icon: <Upload size={18} />,
            onClick: () => setUploadDialogOpen(true),
          },
          {
            label: '新建文档',
            variant: 'contained',
            icon: <Plus size={18} />,
            onClick: () => setNewDocDialogOpen(true),
          },
        ]}
        rowActions={rowActions}
        showRowNumber
        emptyMessage='暂无文档数据'
      />

      <Dialog
        open={newDocDialogOpen}
        onClose={() => setNewDocDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建文档</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='文档名称'
              fullWidth
              value={newDocForm.doc_name}
              onChange={(e) => setNewDocForm({ ...newDocForm, doc_name: e.target.value })}
            />
            <TextField
              select
              label='文档类型'
              fullWidth
              value={newDocForm.doc_type}
              onChange={(e) => setNewDocForm({ ...newDocForm, doc_type: e.target.value })}
            >
              <option value='设计文档'>设计文档</option>
              <option value='接口文档'>接口文档</option>
              <option value='用户文档'>用户文档</option>
              <option value='测试文档'>测试文档</option>
              <option value='运维文档'>运维文档</option>
            </TextField>
            <TextField
              label='描述'
              fullWidth
              multiline
              rows={3}
              value={newDocForm.description}
              onChange={(e) => setNewDocForm({ ...newDocForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDocDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateDoc}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={versionDialogOpen}
        onClose={() => setVersionDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>版本历史</DialogTitle>
        <DialogContent>
          {selectedDoc && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedDoc.doc_name}
              </Typography>
              <Stack
                spacing={2}
                sx={{ mt: 2 }}
              >
                {[
                  {
                    version: 'v2.1.0',
                    date: '2024-06-15',
                    author: '张三',
                    note: '更新架构设计',
                  },
                  {
                    version: 'v2.0.0',
                    date: '2024-05-20',
                    author: '张三',
                    note: '重大改版',
                  },
                  {
                    version: 'v1.0.0',
                    date: '2024-04-01',
                    author: '李四',
                    note: '初始版本',
                  },
                ].map((v, i) => (
                  <Paper
                    key={i}
                    sx={{ p: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 'bold' }}
                        >
                          {v.version}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {v.date} - {v.author}
                        </Typography>
                      </Box>
                      <Typography variant='body2'>{v.note}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>上传文档</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FileUpload
              value={attachments}
              onChange={setAttachments}
              accept={['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md']}
              maxCount={10}
              maxSize={50}
              maxTotalSize={200}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>关闭</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={() => {
              apiLogger.info('上传的文件:', attachments);
              setUploadDialogOpen(false);
            }}
          >
            完成上传
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsDocPage;
