import React, { useState, useEffect, useCallback } from 'react';
import {
  CardListTemplate,
  type CardRenderConfig,
  type CardAction,
  type MetricStatCard,
} from '@/components/templates';
import { aiApi } from '@/api/ai';
import type { Document } from '@/api/ai';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/store';
import { BookOpen, FileText, Calendar, Tag, Eye, Edit, Trash2, Upload, RefreshCw, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, Stack, Chip } from '@mui/material';

interface DocumentWithMeta extends Document {
  category?: string;
  tags?: string[];
  description?: string;
}

const KnowledgeBasePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [documents, setDocuments] = useState<DocumentWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    category: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithMeta | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
  });

  const categories = [
    { value: 'all', label: '全部' },
    { value: '技术文档', label: '技术文档' },
    { value: '业务流程', label: '业务流程' },
    { value: '产品说明', label: '产品说明' },
    { value: '培训资料', label: '培训资料' },
    { value: '规章制度', label: '规章制度' },
    { value: '其他', label: '其他' },
  ];

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '未知';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(parseInt(dateStr) * 1000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: 20,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }
      if (filterValues.category !== 'all') {
        params.category = filterValues.category;
      }

      const response = await aiApi.listDocuments(params);
      if (response.success && response.data) {
        const docs = 'items' in response.data ? response.data.items : response.data;
        setDocuments(docs);
        setTotal(response.data.total);
      }
    } catch (err: unknown) {
      logger.error('加载文档列表失败:', err);
      addNotification({
        title: '加载失败',
        message: '加载文档列表失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filterValues.category, addNotification]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const metricStats = useCallback((): MetricStatCard[] => [
    {
      id: 'total',
      title: '总文档数',
      value: documents.length,
      icon: <FileText size={24} />,
      color: 'primary',
    },
    {
      id: 'categories',
      title: '分类数量',
      value: new Set(documents.map((d) => d.category || '未分类')).size,
      icon: <Tag size={24} />,
      color: 'primary',
    },
    {
      id: 'processed',
      title: '已处理',
      value: documents.filter((d) => d.status === 'processed').length,
      icon: <BookOpen size={24} />,
      color: 'success',
    },
  ], [documents]);

  const handleFilterChange = (filters: Record<string, any>) => {
    setFilterValues(filters);
    setCurrentPage(1);
  };

  const handleFilterReset = () => {
    setFilterValues({ category: 'all' });
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadDocuments();
  };

  const handleRefresh = () => {
    loadDocuments();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadFiles(files);
    }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      addNotification({
        title: '提示',
        message: '请选择要上传的文件',
        type: 'warning',
      });
      return;
    }

    setUploading(true);
    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch('/ai/api/ai/documents/upload', {
          method: 'POST',
          body: formData,
        });
      }

      addNotification({
        title: '上传成功',
        message: `成功上传 ${uploadFiles.length} 个文档`,
        type: 'success',
      });
      setShowUploadDialog(false);
      setUploadFiles([]);
      loadDocuments();
    } catch (err: unknown) {
      logger.error('上传失败:', err);
      addNotification({
        title: '上传失败',
        message: '文档上传失败',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('确定要删除这个文档吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await aiApi.deleteDocument(docId);
      if (response.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
        addNotification({
          title: '删除成功',
          message: '文档已删除',
          type: 'success',
        });
      }
    } catch (err: unknown) {
      logger.error('删除失败:', err);
      addNotification({
        title: '删除失败',
        message: '删除文档失败',
        type: 'error',
      });
    }
  };

  const handleViewDetail = (doc: DocumentWithMeta) => {
    setSelectedDocument(doc);
    setShowDetailDialog(true);
  };

  const handleEdit = (doc: DocumentWithMeta) => {
    setSelectedDocument(doc);
    setEditForm({
      title: doc.title,
      description: doc.description || '',
      category: doc.category || '',
      tags: doc.tags?.join(', ') || '',
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDocument) return;

    try {
      const updatedDoc = {
        ...selectedDocument,
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        tags: editForm.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
      };

      const response = await aiApi.updateDocument(selectedDocument.id, updatedDoc);
      if (response.success) {
        addNotification({
          title: '保存成功',
          message: '文档信息已更新',
          type: 'success',
        });
        setShowEditDialog(false);
        loadDocuments();
      }
    } catch (err: unknown) {
      logger.error('保存失败:', err);
      addNotification({
        title: '保存失败',
        message: '更新文档信息失败',
        type: 'error',
      });
    }
  };

  const filters = [
    {
      id: 'category',
      label: '分类',
      type: 'select' as const,
      options: categories.map((cat) => ({ label: cat.label, value: cat.value })),
    },
  ];

  const cardConfig: CardRenderConfig = {
    title: (item: unknown) => (item as DocumentWithMeta).title,
    description: (item: unknown) => (item as DocumentWithMeta).filename || '',
    status: {
      field: 'status',
      options: {
        processed: { label: '已处理', color: 'success' },
        processing: { label: '处理中', color: 'warning' },
        failed: { label: '失败', color: 'error' },
      },
    },
    meta: [
      {
        field: 'file_size',
        label: '大小',
        icon: <FileText size={14} />,
        format: (value: number) => formatFileSize(value),
      },
      {
        field: 'created_at',
        label: '创建时间',
        icon: <Calendar size={14} />,
        format: (value: string) => formatDate(value),
      },
      {
        field: 'mime_type',
        label: '类型',
        format: (value: string) => value?.split('/')[1]?.toUpperCase() || '-',
      },
    ],
    tags: [
      {
        field: 'category',
        options: {
          '技术文档': { label: '技术文档', color: 'primary' },
          '业务流程': { label: '业务流程', color: 'info' },
          '产品说明': { label: '产品说明', color: 'success' },
          '培训资料': { label: '培训资料', color: 'warning' },
          '规章制度': { label: '规章制度', color: 'error' },
          '其他': { label: '其他', color: 'grey' },
        },
      },
    ],
    icon: <BookOpen size={24} style={{ color: '#a855f7' }} />,
    iconBgColor: 'background.paper',
  };

  const cardActions: CardAction[] = [
    {
      label: '查看',
      icon: <Eye size={16} />,
      onClick: (item: unknown) => handleViewDetail(item as DocumentWithMeta),
      color: 'primary',
      variant: 'text',
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: (item: unknown) => handleEdit(item as DocumentWithMeta),
      color: 'primary',
      variant: 'text',
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      onClick: (item: unknown) => handleDelete((item as DocumentWithMeta).id),
      color: 'error',
      variant: 'text',
    },
  ];

  return (
    <>
      <CardListTemplate
        title='知识库管理'
        subtitle='管理和组织企业的知识文档，为 AI 提供上下文支持'
        data={documents}
        cardConfig={cardConfig}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: '搜索文档标题或文件名...',
        }}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        onSearch={handleSearch}
        addButton={{
          text: '上传文档',
          icon: <Upload size={18} />,
          onClick: () => setShowUploadDialog(true),
        }}
        onRefresh={handleRefresh}
        pagination={{
          page: currentPage,
          pageSize: 20,
          total: total,
          onPageChange: setCurrentPage,
        }}
        cardActions={cardActions}
        showViewToggle={true}
        gridColumns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        showStatsOverview={true}
        metricStats={metricStats()}
      />

      {/* 上传对话框 */}
      <Dialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)}>
        <DialogTitle>上传文档</DialogTitle>
        <DialogContentText sx={{ px: 3, pt: 1 }}>
          上传文档到知识库，支持 txt、md、json、pdf、doc、docx 格式
        </DialogContentText>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                border: 2,
                borderStyle: 'dashed',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                borderColor: 'grey.300',
                '&:hover': { borderColor: 'primary.light' },
                transition: 'all 0.2s',
              }}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter((file) =>
                  ['txt', 'md', 'json', 'pdf', 'doc', 'docx'].some((ext) =>
                    file.name.toLowerCase().endsWith(ext)
                  )
                );
                setUploadFiles(files);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload size={48} style={{ margin: '0 auto 16px', color: '#9ca3af' }} />
              <Typography sx={{ color: '#4b5563', mb: 1 }}>
                拖拽文件到这里，或点击选择文件
              </Typography>
              <input
                type='file'
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id='file-upload'
                accept='.txt,.md,.json,.pdf,.doc,.docx'
              />
              <Button variant='outlined' onClick={() => document.getElementById('file-upload')?.click()}>
                <Plus size={16} style={{ marginRight: 8 }} />
                选择文件
              </Button>
            </Box>

            {uploadFiles.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant='body2'>已选择的文件</Typography>
                {uploadFiles.map((file, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileText size={16} style={{ color: '#a855f7' }} />
                      <Typography variant='body2'>{file.name}</Typography>
                      <Typography variant='caption' sx={{ color: 'grey.500' }}>
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                    <Button
                      variant='text'
                      size='small'
                      onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== idx))}
                    >
                      <X size={16} />
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => setShowUploadDialog(false)}>
            取消
          </Button>
          <Button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0}>
            {uploading ? (
              <RefreshCw
                size={16}
                style={{ marginRight: 8, animation: 'spin 1s linear infinite' }}
              />
            ) : (
              <Upload size={16} style={{ marginRight: 8 }} />
            )}
            {uploading ? '上传中...' : '开始上传'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 文档详情对话框 */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth='md' fullWidth>
        <DialogTitle>文档详情</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    文档标题
                  </Typography>
                  <Typography variant='body1' sx={{ fontWeight: 500 }}>
                    {selectedDocument.title}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    文件名
                  </Typography>
                  <Typography variant='body1'>{selectedDocument.filename}</Typography>
                </Box>
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    文件大小
                  </Typography>
                  <Typography variant='body1'>{formatFileSize(selectedDocument.file_size)}</Typography>
                </Box>
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    文件类型
                  </Typography>
                  <Typography variant='body1'>{selectedDocument.mime_type || '未知'}</Typography>
                </Box>
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    创建时间
                  </Typography>
                  <Typography variant='body1'>{formatDate(selectedDocument.created_at)}</Typography>
                </Box>
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    更新时间
                  </Typography>
                  <Typography variant='body1'>{formatDate(selectedDocument.updated_at)}</Typography>
                </Box>
              </Box>
              {selectedDocument.category && (
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    分类
                  </Typography>
                  <Chip
                    label={selectedDocument.category}
                    size='small'
                    variant='outlined'
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    标签
                  </Typography>
                  <Stack direction='row' spacing={0.5} sx={{ mt: 0.5 }}>
                    {selectedDocument.tags.map((tag, idx) => (
                      <Chip key={idx} label={tag} size='small' variant='outlined' />
                    ))}
                  </Stack>
                </Box>
              )}
              {selectedDocument.description && (
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    描述
                  </Typography>
                  <Typography variant='body1' sx={{ mt: 0.5 }}>
                    {selectedDocument.description}
                  </Typography>
                </Box>
              )}
              {selectedDocument.file_path && (
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    文件路径
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    {selectedDocument.file_path}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => setShowDetailDialog(false)}>
            关闭
          </Button>
          <Button
            onClick={() => {
              setShowDetailDialog(false);
              handleEdit(selectedDocument!);
            }}
          >
            <Edit size={16} style={{ marginRight: 8 }} />
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑文档对话框 */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth='sm' fullWidth>
        <DialogTitle>编辑文档信息</DialogTitle>
        <DialogContentText sx={{ px: 3, pt: 1 }}>
          更新文档的标题、描述、分类和标签信息
        </DialogContentText>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant='body2' sx={{ mb: 1 }}>
                文档标题
              </Typography>
              <TextField
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                size='small'
                fullWidth
              />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ mb: 1 }}>
                分类
              </Typography>
              <FormControl size='small' fullWidth>
                <Select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  displayEmpty
                >
                  <MenuItem value='' disabled>
                    选择分类
                  </MenuItem>
                  {categories
                    .filter((c) => c.value !== 'all')
                    .map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant='body2' sx={{ mb: 1 }}>
                标签(用逗号分隔)
              </Typography>
              <TextField
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder='例如: 技术, API, 开发'
                size='small'
                fullWidth
              />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ mb: 1 }}>
                描述
              </Typography>
              <TextField
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                multiline
                rows={4}
                placeholder='添加文档描述...'
                size='small'
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => setShowEditDialog(false)}>
            取消
          </Button>
          <Button variant='contained' onClick={handleSaveEdit}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default KnowledgeBasePage;