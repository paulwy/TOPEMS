import { PageContainer } from '@/components';
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  FileText,
  Folder,
  Upload,
  Search,
  Plus,
  ChevronLeft,
  Star,
  BookOpen,
  Trash2,
  Download,
  Eye,
  History,
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
import i18n from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { docApi, type Folder as FolderType } from '@/api/doc';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { DOC_PATHS } from '@/modules/doc/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  TextField,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  Box,
  Typography,
  Button,
  useTheme,
} from '@mui/material';
import { ModeToggle } from '@/components/theme/ModeToggle';

import CreateFolderModal from './components/CreateFolderModal';
import StatCard from './components/StatCard';
import FileCard from './components/FileCard';
import DocumentTree from './components/DocumentTree';
import DocumentList from './components/DocumentList';
import DocumentPreview from './components/DocumentPreview';
import UploadDialog from './components/UploadDialog';
import type { FileItem, DisplayItem, ViewMode } from './types';
import { ct, formatFileSize } from './utils';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

const DocumentsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { data: folders = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.DOC_FOLDERS_BASE,
    queryFn: async () => {
      const response = await docApi.listFolders();
      if (response.success && response.data?.folders) {
        return response.data.folders;
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: files = [], isPending: filesLoading } = useQuery<FileItem[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.DOC_FILES_BASE, selectedFolderId],
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

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => docApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.DOC_FILES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => docApi.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.DOC_FOLDERS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.DOC_FILES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string }) =>
      docApi.upload(file, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.DOC_FILES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId?: string }) => docApi.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.DOC_FOLDERS_BASE,
        exact: false,
        refetchType: 'active',
      });
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
          title: i18n.t('pages.index.k0'),
          message: i18n.t('pages.index.k1'),
          type: 'success',
        });
      } else {
        addNotification({
          title: i18n.t('pages.index.k2'),
          message: response.message || i18n.t('pages.index.k3'),
          type: 'error',
        });
      }
    } catch (err: unknown) {
      clearInterval(progressInterval);
      apiLogger.error(i18n.t('pages.index.k0'), err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        error.response?.data?.message || error.message || i18n.t('pages.index.k4');
      addNotification({ title: i18n.t('pages.index.k5'), message: errorMessage, type: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (id: string) => {
    openConfirmDialog({
      title: i18n.t('pages.index.k6'),
      message: i18n.t('pages.index.k7'),
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          addNotification({
            title: i18n.t('pages.index.k8'),
            message: i18n.t('pages.index.k9'),
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error(i18n.t('pages.index.k1'), err);
          addNotification({
            title: i18n.t('pages.index.k10'),
            message: i18n.t('pages.index.k11'),
            type: 'error',
          });
        }
      },
      danger: true,
    });
  };

  const handleDeleteFolder = (id: string, name: string) => {
    openConfirmDialog({
      title: i18n.t('pages.index.k12'),
      message: `${i18n.t('pages.index.k2')}${name}${i18n.t('pages.index.k3')}`,
      onConfirm: async () => {
        try {
          await deleteFolderMutation.mutateAsync(id);
          if (selectedFolderId === id) {
            setSelectedFolderId(null);
          }
          addNotification({
            title: i18n.t('pages.index.k13'),
            message: i18n.t('pages.index.k14'),
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error(i18n.t('pages.index.k4'), err);
          addNotification({
            title: i18n.t('pages.index.k15'),
            message: i18n.t('pages.index.k16'),
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
        title: i18n.t('pages.index.k17'),
        message: i18n.t('pages.index.k18'),
        type: 'success',
      });
    } catch (err: unknown) {
      apiLogger.error(i18n.t('pages.index.k5'), err);
      addNotification({
        title: i18n.t('pages.index.k19'),
        message: i18n.t('pages.index.k20'),
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
      queryClient.setQueryData(['doc-files', selectedFolderId], (old: FileItem[] | undefined) => {
        if (!old) return old;
        return old.map((f: FileItem) => (f.id === id ? { ...f, starred: !f.starred } : f));
      });
    },
    [queryClient, selectedFolderId]
  );

  const handleFolderSelect = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedFiles([]);
  }, []);

  const handleCreateFolderSuccess = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.DOC_FOLDERS_BASE,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.DOC_FILES_BASE,
      exact: false,
      refetchType: 'active',
    });
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
      title: i18n.t('pages.index.k21'),
      message: `${i18n.t('pages.index.k6')} ${selectedFiles.length} ${i18n.t('pages.index.k7')}`,
      onConfirm: async () => {
        try {
          const deletePromises = selectedFiles.map((id) => deleteMutation.mutateAsync(id));
          await Promise.all(deletePromises);

          setSelectedFiles([]);
          addNotification({
            title: i18n.t('pages.index.k22'),
            message: `${i18n.t('pages.index.k8')} ${selectedFiles.length} ${i18n.t('pages.index.k9')}`,
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error(i18n.t('pages.index.k10'), err);
          addNotification({
            title: i18n.t('pages.index.k23'),
            message: i18n.t('pages.index.k24'),
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
          apiLogger.error(
            `${i18n.t('pages.index.k11')} ${file.name} ${i18n.t('pages.index.k12')}`,
            err
          );
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setUploading(false);
      setUploadProgress(0);

      if (uploadedCount > 0) {
        addNotification({
          title: i18n.t('pages.index.k25'),
          message: `${i18n.t('pages.index.k13')} ${uploadedCount} ${i18n.t('pages.index.k14')}`,
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
      title={i18n.t('pages.index.k26')}
      maxWidth={false}
      padding={false}
      bgcolor='grey.100'
      headerProps={{
        pageIcon: <BookOpen style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
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
                {i18n.t('pages.index.k15')}
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
                  placeholder={i18n.t('pages.index.k16')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size='small'
                  sx={{ pl: 10, width: '100%' }}
                />
              </Box>
              <Tooltip title={i18n.t('pages.index.k27')}>
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
              <Tooltip title={i18n.t('pages.index.k28')}>
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
                <span>{uploading ? i18n.t('pages.index.k17') : i18n.t('pages.index.k29')}</span>
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
                  <option value='all'>{i18n.t('pages.index.k30')}</option>
                  <option value='pdf'>PDF</option>
                  <option value='doc'>Word</option>
                  <option value='xls'>Excel</option>
                  <option value='ppt'>PowerPoint</option>
                  <option value='txt'>{i18n.t('pages.index.k31')}</option>
                  <option value='jpg'>{i18n.t('pages.index.k32')}</option>
                  <option value='zip'>{i18n.t('pages.index.k33')}</option>
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
                  {i18n.t('pages.index.k0')}{' '}
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
                  {i18n.t('pages.index.k1')}{' '}
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
                  {i18n.t('pages.index.k2')}{' '}
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

      <UploadDialog
        uploading={uploading}
        uploadProgress={uploadProgress}
      />

      <Box
        component='main'
        sx={{ maxWidth: 1400, mx: 'auto', px: 3, py: 4 }}
      >
        <Box sx={{ display: 'flex', gap: 4 }}>
          <DocumentTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleFolderSelect}
            onDeleteFolder={handleDeleteFolder}
          />

          <DocumentList
            folders={folders}
            files={files}
            filteredItems={filteredItems as DisplayItem[]}
            selectedFiles={selectedFiles}
            starredCount={starredCount}
            viewMode={viewMode}
            isDragging={isDragging}
            onSelectFolder={handleFolderSelect}
            onDeleteFolder={handleDeleteFolder}
            onToggleSelect={toggleFileSelect}
            onClearSelection={clearSelection}
            onBatchDelete={handleBatchDelete}
            onStarToggle={toggleStar}
            onDownload={handleDownload}
            onPreview={handlePreview}
            onDelete={handleDelete}
            onViewModeChange={(mode) => setViewMode(mode)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            dropZoneRef={dropZoneRef as React.RefObject<HTMLDivElement>}
          />
        </Box>
      </Box>

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onSuccess={handleCreateFolderSuccess}
        parentId={selectedFolderId}
        createFolderMutation={createFolderMutation}
      />

      <DocumentPreview
        previewFile={previewingFile}
        onClose={() => setPreviewingFile(null)}
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default DocumentsPage;
