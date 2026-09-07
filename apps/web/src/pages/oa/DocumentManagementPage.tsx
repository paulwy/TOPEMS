import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates';
import type { CrudOperations } from '@/hooks';
import { documentApi } from '@/api/erp/core';
import type { PaginationParams } from '@/api/erp/core/types';

interface DocumentRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
}

export const DocumentManagementPage: React.FC = () => {
  const { t } = useTranslation('oa');

  const crudApi: CrudOperations<DocumentRecord> = {
    list: async (params) => {
      const r = await documentApi.list(params as PaginationParams);
      return {
        success: r.success,
        code: r.code,
        message: r.message,
        data: r.data && {
          items: r.data.items.map((d) => ({
            id: d.id,
            title: d.title,
            type: d.doc_type,
            status: d.status,
            created_at: d.created_at,
          })),
          total: r.data.total,
        },
      };
    },
    get: async (id) => {
      const r = await documentApi.get(id);
      return {
        success: r.success,
        code: r.code,
        message: r.message,
        data: r.data && {
          id: r.data.id,
          title: r.data.title,
          type: r.data.doc_type,
          status: r.data.status,
          created_at: r.data.created_at,
        },
      };
    },
    create: async (data) => {
      const r = await documentApi.create({
        title: (data as { title?: string })?.title ?? '',
        doc_type: (data as { type?: string })?.type,
        status: (data as { status?: string })?.status,
      });
      return {
        success: r.success,
        code: r.code,
        message: r.message,
        data: r.data && {
          id: r.data.id,
          title: r.data.title,
          type: r.data.doc_type,
          status: r.data.status,
          created_at: r.data.created_at,
        },
      };
    },
    update: async (id, data) => {
      const r = await documentApi.update(id, {
        title: (data as { title?: string })?.title,
        doc_type: (data as { type?: string })?.type,
        status: (data as { status?: string })?.status,
      });
      return {
        success: r.success,
        code: r.code,
        message: r.message,
        data: r.data && {
          id: r.data.id,
          title: r.data.title,
          type: r.data.doc_type,
          status: r.data.status,
          created_at: r.data.created_at,
        },
      };
    },
    delete: async (id) => {
      const r = await documentApi.delete(id);
      return { success: r.success, code: r.code, message: r.message, data: r.data };
    },
  };

  const columns: ColumnDef<DocumentRecord>[] = [
    { id: 'id', label: t('oa.document_management_page.k1'), width: 120 },
    { id: 'title', label: t('oa.document_management_page.k2'), width: 240 },
    { id: 'type', label: t('oa.document_management_page.k3'), width: 120 },
    { id: 'status', label: t('oa.document_management_page.k4'), width: 120 },
    { id: 'created_at', label: t('oa.document_management_page.k5'), width: 160 },
  ];

  return (
    <ListPageTemplate<DocumentRecord>
      title={t('oa.document_management_page.k0')}
      data={[]}
      crud={{
        api: crudApi,
        queryKey: 'oa-documents',
      }}
      columns={columns}
      emptyMessage={t('oa.document_management_page.k7')}
    />
  );
};

export default DocumentManagementPage;
