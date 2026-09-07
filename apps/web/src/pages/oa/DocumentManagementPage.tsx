import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates';
import type { CrudOperations } from '@/hooks';

interface DocumentRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
}

export const DocumentManagementPage: React.FC = () => {
  const { t } = useTranslation('oa');

  // TODO: oaApi.document.list 方法不存在，当前使用空数组占位；等待后端 OA 服务（svc 无 oa 模块）就绪后替换为真实 API 调用
  const crudApi: CrudOperations<DocumentRecord> = {
    list: async () => ({
      success: true,
      code: 0,
      message: '',
      data: { items: [], total: 0 },
    }),
    get: async () => ({ success: true, code: 0, message: '', data: undefined }),
    create: async () => ({ success: true, code: 0, message: '', data: undefined }),
    update: async () => ({ success: true, code: 0, message: '', data: undefined }),
    delete: async () => ({ success: true, code: 0, message: '', data: '' }),
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
