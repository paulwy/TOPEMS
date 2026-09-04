import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import { type EntitySchema } from '@/schema';
import { getVersionSchema } from '@/schemas/pdm';
import { documentApi, pdmApi, type DocumentVersion, type Document } from '@/api/pdm';

import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const versionApiAdapter: CrudApiAdapter<DocumentVersion> = {
  list: async (params) => {
    const documentId = (params?.document as string) || (params?.document_id as string) || '';
    if (!documentId || documentId === 'all') {
      return { data: [], total: 0 };
    }
    const response = await documentApi.listVersions(documentId);
    if (!response.success || !response.data) {
      return { data: [], total: 0 };
    }
    const raw = response.data as unknown as Record<string, unknown>;
    const items = (
      Array.isArray(raw) ? raw : (raw.versions as DocumentVersion[] | undefined) || []
    ) as DocumentVersion[];
    const transformed = items.map((v) => ({
      ...v,
      id: `${v.document_id}:${v.id}`,
    }));
    return { data: transformed, total: transformed.length };
  },

  create: async (data) => {
    const response = await documentApi.createVersion(
      data as Parameters<typeof documentApi.createVersion>[0]
    );
    if (!response.success) throw new Error(response.message || i18n.t('pdm.pdm_version_page.k0'));
    const result = (response.data ?? {}) as DocumentVersion;
    if (result.document_id && result.id) {
      (result as unknown as Record<string, unknown>).id = `${result.document_id}:${result.id}`;
    }
    return result;
  },

  update: async (id, data) => {
    const parts = id.split(':');
    const documentId = parts[0];
    const versionId = parts[1];
    const { document_id: _docId, ...rest } = data as Record<string, unknown>;
    const response = await documentApi.updateVersion(
      documentId,
      versionId,
      rest as Parameters<typeof documentApi.updateVersion>[2]
    );
    if (!response.success) throw new Error(response.message || i18n.t('pdm.pdm_version_page.k1'));
    const result = (response.data ?? {}) as DocumentVersion;
    if (result.document_id && result.id) {
      (result as unknown as Record<string, unknown>).id = `${result.document_id}:${result.id}`;
    }
    return result;
  },

  delete: async (id) => {
    const parts = id.split(':');
    const documentId = parts[0];
    const versionId = parts[1];
    const response = await documentApi.deleteVersion(documentId, versionId);
    if (!response.success) throw new Error(response.message || i18n.t('pdm.pdm_version_page.k2'));
  },
};

export default function PdmVersionPage() {
  const { t } = useTranslation('pdm');
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: QUERY_KEYS.PDM.DOCUMENTS,
    queryFn: async (): Promise<Document[]> => {
      const response = await pdmApi.listDocuments();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return (Array.isArray(data) ? data : data.documents || []) as unknown as Document[];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const dynamicSchema = useMemo<EntitySchema>(() => {
    const docOptions = [
      { label: t('pdm.pdm_version_page.k3'), value: 'all' },
      ...documents.map((d) => ({ value: d.id, label: d.name })),
    ];
    const versionSchema = getVersionSchema();

    return {
      ...versionSchema,
      list: {
        ...versionSchema.list,
        filters: (versionSchema.list?.filters || []).map((f) => {
          if (f.id === 'document') {
            return { ...f, options: docOptions };
          }
          return f;
        }),
      },
    };
  }, [documents, t]);

  return (
    <CrudPage
      schema={dynamicSchema}
      apiAdapter={versionApiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: t('pdm.pdm_version_page.k4') }]}
    />
  );
}
