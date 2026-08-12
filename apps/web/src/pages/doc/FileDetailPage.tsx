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

const ct = designTokens.colors;

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
      if (!id) throw new Error('缺少文件 ID');
      const res = await docApi.get(id);
      if (res.code === 200 && res.data) {
        return res.data;
      }
      throw new Error(res.message || '加载文件信息失败');
    },
    enabled: !!id,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const errorMessage = queryError
    ? queryError instanceof Error
      ? queryError.message
      : '加载文件信息失败'
    : undefined;

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await docApi.delete(fileId);
      if (res.code !== 200) {
        throw new Error(res.message || '删除失败');
      }
      return res;
    },
    onSuccess: () => {
      success('文件删除成功');
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
      error(err instanceof Error ? err.message : '删除文件失败');
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>文件名称</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{file.name}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>文件类型</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{file.content_type || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>文件大小</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatFileSize(file.size)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>所属文件夹</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{file.folder_id || '根目录'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>创建者</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{file.created_by || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>文件ID</InputLabel>
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>创建时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(file.created_at)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>更新时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(file.updated_at)}</Typography>
        </Box>
      </Box>
    );
  }, [file]);

  const footerSection = useMemo<SectionConfig>(() => {
    if (!file) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: '其他信息',
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
              文件ID
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
              文件类型
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
              文件大小
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
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      { id: 'time', label: '时间信息', content: timeInfoContent || <></> },
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
      title='文件详情'
      subtitle='查看文件详细信息'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={file?.name || '文件详情'}
        backHref={DOC_PATHS.documents}
        loading={loading}
        error={errorMessage}
        onEdit={() => id && navigate(DOC_PATHS.documentDetail.replace(':id', id))}
        onDelete={() => setDeleteDialogOpen(true)}
        onDownload={() => {
          success('文件下载功能开发中');
        }}
        infoCard={infoCard}
        tabs={tabs}
        sections={[footerSection]}
      />
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除此文件吗？'
        danger
      />
    </PageContainer>
  );
};

export default DocsFileDetailPage;
