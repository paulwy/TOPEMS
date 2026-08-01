import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { docApi, type Folder as FolderType } from '@/api/doc';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useConfirmDialog } from '@/hooks';
import { DOC_PATHS } from '@/modules/doc/config';
import { formatFileSize } from '../utils';
import type { FileItem, DisplayItem, SortField, SortOrder, ViewMode } from '../types';

export interface PreviewingFile {
  id: string;
  name: string;
  contentType: string;
}

export const useDocumentsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // Search / view / folder state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modal / dialog state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [previewingFile, setPreviewingFile] = useState<PreviewingFile | null>(null);

  // Selection state
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Filter / sort state
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');

  // Drag-drop state
  const [isDragging, setIsDragging] = useState(false);

  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { data: folders = [] } = useQuery<FolderType[]>({
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
          title: t('doc.documents.success'),
          message: t('doc.documents.upload_success'),
          type: 'success',
        });
      } else {
        addNotification({
          title: t('doc.documents.failed'),
          message: response.message || t('doc.documents.upload_failed'),
          type: 'error',
        });
      }
    } catch (err: unknown) {
      clearInterval(progressInterval);
      apiLogger.error(t('doc.documents.upload_failed_log'), err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        error.response?.data?.message || error.message || t('doc.documents.upload_failed');
      addNotification({ title: t('doc.documents.failed'), message: errorMessage, type: 'error' });
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
      title: t('doc.documents.confirm_delete'),
      message: t('doc.documents.confirm_delete_file_msg'),
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          addNotification({
            title: t('doc.documents.success'),
            message: t('doc.documents.delete_success'),
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error(t('doc.documents.delete_failed_log'), err);
          addNotification({
            title: t('doc.documents.failed'),
            message: t('doc.documents.delete_failed'),
            type: 'error',
          });
        }
      },
      danger: true,
    });
  };

  const handleDeleteFolder = (id: string, name: string) => {
    openConfirmDialog({
      title: t('doc.documents.confirm_delete'),
      message: t('doc.documents.confirm_delete_folder_msg', { name }),
      onConfirm: async () => {
        try {
          await deleteFolderMutation.mutateAsync(id);
          if (selectedFolderId === id) {
            setSelectedFolderId(null);
          }
          addNotification({
            title: t('doc.documents.success'),
            message: t('doc.documents.delete_folder_success'),
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error(t('doc.documents.delete_folder_failed_log'), err);
          addNotification({
            title: t('doc.documents.failed'),
            message: t('doc.documents.delete_folder_failed'),
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
        title: t('doc.documents.success'),
        message: t('doc.documents.download_success'),
        type: 'success',
      });
    } catch (err: unknown) {
      apiLogger.error(t('doc.documents.download_failed_log'), err);
      addNotification({
        title: t('doc.documents.failed'),
        message: t('doc.documents.download_failed'),
        type: 'error',
      });
    }
  };

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
      title: t('doc.documents.confirm_batch_delete'),
      message: t('doc.documents.confirm_batch_delete_msg', { count: selectedFiles.length }),
      onConfirm: async () => {
        try {
          const deletePromises = selectedFiles.map((id) => deleteMutation.mutateAsync(id));
          await Promise.all(deletePromises);

          setSelectedFiles([]);
          addNotification({
            title: t('doc.documents.success'),
            message: t('doc.documents.batch_delete_success', { count: selectedFiles.length }),
            type: 'success',
          });
        } catch (err: unknown) {
          apiLogger.error(t('doc.documents.batch_delete_failed_log'), err);
          addNotification({
            title: t('doc.documents.failed'),
            message: t('doc.documents.batch_delete_failed'),
            type: 'error',
          });
        }
      },
      danger: true,
    });
  }, [selectedFiles, addNotification, deleteMutation, t, openConfirmDialog]);

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
          apiLogger.error(t('doc.documents.upload_file_failed_log', { name: file.name }), err);
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setUploading(false);
      setUploadProgress(0);

      if (uploadedCount > 0) {
        addNotification({
          title: t('doc.documents.success'),
          message: t('doc.documents.upload_count_success', { count: uploadedCount }),
          type: 'success',
        });
      }
    },
    [selectedFolderId, addNotification, uploadMutation, t]
  );

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
    },
    [sortBy]
  );

  const allItems = useMemo<DisplayItem[]>(
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
        sizeBytes: f.sizeBytes ?? 0,
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

  const openFileDetail = useCallback(
    (file: FileItem) => {
      navigate(DOC_PATHS.documentDetail.replace(':id', file.id));
    },
    [navigate]
  );

  return {
    // navigation / notifications
    t,
    navigate,

    // raw state
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    selectedFolderId,
    uploading,
    uploadProgress,
    showCreateFolderModal,
    setShowCreateFolderModal,
    previewingFile,
    setPreviewingFile,
    selectedFiles,
    showFilters,
    setShowFilters,
    sortBy,
    sortOrder,
    fileTypeFilter,
    setFileTypeFilter,
    isDragging,
    fileInputRef,
    dropZoneRef,

    // confirm dialog
    confirmDialogOpen,
    confirmDialogConfig,
    setConfirmDialogClosed,

    // query data
    folders,
    files,
    filesLoading,
    selectedFolder,
    starredCount,

    // mutations
    createFolderMutation,

    // derived data
    filteredItems,

    // handlers
    handleFileUpload,
    handleDelete,
    handleDeleteFolder,
    handleDownload,
    handlePreview,
    toggleStar,
    handleFolderSelect,
    handleCreateFolderSuccess,
    toggleFileSelect,
    selectAllFiles,
    clearSelection,
    handleBatchDelete,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    toggleSort,
    openFileDetail,
  };
};

export type UseDocumentsPageReturn = ReturnType<typeof useDocumentsPage>;
