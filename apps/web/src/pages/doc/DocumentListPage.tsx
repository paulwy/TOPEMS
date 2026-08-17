import React, { useCallback } from 'react';
import { FolderOpen, Eye, Download, Share2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { documentSchema } from '@/schemas/doc/document';
import { docApi, type FileMetadata } from '@/api/doc';
import { useNotificationStore } from '@/store';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { apiLogger } from '@/utils/logger';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const DocumentListPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => docApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.DOCUMENT_BASE,
        exact: false,
        refetchType: 'active',
      });
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

      return { data: files, total: files.length };
    },
    create: async () => ({}) as unknown as FileMetadata,
    update: async () => ({}) as unknown as FileMetadata,
    delete: async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
  };

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.DOCUMENT_BASE,
      exact: false,
      refetchType: 'active',
    });
    addNotification({
      title: i18n.t('pages.document_list_page.k0'),
      message: i18n.t('pages.document_list_page.k1'),
      type: 'success',
    });
  }, [addNotification, queryClient]);

  const handleDownload = useCallback(
    async (row: Record<string, unknown>) => {
      try {
        const blob = await docApi.download(String(row.id));
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = String(row.name);
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        addNotification({
          title: i18n.t('pages.document_list_page.k2'),
          message: i18n.t('pages.document_list_page.k3'),
          type: 'success',
        });
      } catch (err: unknown) {
        apiLogger.error(i18n.t('pages.document_list_page.k0'), err);
        addNotification({
          title: i18n.t('pages.document_list_page.k4'),
          message: i18n.t('pages.document_list_page.k5'),
          type: 'error',
        });
      }
    },
    [addNotification]
  );

  const handleShare = useCallback(
    (row: Record<string, unknown>) => {
      addNotification({
        title: i18n.t('pages.document_list_page.k6'),
        message: `${i18n.t('pages.document_list_page.k1')}${String(row.name)}`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleOpen = useCallback(
    (row: Record<string, unknown>) => {
      addNotification({
        title: i18n.t('pages.document_list_page.k7'),
        message: `${i18n.t('pages.document_list_page.k2')}${String(row.name)}"...`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const customRowActions = [
    {
      label: i18n.t('pages.document_list_page.k8'),
      icon: <Eye size={16} />,
      onClick: handleOpen,
    },
    {
      label: i18n.t('pages.document_list_page.k9'),
      icon: <Download size={16} />,
      onClick: handleDownload,
    },
    {
      label: i18n.t('pages.document_list_page.k10'),
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
