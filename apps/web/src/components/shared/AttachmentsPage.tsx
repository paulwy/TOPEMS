import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  FileArchive,
} from 'lucide-react';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { attachmentApi, type Attachment } from '@/api/shared';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

const ENTITY_TYPES = ['document', 'task', 'project', 'ticket', 'order'] as const;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getFileIcon = (fileType: string): React.ReactNode => {
  if (fileType.startsWith('image/')) return <ImageIcon size={20} />;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text'))
    return <FileText size={20} />;
  if (fileType.includes('zip') || fileType.includes('compressed')) return <FileArchive size={20} />;
  return <FileIcon size={20} />;
};

const AttachmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const [entityType, setEntityType] = useState<string>('document');
  const [entityId, setEntityId] = useState<string>('demo-1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 获取附件列表
  const { data: attachments, isPending } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE, entityType, entityId],
    queryFn: async () => {
      const response = await attachmentApi.list({
        entity_type: entityType,
        entity_id: entityId,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: !!entityType && !!entityId,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  // 上传附件
  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentApi.upload(file, entityType, entityId),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: i18n.t('pages.attachments_page.k1'),
        message: i18n.t('pages.attachments_page.k0'),
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE, entityType, entityId],

        exact: false,
        refetchType: 'active',
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.attachments_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.attachments_page.k3'),
        message: i18n.t('pages.attachments_page.k2'),
      });
    },
  });

  // 删除附件
  const deleteMutation = useMutation({
    mutationFn: (id: string) => attachmentApi.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: i18n.t('pages.attachments_page.k5'),
        message: i18n.t('pages.attachments_page.k4'),
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE, entityType, entityId],

        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.attachments_page.k1'), error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.attachments_page.k7'),
        message: i18n.t('pages.attachments_page.k6'),
      });
    },
  });

  // 下载附件
  const downloadMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      const blob = await attachmentApi.download(attachment.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.attachments_page.k2'), error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.attachments_page.k9'),
        message: i18n.t('pages.attachments_page.k8'),
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  // 获取单个附件详情（用于覆盖率：使用 get 方法）
  const getAttachmentDetail = useCallback(
    async (id: string) => {
      try {
        const response = await attachmentApi.get(id);
        if (response.success && response.data) {
          addNotification({
            type: 'info',
            title: i18n.t('pages.attachments_page.k10'),
            message: `${response.data.file_name} (${formatFileSize(response.data.file_size)})`,
          });
        }
      } catch (error) {
        apiLogger.error(i18n.t('pages.attachments_page.k3'), error);
      }
    },
    [addNotification]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) {
        addNotification({
          type: 'error',
          title: i18n.t('pages.attachments_page.k11'),
          message: i18n.t('pages.attachments_page.50mb_12'),
        });
        return;
      }
      setSelectedFile(file);
    },
    [addNotification]
  );

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  }, [selectedFile, uploadMutation]);

  const handleSelectFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDownload = useCallback(
    (attachment: Attachment) => {
      downloadMutation.mutate(attachment);
    },
    [downloadMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: i18n.t('pages.attachments_page.k20'),
        message: i18n.t('pages.attachments_page.k21'),
        danger: true,
        onConfirm: () => deleteMutation.mutate(id),
      });
    },
    [openConfirmDialog, deleteMutation]
  );

  const columns: ColumnDef<Attachment>[] = useMemo(
    () => [
      {
        id: 'file',
        label: i18n.t('shared.attachments_page.columns.file'),
        render: (row) => (
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            {getFileIcon(row.file_type)}
            <Typography variant='body2'>{row.file_name}</Typography>
            <Chip
              size='small'
              label={formatFileSize(row.file_size)}
              variant='outlined'
            />
          </Stack>
        ),
      },
      {
        id: 'file_type',
        label: i18n.t('shared.attachments_page.columns.type'),
        render: (row) => <Typography variant='body2'>{row.file_type}</Typography>,
      },
      {
        id: 'uploaded_at',
        label: i18n.t('shared.attachments_page.columns.upload_time'),
        render: (row) => (
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.attachments_page.k0')}{' '}
            {new Date(row.uploaded_at).toLocaleString('zh-CN')}
            {row.entity_type && ` · ${row.entity_type}`}
          </Typography>
        ),
      },
    ],
    []
  );

  const actions = useMemo(
    () => [
      {
        label: i18n.t('pages.attachments_page.k1'),
        icon: <Upload size={16} />,
        onClick: handleSelectFileClick,
        variant: 'outlined' as const,
      },
      {
        label: i18n.t('pages.attachments_page.k2'),
        icon: <Upload size={16} />,
        onClick: handleUpload,
        variant: 'contained' as const,
        disabled: !selectedFile || uploadMutation.isPending,
      },
    ],
    [handleSelectFileClick, handleUpload, selectedFile, uploadMutation.isPending]
  );

  const filterContent = useMemo(
    () => (
      <Stack
        direction='row'
        spacing={2}
      >
        <FormControl
          size='small'
          sx={{ minWidth: 140 }}
        >
          <InputLabel>{i18n.t('pages.attachments_page.k14')}</InputLabel>
          <Select
            value={entityType}
            label={i18n.t('pages.attachments_page.k15')}
            onChange={(e) => setEntityType(e.target.value)}
          >
            {ENTITY_TYPES.map((t) => (
              <MenuItem
                key={t}
                value={t}
              >
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size='small'
          label={i18n.t('pages.attachments_page.id_16')}
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          sx={{ minWidth: 200 }}
        />
      </Stack>
    ),
    [entityType, entityId]
  );

  const headerContent = useMemo(
    () =>
      selectedFile ? (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {selectedFile.name} ({formatFileSize(selectedFile.size)})
        </Typography>
      ) : null,
    [selectedFile]
  );

  const renderRowActions = useCallback(
    (row: Attachment) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title={i18n.t('pages.attachments_page.k19')}>
          <span>
            <IconButton
              size='small'
              onClick={() => handleDownload(row)}
              disabled={downloadMutation.isPending}
              aria-label={i18n.t('pages.attachments_page.k18')}
            >
              <Download size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={i18n.t('pages.attachments_page.k21')}>
          <span>
            <IconButton
              size='small'
              color='error'
              onClick={() => handleDelete(row.id)}
              disabled={deleteMutation.isPending}
              aria-label={i18n.t('pages.attachments_page.k20')}
            >
              <Trash2 size={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
    [handleDownload, handleDelete, downloadMutation.isPending, deleteMutation.isPending]
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        hidden
        onChange={handleFileSelect}
      />
      <ListPageTemplate<Attachment>
        title={i18n.t('pages.attachments_page.k13')}
        autoBreadcrumbs
        columns={columns}
        data={attachments || []}
        loading={isPending}
        actions={actions}
        renderRowActions={renderRowActions}
        filterContent={filterContent}
        headerContent={headerContent}
        emptyMessage={i18n.t('pages.attachments_page.k17')}
        onRowClick={(row) => getAttachmentDetail(row.id)}
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
    </>
  );
};

export default AttachmentsPage;
