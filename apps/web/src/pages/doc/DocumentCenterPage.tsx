import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  ChevronRight,
  History,
  RotateCcw,
  User,
  Loader2,
} from 'lucide-react';
import i18n from '@/i18n';
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

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface DocumentWithFavorite extends FileMetadata {
  is_favorite?: boolean;
  tags?: string[];
  category?: string;
}

const DocumentCenterPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const theme = useTheme();

  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({
    category: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionDoc, setVersionDoc] = useState<DocumentWithFavorite | null>(null);

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

  const documentsQuery = useQuery<{ documents: DocumentWithFavorite[]; total: number }>({
    queryKey: QUERY_KEYS.DOC.DOCUMENTS,
    queryFn: async () => {
      const res = await docApi.list();
      if (res.success && res.data) {
        const data = res.data;
        const files = data.files ?? data.items ?? [];
        const docs: DocumentWithFavorite[] = files.map((file) => ({
          ...file,
          is_favorite: false,
          tags: [],
          category: file.folder_id
            ? i18n.t('pages.document_center_page.k1')
            : i18n.t('pages.document_center_page.k0'),
        }));
        return { documents: docs, total: data.total ?? 0 };
      }
      return { documents: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const foldersQuery = useQuery<FolderType[]>({
    queryKey: QUERY_KEYS.DOC.FOLDERS,
    queryFn: async () => {
      const res = await docApi.listFolders();
      if (res.success && res.data) {
        return res.data.folders ?? res.data.items ?? [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const versionsQuery = useQuery<FileVersion[]>({
    queryKey: QUERY_KEYS.DOC.VERSIONS(versionDoc?.id || 'none'),
    queryFn: async () => {
      if (!versionDoc) return [];
      const res = await docApi.getVersions(versionDoc.id);
      return res.success && res.data ? res.data : [];
    },
    enabled: !!versionDoc && showVersionHistory,
    staleTime: 5 * 60 * 1000,
  });

  const documents = documentsQuery.data?.documents ?? [];
  const folders = foldersQuery.data ?? [];
  const total = documentsQuery.data?.total ?? 0;
  const loading = documentsQuery.isLoading;
  const versions = versionsQuery.data ?? [];
  const versionsLoading = versionsQuery.isLoading;

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await docApi.delete(docId);
      if (!res.success) throw new Error(res.message || i18n.t('pages.document_center_page.k2'));
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DOC.DOCUMENTS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.document_center_page.k4'),
        message: i18n.t('pages.document_center_page.k3'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      logger.error(i18n.t('pages.document_center_page.k0'), err);
      addNotification({
        title: i18n.t('pages.document_center_page.k6'),
        message: i18n.t('pages.document_center_page.k5'),
        type: 'error',
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await docApi.upload(file);
      }
    },
    onSuccess: (_data, files) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DOC.DOCUMENTS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.document_center_page.k7'),
        message: `${i18n.t('pages.document_center_page.k1')}${files.length}${i18n.t('pages.document_center_page.k2')}`,
        type: 'success',
      });
      setShowUploadModal(false);
      setUploadFiles([]);
    },
    onError: (err: unknown) => {
      logger.error(i18n.t('pages.document_center_page.k3'), err);
      addNotification({
        title: i18n.t('pages.document_center_page.k9'),
        message: i18n.t('pages.document_center_page.k8'),
        type: 'error',
      });
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async ({ fileId, version }: { fileId: string; version: number }) => {
      const res = await docApi.restoreVersion(fileId, version);
      if (!res.success) throw new Error(res.message || i18n.t('pages.document_center_page.k10'));
      return res;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DOC.DOCUMENTS,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DOC.VERSIONS(variables.fileId),
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.document_center_page.k12'),
        message: i18n.t('pages.document_center_page.k11'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      logger.error(i18n.t('pages.document_center_page.k4'), err);
      addNotification({
        title: i18n.t('pages.document_center_page.k14'),
        message: i18n.t('pages.document_center_page.k13'),
        type: 'error',
      });
    },
  });

  const uploading = uploadMutation.isPending;

  useEffect(() => {
    if (documentsQuery.isError) {
      logger.error(i18n.t('pages.document_center_page.k5'), documentsQuery.error);
      addNotification({
        title: i18n.t('pages.document_center_page.k16'),
        message: i18n.t('pages.document_center_page.k15'),
        type: 'error',
      });
    }
  }, [documentsQuery.isError, documentsQuery.error, addNotification]);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !filterValues.category || doc.category === filterValues.category;

    return matchesSearch && matchesCategory;
  });

  const handleFilterChange = (filters: Record<string, unknown>) => {
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
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.DOC.DOCUMENTS,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.DOC.FOLDERS,
      exact: false,
      refetchType: 'active',
    });
  };

  const handleToggleFavorite = (docId: string) => {
    queryClient.setQueryData<{ documents: DocumentWithFavorite[]; total: number }>(
      QUERY_KEYS.DOC.DOCUMENTS,
      (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.map((doc) =>
            doc.id === docId ? { ...doc, is_favorite: !doc.is_favorite } : doc
          ),
        };
      }
    );
    addNotification({
      title: i18n.t('pages.document_center_page.k17'),
      message: i18n.t('pages.document_center_page.k18'),
      type: 'success',
    });
  };

  const handlePreview = (doc: DocumentWithFavorite) => {
    addNotification({
      title: i18n.t('pages.document_center_page.k19'),
      message: `${i18n.t('pages.document_center_page.k6')}${doc.name}`,
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
        title: i18n.t('pages.document_center_page.k20'),
        message: `${i18n.t('pages.document_center_page.k7')}${doc.name}`,
        type: 'success',
      });
    } catch (err: unknown) {
      logger.error(i18n.t('pages.document_center_page.k8'), err);
      addNotification({
        title: i18n.t('pages.document_center_page.k21'),
        message: i18n.t('pages.document_center_page.k22'),
        type: 'error',
      });
    }
  };

  const handleDelete = (docId: string) => {
    if (!confirm(i18n.t('pages.document_center_page.k23'))) return;
    deleteMutation.mutate(docId);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadFiles(files);
    }
  };

  const handleUpload = () => {
    if (uploadFiles.length === 0) {
      addNotification({
        title: i18n.t('pages.document_center_page.k24'),
        message: i18n.t('pages.document_center_page.k25'),
        type: 'warning',
      });
      return;
    }
    uploadMutation.mutate(uploadFiles);
  };

  const handleOpenVersionHistory = (doc: DocumentWithFavorite) => {
    setVersionDoc(doc);
    setShowVersionHistory(true);
  };

  const handleRestoreVersion = (doc: DocumentWithFavorite, version: FileVersion) => {
    restoreVersionMutation.mutate({ fileId: doc.id, version: version.version });
  };

  const filters = [
    {
      id: 'category',
      label: i18n.t('pages.document_center_page.k26'),
      type: 'select' as const,
      options: [
        { label: i18n.t('pages.document_center_page.k27'), value: '' },
        {
          label: i18n.t('pages.document_center_page.k28'),
          value: i18n.t('pages.document_center_page.k29'),
        },
        {
          label: i18n.t('pages.document_center_page.k30'),
          value: i18n.t('pages.document_center_page.k31'),
        },
        {
          label: i18n.t('pages.document_center_page.k32'),
          value: i18n.t('pages.document_center_page.k33'),
        },
      ],
    },
  ];

  const cardConfig: CardRenderConfig = {
    title: (item: unknown) => (item as DocumentWithFavorite).name,
    description: (item: unknown) => (item as DocumentWithFavorite).category || '',
    meta: [
      {
        field: 'size',
        label: i18n.t('pages.document_center_page.k34'),
        icon: <File size={14} />,
        format: (value: unknown) => formatFileSize(value as number),
      },
      {
        field: 'updated_at',
        label: i18n.t('pages.document_center_page.k35'),
        icon: <Clock size={14} />,
        format: (value: unknown) => (value as string).split('T')[0] || '-',
      },
      {
        field: 'created_by',
        label: i18n.t('pages.document_center_page.k36'),
        format: (value: unknown) => (value as string) || '-',
      },
    ],
    tags: [
      {
        field: 'is_favorite',
        options: {
          true: { label: i18n.t('pages.document_center_page.k37'), color: 'warning' },
        },
      },
    ],
    icon: (item: unknown) => getFileIcon((item as DocumentWithFavorite).content_type),
    iconBgColor: 'background.paper',
  };

  const cardActions: CardAction[] = [
    {
      label: i18n.t('pages.document_center_page.k38'),
      icon: <Eye size={16} />,
      onClick: (item: unknown) => handlePreview(item as DocumentWithFavorite),
      color: 'primary',
      variant: 'text',
    },
    {
      label: i18n.t('pages.document_center_page.k39'),
      icon: <Download size={16} />,
      onClick: (item: unknown) => handleDownload(item as DocumentWithFavorite),
      color: 'success',
      variant: 'text',
    },
    {
      label: i18n.t('pages.document_center_page.k40'),
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
      label: i18n.t('pages.document_center_page.k41'),
      icon: <History size={16} />,
      onClick: (item: unknown) => handleOpenVersionHistory(item as DocumentWithFavorite),
      color: 'primary',
      variant: 'text',
    },
    {
      label: i18n.t('pages.document_center_page.k42'),
      icon: <Trash2 size={16} />,
      onClick: (item: unknown) => handleDelete((item as DocumentWithFavorite).id),
      color: 'error',
      variant: 'text',
    },
  ];

  return (
    <PageContainer
      title={i18n.t('pages.document_center_page.k43')}
      subtitle={i18n.t('pages.document_center_page.k44')}
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
              {i18n.t('pages.document_center_page.k0')}
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
            {i18n.t('pages.document_center_page.k1')}
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
          placeholder: i18n.t('pages.document_center_page.k9'),
        }}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        onSearch={handleSearch}
        addButton={{
          text: i18n.t('pages.document_center_page.k45'),
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
        <DialogTitle>{i18n.t('pages.document_center_page.k46')}</DialogTitle>
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
                {i18n.t('pages.document_center_page.k0')}{' '}
                <Box
                  component='span'
                  sx={{ color: 'primary.main', cursor: 'pointer' }}
                >
                  {i18n.t('pages.document_center_page.k2')}
                </Box>
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'grey.500' }}
              >
                {i18n.t('pages.document_center_page.k3')}
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
              {i18n.t('pages.document_center_page.k4')}
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
                      {i18n.t('pages.document_center_page.k5')}
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadModal(false)}>
            {i18n.t('pages.document_center_page.k47')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || uploadFiles.length === 0}
          >
            {uploading
              ? i18n.t('pages.document_center_page.k10')
              : i18n.t('pages.document_center_page.k48')}
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
            <Typography>{i18n.t('pages.document_center_page.k0')}</Typography>
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
              <Typography sx={{ color: 'grey.500' }}>
                {i18n.t('pages.document_center_page.k49')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'grey.400', display: 'block', mt: 0.5 }}
              >
                {i18n.t('pages.document_center_page.k6')}
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
                          label={i18n.t('pages.document_center_page.k50')}
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
                        <Tooltip title={i18n.t('pages.document_center_page.k51')}>
                          <IconButton
                            size='small'
                            onClick={() => handleRestoreVersion(versionDoc, ver)}
                            sx={{ color: 'warning.main' }}
                            aria-label={i18n.t('pages.document_center_page.k52')}
                          >
                            <RotateCcw size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {ver.download_url && (
                        <Tooltip title={i18n.t('pages.document_center_page.k53')}>
                          <IconButton
                            size='small'
                            onClick={() => {
                              if (versionDoc) handleDownload(versionDoc);
                            }}
                            aria-label={i18n.t('pages.document_center_page.k54')}
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
                        {ver.created_by || i18n.t('pages.document_center_page.k55')}
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
          <Button onClick={() => setShowVersionHistory(false)}>
            {i18n.t('pages.document_center_page.k56')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DocumentCenterPage;
