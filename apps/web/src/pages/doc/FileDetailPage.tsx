import { Typography, Box, InputLabel } from '@mui/material';
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docApi, type FileMetadata } from '@/api/doc';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { DOC_PATHS } from '@/modules/doc/config';

import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct= designTokens.colors;

const DocsFileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    data: file,
    isPending: loading,
    error: queryError,
  } = useQuery<FileMetadata>({
    queryKey: id ? QUERY_KEYS.DOC.DOCUMENT(id) : ['doc', 'document', 'none'],
    queryFn: async () => {
      if (!id) throw new Error(i18n.t('pages.file_detail_page.id_0'));
      const res = await docApi.get(id);
      if (res.code === 200 && res.data) {
        return res.data;
      }
      throw new Error(res.message || i18n.t('pages.file_detail_page.k1'));
    },
    enabled: !!id,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const errorMessage = queryError
    ? queryError instanceof Error
      ? queryError.message
      : i18n.t('pages.file_detail_page.k2')
    : undefined;

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await docApi.delete(fileId);
      if (res.code !== 200) {
        throw new Error(res.message || i18n.t('pages.file_detail_page.k3'));
      }
      return res;
    },
    onSuccess: () => {
      success(i18n.t('pages.file_detail_page.k4'));
      if (id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOC.DOCUMENTS ,
  exact: false,
  refetchType: 'active',
});
      }
      navigate(DOC_PATHS.documents);
    },
    onError: (err: unknown) => {
      apiLogger.error('Failed to delete file:', err);
      error(err instanceof Error ? err.message : i18n.t('pages.file_detail_page.k5'));
    },
  });

  const handleDelete = () => {
    if (!id) return;
    deleteMutation.mutate(id);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const basicInfoContent = useMemo(() => {
    if (!file) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.file_detail_page.k6')}</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{file.name}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.file_detail_page.k7')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{file.content_type || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.file_detail_page.k8')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatFileSize(file.size)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.file_detail_page.k9')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{file.folder_id || i18n.t('pages.file_detail_page.k10')}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.file_detail_page.k11')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{file.created_by || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.file_detail_page.id_12')}</InputLabel>
          <Typography sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {file.id.substring(0, 8)}...
          </Typography>
        </Box>
      </Box>
    );
  }, [file]);

  const timeInfoContent = useMemo(() => {
    if (!file) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.file_detail_page.k13')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(file.created_at)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.file_detail_page.k14')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(file.updated_at)}</Typography>
        </Box>
      </Box>
    );
  }, [file]);

  const footerSection = useMemo<SectionConfig>(() => {
    if (!file) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: i18n.t('pages.file_detail_page.k15'),
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('pages.file_detail_page.id_0')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5, fontFamily: 'monospace' }}>
              {file.id.substring(0, 8)}...
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('pages.file_detail_page.k1')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {file.content_type || '-'}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('pages.file_detail_page.k2')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {formatFileSize(file.size)}
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [file]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: i18n.t('pages.file_detail_page.k16'), content: basicInfoContent || <></> },
      { id: 'time', label: i18n.t('pages.file_detail_page.k17'), content: timeInfoContent || <></> },
    ],
    [basicInfoContent, timeInfoContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <FileText
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: file?.name,
      subtitle: file?.content_type || undefined,
      tags: [formatFileSize(file?.size) || '-'],
    }),
    [file]
  );

  return (
    <PageContainer
      title={i18n.t('pages.file_detail_page.k18')}
      subtitle={i18n.t('pages.file_detail_page.k19')}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={file?.name || i18n.t('pages.file_detail_page.k20')}
        backHref={DOC_PATHS.documents}
        loading={loading}
        error={errorMessage}
        onEdit={() => id && navigate(DOC_PATHS.documentDetail.replace(':id', id))}
        onDelete={() => setDeleteDialogOpen(true)}
        onDownload={() => {
          success(i18n.t('pages.file_detail_page.k21'));
        }}
        infoCard={infoCard}
        tabs={tabs}
        sections={[footerSection]}
      />
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={i18n.t('pages.file_detail_page.k22')}
        message={i18n.t('pages.file_detail_page.k23')}
        danger
      />
    </PageContainer>
  );
};

export default DocsFileDetailPage;
