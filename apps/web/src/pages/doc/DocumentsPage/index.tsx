import { Grid, PageContainer } from '@/components';
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  FileText,
  Folder,
  Upload,
  Search,
  Plus,
  ChevronLeft,
  Star,
  BookOpen,
  MoreVertical,
  Trash2,
  Download,
  Eye,
  History,
  Share2,
  X,
  CheckCircle,
  FolderOpen,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Clock,
  Tag,
  Type,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { docApi, type Folder as FolderType } from '@/api/doc';
import { useNotificationStore } from '@/store';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';
import { DOC_PATHS } from '@/modules/doc/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  TextField,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  useTheme,
} from '@mui/material';
import { ModeToggle } from '@/components/theme/ModeToggle';
import { designTokens } from '@/theme/tokens';

import CreateFolderModal from './components/CreateFolderModal';
import StatCard from './components/StatCard';
import FileCard from './components/FileCard';
import type { FileItem } from './types';
import { ct, formatFileSize } from './utils';

const DocumentsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ['doc-folders'],
    queryFn: async () => {
      const response = await docApi.listFolders();
      if (response.success && response.data?.folders) {
        return response.data.folders;
      }
      return [];
    },
  });

  const { data: files = [], isLoading: filesLoading } = useQuery<FileItem[]>({
    queryKey: ['doc-files', selectedFolderId],
    queryFn: async () => {
      const response = await docApi.list(selectedFolderId || undefined);
      if (response.success && response.data?.files) {
        return response.data.files.map((f): FileItem => ({
          id: f.id,
          name: f.name,
          type: 'file',
          size: formatFileSize(f.size),
          sizeBytes: f.size,
          updatedAt: new Date(f.updated_at).toLocaleString('zh-CN'),
          starred: false,
          tags: [] as string[],
          content_type: f.content_type,
          folder_id: f.folder_id,
        }));
      }
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => docApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-files'] });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => docApi.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-folders'] });
      queryClient.invalidateQueries({ queryKey: ['doc-files'] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string }) =>
      docApi.upload(file, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-files'] });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parent_id?: string }) => docApi.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-folders'] });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    if (!target.files || target.files.length === 0) return;

    const file = target.files[0];
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const response = await uploadMutation.mutateAsync({
        file,
        folderId: selectedFolderId || undefined,
      });
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.data) {
        addNotification({
          title: '成功',
          message: '文件上传成功！',
          type: 'success',
        });
      } else {
        addNotification({
          title: '失败',
          message: response.message || '文件上传失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      clearInterval(progressInterval);
      apiLogger.error('上传文件失败:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || '文件上传失败';
      addNotification({ title: '失败', message: errorMessage, type: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个文件吗？',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          addNotification({
            title: '成功',
            message: '文件删除成功',
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error('删除文件失败:', err);
          addNotification({
            title: '失败',
            message: '文件删除失败',
            type: 'error',
          });
        }
      },
      danger: true,
    });
  };

  const handleDeleteFolder = (id: string, name: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除文件夹 "${name}" 吗？文件夹内的文件不会被删除。`,
      onConfirm: async () => {
        try {
          await deleteFolderMutation.mutateAsync(id);
          if (selectedFolderId === id) {
            setSelectedFolderId(null);
          }
          addNotification({
            title: '成功',
            message: '文件夹删除成功',
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error('删除文件夹失败:', err);
          addNotification({
            title: '失败',
            message: '文件夹删除失败',
            type: 'error',
          });
        }
      },
      danger: true,
    });
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const blob = await docApi.download(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
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
  };

  const [previewingFile, setPreviewingFile] = useState<{
    id: string;
    name: string;
    contentType: string;
  } | null>(null);

  const handlePreview = (file: FileItem) => {
    setPreviewingFile({
      id: file.id,
      name: file.name,
      contentType: file.content_type || '',
    });
  };

  const toggleStar = useCallback(
    (id: string) => {
      queryClient.setQueryData(['doc-files', selectedFolderId], (old: any) => {
        if (!old) return old;
        return old.map((f: any) => (f.id === id ? { ...f, starred: !f.starred } : f));
      });
    },
    [queryClient, selectedFolderId]
  );

  const handleFolderSelect = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedFiles([]);
  }, []);

  const handleCreateFolderSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['doc-folders'] });
    queryClient.invalidateQueries({ queryKey: ['doc-files'] });
  }, [queryClient]);

  const toggleFileSelect = useCallback((fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  }, []);

  const selectAllFiles = useCallback(() => {
    const allFileIds = files.map((f) => f.id);
    setSelectedFiles(allFileIds);
  }, [files]);

  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (selectedFiles.length === 0) return;

    openConfirmDialog({
      title: '确认批量删除',
      message: `确定要删除选中的 ${selectedFiles.length} 个文件吗？`,
      onConfirm: async () => {
        try {
          const deletePromises = selectedFiles.map((id) => deleteMutation.mutateAsync(id));
          await Promise.all(deletePromises);

          setSelectedFiles([]);
          addNotification({
            title: '成功',
            message: `已删除 ${selectedFiles.length} 个文件`,
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error('批量删除失败:', err);
          addNotification({
            title: '失败',
            message: '批量删除失败',
            type: 'error',
          });
        }
      },
      danger: true,
    });
  }, [selectedFiles, addNotification, deleteMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      let uploadedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const response = await uploadMutation.mutateAsync({
            file,
            folderId: selectedFolderId || undefined,
          });
          if (response.success && response.data) {
            uploadedCount++;
          }
        } catch (err: unknown) {
          apiLogger.error(`上传文件 ${file.name} 失败:`, err);
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setUploading(false);
      setUploadProgress(0);

      if (uploadedCount > 0) {
        addNotification({
          title: '成功',
          message: `成功上传 ${uploadedCount} 个文件`,
          type: 'success',
        });
      }
    },

    [selectedFolderId, addNotification, uploadMutation]
  );

  const toggleSort = useCallback(
    (field: 'name' | 'size' | 'date') => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
    },
    [sortBy]
  );

  const allItems = useMemo(
    () => [
      ...folders.map((f) => ({
        id: f.id,
        name: f.name,
        type: 'folder' as const,
        updatedAt: new Date(f.updated_at).toLocaleString('zh-CN'),
        updatedAtRaw: new Date(f.updated_at).getTime(),
        starred: false,
        tags: [],
        sizeBytes: 0,
      })),
      ...files.map((f) => ({
        ...f,
        updatedAtRaw: new Date(f.updatedAt).getTime(),
      })),
    ],
    [folders, files]
  );

  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (fileTypeFilter !== 'all') {
      result = result.filter((item) => {
        if (item.type === 'folder') return false;
        const ext = item.name.split('.').pop()?.toLowerCase();
        return ext === fileTypeFilter;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN');
          break;
        case 'size':
          comparison = (a.sizeBytes || 0) - (b.sizeBytes || 0);
          break;
        case 'date':
          comparison = a.updatedAtRaw - b.updatedAtRaw;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allItems, searchQuery, fileTypeFilter, sortBy, sortOrder]);

  const starredCount = useMemo(() => files.filter((f) => f.starred).length, [files]);
  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  return (
    <PageContainer
      title='文档管理'
      maxWidth={false}
      padding={false}
      bgcolor='grey.100'
      headerProps={{
        pageIcon: <BookOpen style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      {/* Header */}
      <Box
        component='header'
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 64,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Button
                variant='text'
                onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
              >
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </Button>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'grey.900' }}
              >
                文件管理
              </Typography>
              {selectedFolder && (
                <Typography sx={{ color: 'grey.500' }}>/ {selectedFolder.name}</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ModeToggle />
              <Box sx={{ position: 'relative', flex: '1 1 auto', maxWidth: 320 }}>
                <Search
                  sx={{
                    position: 'absolute',
                    left: 2,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 16,
                    height: 16,
                    color: 'grey.400',
                  }}
                />
                <TextField
                  type='text'
                  placeholder='搜索文件...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size='small'
                  sx={{ pl: 10, width: '100%' }}
                />
              </Box>
              <Tooltip title='筛选'>
                <span>
                  <Button
                    variant={showFilters ? 'contained' : 'text'}
                    size='small'
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter sx={{ width: 16, height: 16 }} />
                  </Button>
                </span>
              </Tooltip>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'grey.200',
                  borderRadius: 3,
                  p: 0.5,
                }}
              >
                <Button
                  variant='text'
                  size='small'
                  onClick={() => setViewMode('grid')}
                  sx={{
                    bgcolor: viewMode === 'grid' ? 'background.paper' : 'transparent',
                    boxShadow: viewMode === 'grid' ? 1 : 0,
                  }}
                >
                  <Grid3X3 sx={{ width: 16, height: 16 }} />
                </Button>
                <Button
                  variant='text'
                  size='small'
                  onClick={() => setViewMode('list')}
                  sx={{
                    bgcolor: viewMode === 'list' ? 'background.paper' : 'transparent',
                    boxShadow: viewMode === 'list' ? 1 : 0,
                  }}
                >
                  <List sx={{ width: 16, height: 16 }} />
                </Button>
              </Box>
              <Tooltip title='新建文件夹'>
                <span>
                  <Button
                    variant='text'
                    onClick={() => setShowCreateFolderModal(true)}
                  >
                    <Plus sx={{ width: 20, height: 20 }} />
                  </Button>
                </span>
              </Tooltip>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload sx={{ width: 16, height: 16, mr: 1 }} />
                <span>{uploading ? '上传中...' : '上传'}</span>
              </Button>
              <input
                ref={fileInputRef}
                type='file'
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept='*/*'
              />
            </Box>
          </Box>

          {/* Filters Bar */}
          {showFilters && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                py: 1.5,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Type sx={{ width: 16, height: 16, color: 'grey.400' }} />
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value='all'>全部类型</option>
                  <option value='pdf'>PDF</option>
                  <option value='doc'>Word</option>
                  <option value='xls'>Excel</option>
                  <option value='ppt'>PowerPoint</option>
                  <option value='txt'>文本</option>
                  <option value='jpg'>图片</option>
                  <option value='zip'>压缩包</option>
                </select>
              </Box>
              <Box sx={{ width: 1, height: 16, bgcolor: 'grey.300' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Clock sx={{ width: 16, height: 16, color: 'grey.400' }} />
                <Button
                  variant='text'
                  size='small'
                  onClick={() => toggleSort('date')}
                  sx={{
                    color: sortBy === 'date' ? 'primary.main' : 'grey.700',
                  }}
                >
                  时间{' '}
                  {sortBy === 'date' &&
                    (sortOrder === 'asc' ? (
                      <SortAsc sx={{ width: 12, height: 12, ml: 0.5 }} />
                    ) : (
                      <SortDesc sx={{ width: 12, height: 12, ml: 0.5 }} />
                    ))}
                </Button>
                <Button
                  variant='text'
                  size='small'
                  onClick={() => toggleSort('name')}
                  sx={{
                    color: sortBy === 'name' ? 'primary.main' : 'grey.700',
                  }}
                >
                  名称{' '}
                  {sortBy === 'name' &&
                    (sortOrder === 'asc' ? (
                      <SortAsc sx={{ width: 12, height: 12, ml: 0.5 }} />
                    ) : (
                      <SortDesc sx={{ width: 12, height: 12, ml: 0.5 }} />
                    ))}
                </Button>
                <Button
                  variant='text'
                  size='small'
                  onClick={() => toggleSort('size')}
                  sx={{
                    color: sortBy === 'size' ? 'primary.main' : 'grey.700',
                  }}
                >
                  大小{' '}
                  {sortBy === 'size' &&
                    (sortOrder === 'asc' ? (
                      <SortAsc sx={{ width: 12, height: 12, ml: 0.5 }} />
                    ) : (
                      <SortDesc sx={{ width: 12, height: 12, ml: 0.5 }} />
                    ))}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: 3, py: 2 }}>
          <Card
            sx={{
              bgcolor: 'primary.50',
              border: 1,
              borderColor: 'primary.200',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500, color: 'primary.900' }}
                >
                  文件上传中...
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'primary.700' }}
                >
                  {uploadProgress}%
                </Typography>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  bgcolor: 'primary.200',
                  borderRadius: 1,
                  height: 8,
                }}
              >
                <Box
                  sx={{
                    bgcolor: 'primary.main',
                    height: 8,
                    borderRadius: 1,
                    transition: 'width 0.3s',
                    width: `${uploadProgress}%`,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Main Content */}
      <Box
        component='main'
        sx={{ maxWidth: 1400, mx: 'auto', px: 3, py: 4 }}
      >
        <Box sx={{ display: 'flex', gap: 4 }}>
          {/* Sidebar */}
          <Box sx={{ width: 256, flexShrink: 0 }}>
            <Card sx={{ position: 'sticky', top: 96 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Button
                    variant='text'
                    onClick={() => handleFolderSelect(null)}
                    sx={{ justifyContent: 'flex-start', width: '100%' }}
                  >
                    {selectedFolderId === null ? (
                      <FolderOpen sx={{ width: 20, height: 20, mr: 1.5 }} />
                    ) : (
                      <Folder sx={{ width: 20, height: 20, mr: 1.5 }} />
                    )}
                    <span style={{ fontWeight: 500 }}>全部文件</span>
                  </Button>

                  {folders.map((folder) => (
                    <Box
                      key={folder.id}
                      sx={{ '&:hover > .delete-btn': { opacity: 1 } }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                          variant='text'
                          onClick={() => handleFolderSelect(folder.id)}
                          sx={{ flex: 1, justifyContent: 'flex-start' }}
                        >
                          {selectedFolderId === folder.id ? (
                            <FolderOpen sx={{ width: 20, height: 20, mr: 1.5 }} />
                          ) : (
                            <Folder sx={{ width: 20, height: 20, mr: 1.5 }} />
                          )}
                          <span
                            style={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {folder.name}
                          </span>
                        </Button>
                        <Tooltip title='删除文件夹'>
                          <span>
                            <Button
                              variant='text'
                              size='small'
                              className='delete-btn'
                              sx={{
                                opacity: 0,
                                color: 'grey.400',
                                '&:hover': {
                                  color: 'error.main',
                                  bgcolor: 'error.50',
                                },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id, folder.name);
                              }}
                            >
                              <Trash2 sx={{ width: 16, height: 16 }} />
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Content Area */}
          <Box sx={{ flex: 1 }}>
            {/* Quick Stats */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: 3,
                mb: 3,
              }}
            >
              <StatCard
                icon={Folder}
                title='文件夹'
                value={String(folders.length)}
                color='blue'
              />
              <StatCard
                icon={FileText}
                title='文件'
                value={String(files.length)}
                color='purple'
              />
              <StatCard
                icon={Star}
                title='星标'
                value={String(starredCount)}
                color='yellow'
              />
              <StatCard
                icon={History}
                title='最近更新'
                value={String(files.length)}
                color='green'
              />
            </Box>

            {/* Batch Actions Bar */}
            {selectedFiles.length > 0 && (
              <Card
                sx={{
                  mb: 3,
                  border: 1,
                  borderColor: 'primary.200',
                  bgcolor: 'primary.50',
                }}
              >
                <CardContent
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500, color: 'primary.900' }}
                    >
                      已选择 {selectedFiles.length} 个文件
                    </Typography>
                    <Button
                      variant='text'
                      size='small'
                      onClick={clearSelection}
                    >
                      取消选择
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant='contained'
                      size='small'
                      color='error'
                      onClick={handleBatchDelete}
                    >
                      <Trash2 sx={{ width: 16, height: 16, mr: 1 }} />
                      批量删除
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Drag and Drop Zone */}
            <Box
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                mb: 3,
                border: 2,
                borderStyle: 'dashed',
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                borderColor: isDragging ? 'primary.main' : 'grey.300',
                bgcolor: isDragging ? 'primary.50' : 'transparent',
                '&:hover': { borderColor: 'grey.400' },
                transition: 'all 0.2s',
              }}
            >
              <Upload
                sx={{
                  width: 48,
                  height: 48,
                  mx: 'auto',
                  mb: 2,
                  color: isDragging ? 'primary.main' : 'grey.400',
                }}
              />
              <Typography
                variant='h6'
                sx={{ mb: 1, color: isDragging ? 'primary.main' : 'grey.700' }}
              >
                {isDragging ? '释放以上传文件' : '拖拽文件到这里上传'}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                支持 PDF、Word、Excel、图片等格式
              </Typography>
            </Box>

            {/* Files Grid/List */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs
                value={viewMode}
                onChange={(_, val) => setViewMode(val as 'grid' | 'list')}
              >
                <Tab
                  value='grid'
                  label='网格视图'
                />
                <Tab
                  value='list'
                  label='列表视图'
                />
              </Tabs>
            </Box>
            {viewMode === 'grid' && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    md: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                    xl: 'repeat(4, 1fr)',
                  },
                  gap: 3,
                }}
              >
                {filteredItems.map((item) =>
                  item.type === 'folder' ? (
                    <Card
                      key={item.id}
                      onClick={() => handleFolderSelect(item.id)}
                      sx={{
                        '&:hover': { boxShadow: 6 },
                        transition: 'box-shadow 0.2s',
                        cursor: 'pointer',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: 3,
                              bgcolor: 'primary.100',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Folder
                              sx={{
                                width: 28,
                                height: 28,
                                color: 'primary.main',
                              }}
                            />
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              opacity: 0,
                            }}
                          >
                            <Tooltip title='删除文件夹'>
                              <Button
                                variant='text'
                                size='small'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(item.id, item.name);
                                }}
                              >
                                <Trash2 sx={{ width: 16, height: 16 }} />
                              </Button>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Typography
                          variant='h6'
                          sx={{
                            fontWeight: 600,
                            color: 'grey.900',
                            mb: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500' }}
                        >
                          <span>{item.updatedAt}</span>
                        </Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    <FileCard
                      key={item.id}
                      file={item}
                      onStarToggle={(id) => toggleStar(id)}
                      onDownload={handleDownload}
                      onPreview={handlePreview}
                      isSelected={selectedFiles.includes(item.id)}
                      onSelect={toggleFileSelect}
                      onClick={(file) => navigate(DOC_PATHS.documentDetail.replace(':id', file.id))}
                    />
                  )
                )}
              </Box>
            )}
            {viewMode === 'list' && (
              <Card sx={{ overflow: 'hidden' }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box
                      component='table'
                      sx={{ width: '100%' }}
                    >
                      <Box
                        component='thead'
                        sx={{ bgcolor: 'grey.100' }}
                      >
                        <tr>
                          <th
                            style={{
                              padding: '12px 24px',
                              textAlign: 'left',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: theme.palette.grey[500],
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            名称
                          </th>
                          <th
                            style={{
                              padding: '12px 24px',
                              textAlign: 'left',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: theme.palette.grey[500],
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            大小
                          </th>
                          <th
                            style={{
                              padding: '12px 24px',
                              textAlign: 'left',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: theme.palette.grey[500],
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            更新时间
                          </th>
                          <th
                            style={{
                              padding: '12px 24px',
                              textAlign: 'left',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: theme.palette.grey[500],
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            操作
                          </th>
                        </tr>
                      </Box>
                      <Box
                        component='tbody'
                        sx={{
                          '& > tr': { borderTop: 1, borderColor: 'divider' },
                        }}
                      >
                        {filteredItems.map((item) =>
                          item.type === 'folder' ? (
                            <tr
                              key={item.id}
                              onClick={() => handleFolderSelect(item.id)}
                              style={{
                                cursor: 'pointer',
                              }}
                            >
                              <td
                                style={{
                                  padding: '16px 24px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Folder
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      color: 'primary.main',
                                      mr: 1.5,
                                    }}
                                  />
                                  <Box>
                                    <Typography
                                      variant='body2'
                                      sx={{
                                        fontWeight: 500,
                                        color: 'grey.900',
                                      }}
                                    >
                                      {item.name}
                                    </Typography>
                                  </Box>
                                </Box>
                              </td>
                              <td
                                style={{
                                  padding: '16px 24px',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.875rem',
                                  color: theme.palette.grey[500],
                                }}
                              >
                                -
                              </td>
                              <td
                                style={{
                                  padding: '16px 24px',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.875rem',
                                  color: theme.palette.grey[500],
                                }}
                              >
                                {item.updatedAt}
                              </td>
                              <td
                                style={{
                                  padding: '16px 24px',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  <Button
                                    variant='text'
                                    size='small'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFolder(item.id, item.name);
                                    }}
                                  >
                                    <Trash2 sx={{ width: 16, height: 16 }} />
                                  </Button>
                                </Box>
                              </td>
                            </tr>
                          ) : (
                            <tr
                              key={item.id}
                              onClick={() =>
                                navigate(DOC_PATHS.documentDetail.replace(':id', item.id))
                              }
                              style={{ cursor: 'pointer' }}
                            >
                              <td
                                style={{
                                  padding: '16px 24px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <FileText
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      color: 'secondary.main',
                                      mr: 1.5,
                                    }}
                                  />
                                  <Box>
                                    <Typography
                                      variant='body2'
                                      sx={{
                                        fontWeight: 500,
                                        color: 'grey.900',
                                      }}
                                    >
                                      {item.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                      {item.tags.map((tag) => (
                                        <Chip
                                          key={tag}
                                          label={tag}
                                          size='small'
                                          variant='outlined'
                                        />
                                      ))}
                                    </Box>
                                  </Box>
                                </Box>
                              </td>
                              <td
                                style={{
                                  padding: '16px 24px',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.875rem',
                                  color: theme.palette.grey[500],
                                }}
                              >
                                {item.size || '-'}
                              </td>
                              <td
                                style={{
                                  padding: '16px 24px',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.875rem',
                                  color: theme.palette.grey[500],
                                }}
                              >
                                {item.updatedAt}
                              </td>
                              <td
                                style={{
                                  padding: '16px 24px',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  <Button
                                    variant='text'
                                    size='small'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePreview(item);
                                    }}
                                  >
                                    <Eye sx={{ width: 16, height: 16 }} />
                                  </Button>
                                  <Button
                                    variant='text'
                                    size='small'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(item);
                                    }}
                                  >
                                    <Download sx={{ width: 16, height: 16 }} />
                                  </Button>
                                  <Button
                                    variant='text'
                                    size='small'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleStar(item.id);
                                    }}
                                  >
                                    <Star
                                      sx={{ width: 16, height: 16 }}
                                      style={{
                                        fill: item.starred ? 'currentColor' : 'none',
                                      }}
                                    />
                                  </Button>
                                  <Button
                                    variant='text'
                                    size='small'
                                    color='error'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(item.id);
                                    }}
                                  >
                                    <Trash2 sx={{ width: 16, height: 16 }} />
                                  </Button>
                                </Box>
                              </td>
                            </tr>
                          )
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Box>

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onSuccess={handleCreateFolderSuccess}
        parentId={selectedFolderId}
        createFolderMutation={createFolderMutation}
      />

      <DocumentPreviewModal
        isOpen={previewingFile !== null}
        onClose={() => setPreviewingFile(null)}
        fileId={previewingFile?.id || ''}
        fileName={previewingFile?.name || ''}
        contentType={previewingFile?.contentType || ''}
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

export default DocumentsPage;
