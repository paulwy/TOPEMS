import React, { useCallback } from 'react';
import { FolderOpen, Eye, Download, Share2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { documentSchema } from '@/schemas/doc/document';
import { docApi, type FileMetadata } from '@/api/doc';
import { useNotificationStore } from '@/store';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { apiLogger } from '@/utils/logger';

export const DocumentListPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => docApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document'] });
    },
  });

  const apiAdapter: CrudApiAdapter<FileMetadata> = {
    list: async (params) => {
      const search = params?.search as string | undefined;
      const typeFilter = params?.type as string | undefined;

      const response = await docApi.list();
      let files: FileMetadata[] = [];

      if (response.success && response.data?.files) {
        files = response.data.files;

        if (search) {
          files = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
        }

        if (typeFilter && typeFilter !== 'all') {
          files = files.filter((f) => {
            const ct = f.content_type || '';
            if (typeFilter === 'pdf') return ct.includes('pdf');
            if (typeFilter === 'word') return ct.includes('word') || ct.includes('doc');
            if (typeFilter === 'excel') return ct.includes('sheet') || ct.includes('excel');
            if (typeFilter === 'ppt') return ct.includes('presentation') || ct.includes('ppt');
            if (typeFilter === 'image') return ct.startsWith('image/');
            return true;
          });
        }
      }

      return { data: files as any[], total: files.length };
    },
    create: async () => ({}) as any,
    update: async () => ({}) as any,
    delete: async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
  };

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['document'] });
    addNotification({
      title: '成功',
      message: '刷新成功',
      type: 'success',
    });
  }, [addNotification, queryClient]);

  const handleDownload = useCallback(
    async (row: any) => {
      try {
        const blob = await docApi.download(row.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = row.name;
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
    },
    [addNotification]
  );

  const handleShare = useCallback(
    (row: any) => {
      addNotification({
        title: '提示',
        message: `分享功能开发中 - ${row.name}`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleOpen = useCallback(
    (row: any) => {
      addNotification({
        title: '打开文档',
        message: `正在打开"${row.name}"...`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const customRowActions = [
    {
      label: '打开',
      icon: <Eye size={16} />,
      onClick: handleOpen,
    },
    {
      label: '下载',
      icon: <Download size={16} />,
      onClick: handleDownload,
    },
    {
      label: '分享',
      icon: <Share2 size={16} />,
      onClick: handleShare,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FolderOpen size={20} />,
        backButton: {
          href: '/document/dashboard',
        },
      }}
    >
      <CrudPage
        schema={documentSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};

export default DocumentListPage;
