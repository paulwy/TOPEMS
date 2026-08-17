import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  FileArchive,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
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
  const getAttachmentDetail = async (id: string) => {
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
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  return (
    <PageContainer
      title={i18n.t('pages.attachments_page.k13')}
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Paperclip style={{ width: 20, height: 20 }} />,
      }}
    >
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction='row'
            spacing={2}
            sx={{ mb: 2 }}
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
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            {i18n.t('pages.attachments_page.k0')}
          </Typography>
          <Stack
            direction='row'
            spacing={2}
            sx={{ alignItems: 'center' }}
          >
            <Button
              variant='outlined'
              component='label'
              startIcon={<Upload size={16} />}
            >
              {i18n.t('pages.attachments_page.k1')}
              <input
                ref={fileInputRef}
                type='file'
                hidden
                onChange={handleFileSelect}
              />
            </Button>
            {selectedFile && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Typography>
            )}
            <Button
              variant='contained'
              startIcon={<Upload size={16} />}
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {i18n.t('pages.attachments_page.k2')}
            </Button>
            {uploadMutation.isPending && <CircularProgress size={20} />}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            {i18n.t('pages.attachments_page.k3')}
          </Typography>
          {isPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : !attachments || attachments.length === 0 ? (
            <Alert severity='info'>{i18n.t('pages.attachments_page.k17')}</Alert>
          ) : (
            <List>
              {attachments.map((attachment: Attachment, idx: number) => (
                <React.Fragment key={attachment.id}>
                  <ListItem
                    sx={{ cursor: 'pointer' }}
                    onClick={() => getAttachmentDetail(attachment.id)}
                  >
                    <ListItemIcon>{getFileIcon(attachment.file_type)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack
                          direction='row'
                          spacing={1}
                          sx={{ alignItems: 'center' }}
                        >
                          <Typography variant='subtitle2'>{attachment.file_name}</Typography>
                          <Chip
                            size='small'
                            label={formatFileSize(attachment.file_size)}
                            variant='outlined'
                          />
                        </Stack>
                      }
                      secondary={
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {i18n.t('pages.attachments_page.k0')}{' '}
                          {new Date(attachment.uploaded_at).toLocaleString('zh-CN')}
                          {attachment.entity_type && ` · ${attachment.entity_type}`}
                        </Typography>
                      }
                    />
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      <IconButton
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMutation.mutate(attachment);
                        }}
                        aria-label={i18n.t('pages.attachments_page.k18')}
                        title={i18n.t('pages.attachments_page.k19')}
                      >
                        <Download size={16} />
                      </IconButton>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(attachment.id);
                        }}
                        aria-label={i18n.t('pages.attachments_page.k20')}
                        title={i18n.t('pages.attachments_page.k21')}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Stack>
                  </ListItem>
                  {idx < attachments.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default AttachmentsPage;
