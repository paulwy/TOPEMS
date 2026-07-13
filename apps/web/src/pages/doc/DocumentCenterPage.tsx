import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/common';
import { CardListTemplate, type CardRenderConfig, type CardAction } from '@/components/templates';
import { docApi } from '@/api/doc';
import type { FileMetadata, FileVersion, Folder as FolderType } from '@/api/doc';
import { logger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import {
  File,
  Folder,
  Star,
  Download,
  Eye,
  Trash2,
  Clock,
  Upload,
  ChevronLeft,
  ChevronRight,
  History,
  RotateCcw,
  User,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface DocumentWithFavorite extends FileMetadata {
  is_favorite?: boolean;
  tags?: string[];
  category?: string;
}

const DocumentCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const theme = useTheme();

  const [documents, setDocuments] = useState<DocumentWithFavorite[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    category: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionDoc, setVersionDoc] = useState<DocumentWithFavorite | null>(null);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.includes('pdf')) {
      return (
        <File
          size={24}
          style={{ color: ct.error.dark }}
        />
      );
    }
    if (contentType.includes('word') || contentType.includes('doc')) {
      return (
        <File
          size={24}
          style={{ color: ct.primary.dark }}
        />
      );
    }
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return (
        <File
          size={24}
          style={{ color: ct.success.dark }}
        />
      );
    }
    return (
      <File
        size={24}
        style={{ color: ct.grey[500] }}
      />
    );
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesResponse, foldersResponse] = await Promise.all([
        docApi.list(),
        docApi.listFolders(),
      ]);

      if (filesResponse.success && filesResponse.data) {
        const data = filesResponse.data;
        const files = data.files ?? data.items ?? [];
        const docs: DocumentWithFavorite[] = files.map((file) => ({
          ...file,
          is_favorite: false,
          tags: [],
          category: file.folder_id ? '分类文档' : '未分类',
        }));
        setDocuments(docs);
        setTotal(data.total ?? 0);
      }

      if (foldersResponse.success && foldersResponse.data) {
        const foldersData = foldersResponse.data;
        const folders = foldersData.folders ?? foldersData.items ?? [];
        setFolders(folders);
      }
    } catch (err: unknown) {
      logger.error('加载文档数据失败:', err);
      addNotification({
        title: '加载失败',
        message: '加载文档数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !filterValues.category || doc.category === filterValues.category;

    return matchesSearch && matchesCategory;
  });

  const handleFilterChange = (filters: Record<string, any>) => {
    setFilterValues(filters);
    setCurrentPage(1);
  };

  const handleFilterReset = () => {
    setFilterValues({ category: '' });
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleToggleFavorite = (docId: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, is_favorite: !doc.is_favorite } : doc))
    );
    addNotification({
      title: '操作成功',
      message: '收藏状态已更新',
      type: 'success',
    });
  };

  const handlePreview = (doc: DocumentWithFavorite) => {
    addNotification({
      title: '提示',
      message: `正在预览: ${doc.name}`,
      type: 'info',
    });
  };

  const handleDownload = async (doc: DocumentWithFavorite) => {
    try {
      const blob = await docApi.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addNotification({
        title: '下载成功',
        message: `正在下载: ${doc.name}`,
        type: 'success',
      });
    } catch (err: unknown) {
      logger.error('下载失败:', err);
      addNotification({
        title: '下载失败',
        message: '文件下载失败',
        type: 'error',
      });
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return;

    try {
      const response = await docApi.delete(docId);
      if (response.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
        addNotification({
          title: '删除成功',
          message: '文件已删除',
          type: 'success',
        });
      }
    } catch (err: unknown) {
      logger.error('删除失败:', err);
      addNotification({
        title: '删除失败',
        message: '文件删除失败',
        type: 'error',
      });
    }
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
        await docApi.upload(file);
      }

      addNotification({
        title: '上传成功',
        message: `成功上传 ${uploadFiles.length} 个文件`,
        type: 'success',
      });
      setShowUploadModal(false);
      setUploadFiles([]);
      loadData();
    } catch (err: unknown) {
      logger.error('上传失败:', err);
      addNotification({
        title: '上传失败',
        message: '文件上传失败',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleOpenVersionHistory = async (doc: DocumentWithFavorite) => {
    setVersionDoc(doc);
    setShowVersionHistory(true);
    setVersionsLoading(true);
    try {
      const response = await docApi.getVersions(doc.id);
      if (response.success && response.data) {
        setVersions(response.data);
      } else {
        setVersions([]);
      }
    } catch (err: unknown) {
      logger.error('加载版本历史失败:', err);
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRestoreVersion = async (doc: DocumentWithFavorite, version: FileVersion) => {
    try {
      const response = await docApi.restoreVersion(doc.id, version.version);
      if (response.success) {
        addNotification({
          title: '恢复成功',
          message: `已恢复到版本 v${version.version}`,
          type: 'success',
        });
        loadData();
        handleOpenVersionHistory(doc);
      } else {
        addNotification({
          title: '恢复失败',
          message: response.message || '恢复版本失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      logger.error('恢复版本失败:', err);
      addNotification({
        title: '恢复失败',
        message: '恢复版本失败',
        type: 'error',
      });
    }
  };

  const filters = [
    {
      id: 'category',
      label: '分类',
      type: 'select' as const,
      options: [
        { label: '全部分类', value: '' },
        { label: '项目文档', value: '项目文档' },
        { label: '技术文档', value: '技术文档' },
        { label: '规章制度', value: '规章制度' },
      ],
    },
  ];

  const cardConfig: CardRenderConfig = {
    title: (item: unknown) => (item as DocumentWithFavorite).name,
    description: (item: unknown) => (item as DocumentWithFavorite).category || '',
    meta: [
      {
        field: 'size',
        label: '大小',
        icon: <File size={14} />,
        format: (value: unknown) => formatFileSize(value as number),
      },
      {
        field: 'updated_at',
        label: '更新时间',
        icon: <Clock size={14} />,
        format: (value: unknown) => (value as string).split('T')[0] || '-',
      },
      {
        field: 'created_by',
        label: '创建者',
        format: (value: unknown) => (value as string) || '-',
      },
    ],
    tags: [
      {
        field: 'is_favorite',
        options: {
          true: { label: '已收藏', color: 'warning' },
        },
      },
    ],
    icon: (item: unknown) => getFileIcon((item as DocumentWithFavorite).content_type),
    iconBgColor: 'background.paper',
  };

  const cardActions: CardAction[] = [
    {
      label: '预览',
      icon: <Eye size={16} />,
      onClick: (item: unknown) => handlePreview(item as DocumentWithFavorite),
      color: 'primary',
      variant: 'text',
    },
    {
      label: '下载',
      icon: <Download size={16} />,
      onClick: (item: unknown) => handleDownload(item as DocumentWithFavorite),
      color: 'success',
      variant: 'text',
    },
    {
      label: '收藏',
      icon: (item: unknown) => (
        <Star
          size={16}
          style={{ fill: (item as DocumentWithFavorite).is_favorite ? 'currentColor' : 'none' }}
        />
      ),
      onClick: (item: unknown) => handleToggleFavorite((item as DocumentWithFavorite).id),
      color: 'warning',
      variant: 'text',
    },
    {
      label: '版本历史',
      icon: <History size={16} />,
      onClick: (item: unknown) => handleOpenVersionHistory(item as DocumentWithFavorite),
      color: 'primary',
      variant: 'text',
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      onClick: (item: unknown) => handleDelete((item as DocumentWithFavorite).id),
      color: 'error',
      variant: 'text',
    },
  ];

  return (
    <PageContainer
      title='文档中心'
      subtitle='统一管理企业文档，支持分类、标签和全文搜索'
    >
      {/* 面包屑导航 */}
      <Box
        sx={{ px: 3, py: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
      >
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}>
            <Box
              onClick={() => setCurrentPath([])}
              sx={{
                color: 'primary.main',
                cursor: 'pointer',
                '&:hover': { color: 'primary.dark' },
              }}
            >
              全部文档
            </Box>
            {currentPath.map((path, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight sx={{ width: 16, height: 16, color: 'grey.400' }} />
                <Box
                  onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                  sx={
                    idx === currentPath.length - 1
                      ? { color: 'grey.900' }
                      : {
                          color: 'primary.main',
                          cursor: 'pointer',
                          '&:hover': { color: 'primary.dark' },
                        }
                  }
                >
                  {path}
                </Box>
              </React.Fragment>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 文件夹列表 */}
      {currentPath.length === 0 && folders.length > 0 && (
        <Box sx={{ px: 3, py: 2 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, color: 'grey.900', mb: 2 }}
          >
            文件夹
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
                md: 'repeat(6, 1fr)',
              },
              gap: 2,
            }}
          >
            {folders.map((folder) => (
              <Box
                key={folder.id}
                onClick={() => setCurrentPath([...currentPath, folder.name])}
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                  p: 2,
                  border: 1,
                  borderColor: 'grey.200',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3, borderColor: 'primary.light' },
                  transition: 'all 0.2s',
                }}
              >
                <Folder sx={{ width: 40, height: 40, color: 'warning.main', mb: 1.5 }} />
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: 500,
                    color: 'grey.900',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {folder.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <CardListTemplate
        title=''
        subtitle=''
        data={filteredDocuments as unknown as Record<string, unknown>[]}
        cardConfig={cardConfig}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: '搜索文件名、标签...',
        }}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        onSearch={handleSearch}
        addButton={{
          text: '上传文件',
          icon: <Upload size={18} />,
          onClick: () => setShowUploadModal(true),
        }}
        onRefresh={handleRefresh}
        pagination={{
          page: currentPage,
          pageSize: 20,
          total,
          onPageChange: setCurrentPage,
        }}
        cardActions={cardActions}
        showViewToggle={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        gridColumns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        showStatsOverview={false}
      />

      {/* 上传对话框 */}
      <Dialog
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        maxWidth='md'
      >
        <DialogTitle>上传文件</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                border: 2,
                borderStyle: 'dashed',
                borderRadius: 3,
                p: 6,
                textAlign: 'center',
                borderColor: 'grey.300',
                '&:hover': { borderColor: 'primary.light' },
                transition: 'all 0.2s',
              }}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFiles = Array.from(e.dataTransfer.files);
                setUploadFiles((prev) => [...prev, ...droppedFiles]);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload sx={{ width: 48, height: 48, color: 'grey.400', mx: 'auto', mb: 2 }} />
              <Typography sx={{ color: 'grey.600', mb: 1 }}>
                拖拽文件到此处，或{' '}
                <Box
                  component='span'
                  sx={{ color: 'primary.main', cursor: 'pointer' }}
                >
                  点击选择
                </Box>
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'grey.500' }}
              >
                支持 .pdf, .docx, .xlsx, .txt 等格式，单个文件不超过 100MB
              </Typography>
            </Box>

            <input
              type='file'
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id='file-upload'
            />
            <Button
              variant='outlined'
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              选择文件
            </Button>

            {uploadFiles.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {uploadFiles.map((file, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      bgcolor: 'grey.50',
                      borderRadius: 3,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <File sx={{ width: 20, height: 20, color: 'grey.500' }} />
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.700' }}
                      >
                        {file.name}
                      </Typography>
                    </Box>
                    <Button
                      size='small'
                      onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== idx))}
                    >
                      删除
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadModal(false)}>取消</Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || uploadFiles.length === 0}
          >
            {uploading ? '上传中...' : '开始上传'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 版本历史对话框 */}
      <Dialog
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <History size={20} />
            <Typography>版本历史 - {versionDoc?.name}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {versionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Loader2
                size={32}
                className='animate-spin'
                style={{ color: theme.palette.grey[400] }}
              />
            </Box>
          ) : versions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <History
                size={48}
                style={{
                  color: theme.palette.grey[300],
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginBottom: 8,
                }}
              />
              <Typography sx={{ color: 'grey.500' }}>暂无版本历史记录</Typography>
              <Typography
                variant='caption'
                sx={{ color: 'grey.400', display: 'block', mt: 0.5 }}
              >
                每次更新文件后系统将自动记录版本
              </Typography>
            </Box>
          ) : (
            <Stack
              spacing={2}
              sx={{ py: 1 }}
            >
              {versions.map((ver, index) => (
                <Box
                  key={ver.id}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: index === 0 ? 'primary.main' : 'divider',
                    borderRadius: 3,
                    bgcolor: index === 0 ? 'primary.50' : 'transparent',
                  }}
                >
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 700 }}
                      >
                        v{ver.version}
                      </Typography>
                      {index === 0 && (
                        <Chip
                          label='当前版本'
                          size='small'
                          color='primary'
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={0.5}
                    >
                      {index !== 0 && versionDoc && (
                        <Tooltip title='恢复到此版本'>
                          <IconButton
                            size='small'
                            onClick={() => handleRestoreVersion(versionDoc, ver)}
                            sx={{ color: 'warning.main' }}
                          >
                            <RotateCcw size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {ver.download_url && (
                        <Tooltip title='下载此版本'>
                          <IconButton
                            size='small'
                            onClick={() => {
                              if (versionDoc) handleDownload(versionDoc);
                            }}
                          >
                            <Download size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>
                  {ver.change_note && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mt: 1, mb: 0.5 }}
                    >
                      {ver.change_note}
                    </Typography>
                  )}
                  <Stack
                    direction='row'
                    spacing={2}
                    sx={{ mt: 0.5 }}
                  >
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ alignItems: 'center' }}
                    >
                      <User
                        size={12}
                        style={{ color: theme.palette.grey[400] }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.500' }}
                      >
                        {ver.created_by || '系统'}
                      </Typography>
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ alignItems: 'center' }}
                    >
                      <Clock
                        size={12}
                        style={{ color: theme.palette.grey[400] }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.500' }}
                      >
                        {new Date(ver.created_at).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography
                      variant='caption'
                      sx={{ color: 'grey.400' }}
                    >
                      {formatFileSize(ver.size)}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVersionHistory(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DocumentCenterPage;
