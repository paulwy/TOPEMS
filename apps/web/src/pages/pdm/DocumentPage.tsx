import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  FileText,
  Upload,
  Download,
  Eye,
  History,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { documentSchema } from '@/schemas/pdm';
import { documentApi } from '@/api/pdm/document';
import type {
  PdmDocument as Document,
  DocumentVersion,
  CreatePdmDocumentRequest as CreateDocumentRequest,
} from '@/api/pdm/document';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const baseAdapter = createCrudPageAdapter<Document, CreateDocumentRequest>({
  list: documentApi.list,
  create: documentApi.create,
  update: documentApi.update,
  delete: documentApi.delete,
});

const statusColorMap: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'grey.100', color: 'text.secondary' },

  review: { bg: 'warning.lighter', color: 'warning.dark' },
  approved: { bg: 'info.lighter', color: 'info.dark' },
  published: { bg: 'success.lighter', color: 'success.dark' },
  archived: { bg: 'grey.100', color: 'text.secondary' },
};

const statusLabelMap: Record<string, string> = {
  draft: i18n.t('pdm.document_page.k0'),
  review: i18n.t('pdm.document_page.k1'),
  approved: i18n.t('pdm.document_page.k2'),
  published: i18n.t('pdm.document_page.k3'),
  archived: i18n.t('pdm.document_page.k4'),
};

const typeLabelMap: Record<string, string> = {
  specification: i18n.t('pdm.document_page.k5'),
  manual: i18n.t('pdm.document_page.k6'),
  drawing: i18n.t('pdm.document_page.k7'),
  report: i18n.t('pdm.document_page.k8'),
  procedure: i18n.t('pdm.document_page.k9'),
  other: i18n.t('pdm.document_page.k10'),
};

function extractListData(response: unknown): Document[] {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as Document[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as Document[];
    if (Array.isArray(d.data)) return d.data as Document[];
  }
  return [];
}

export const DocumentPage: React.FC = () => {
  const { t } = useTranslation('pdm');
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: docsResp } = useQuery({
    queryKey: QUERY_KEYS.PDM.DOCUMENTS,
    queryFn: async () => documentApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const documents = extractListData(docsResp);

  const { data: versions = [] } = useQuery<DocumentVersion[]>({
    queryKey: QUERY_KEYS.PDM.DOCUMENT_VERSIONS(selectedDocId || ''),
    queryFn: async () => {
      if (!selectedDocId) return [];
      const response = await documentApi.listVersions(selectedDocId);
      if (response.success && response.data) {
        return response.data as DocumentVersion[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedDocId,
  });

  const stats = useMemo(() => {
    return {
      total: documents.length,
      published: documents.filter((d) => d.status === 'published').length,
      review: documents.filter((d) => d.status === 'review').length,
    };
  }, [documents]);

  const publishMutation = useMutation({
    mutationFn: (id: string) => documentApi.updateStatus(id, 'published'),
    onSuccess: () => {
      addNotification({
        title: t('pdm.document_page.k12'),
        message: t('pdm.document_page.k11'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PDM.DOCUMENTS,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: t('pdm.document_page.k14'),
        message: t('pdm.document_page.k13'),
        type: 'error',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => documentApi.updateStatus(id, 'approved'),
    onSuccess: () => {
      addNotification({
        title: t('pdm.document_page.k16'),
        message: t('pdm.document_page.k15'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PDM.DOCUMENTS,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: t('pdm.document_page.k18'),
        message: t('pdm.document_page.k17'),
        type: 'error',
      });
    },
  });

  const customRowActions = [
    {
      label: t('pdm.document_page.k19'),
      icon: <History size={16} />,
      color: 'info' as const,
      onClick: (row: Record<string, unknown>) => {
        const doc = row as unknown as Document;
        setSelectedDocId(doc.id);
        setVersionDialogOpen(true);
      },
    },
    {
      label: t('pdm.document_page.k20'),
      icon: <Eye size={16} />,
      color: 'primary' as const,
      onClick: (_row: Record<string, unknown>) => {
        addNotification({
          title: t('pdm.document_page.k22'),
          message: t('pdm.document_page.k21'),
          type: 'info',
        });
      },
    },
    {
      label: t('pdm.document_page.k23'),
      icon: <Download size={16} />,
      color: 'success' as const,
      onClick: (_row: Record<string, unknown>) => {
        addNotification({
          title: t('pdm.document_page.k25'),
          message: t('pdm.document_page.k24'),
          type: 'info',
        });
      },
    },
    {
      label: t('pdm.document_page.k26'),
      icon: <CheckCircle size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => {
        const doc = row as unknown as Document;
        approveMutation.mutate(doc.id);
      },
      show: (row: Record<string, unknown>) => {
        const doc = row as unknown as Document;
        return doc.status === 'review';
      },
    },
    {
      label: t('pdm.document_page.k27'),
      icon: <Upload size={16} />,
      color: 'primary' as const,
      onClick: (row: Record<string, unknown>) => {
        const doc = row as unknown as Document;
        publishMutation.mutate(doc.id);
      },
      show: (row: Record<string, unknown>) => {
        const doc = row as unknown as Document;
        return doc.status === 'approved';
      },
      divider: true,
    },
  ];

  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('pdm.document_page.e1')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('pdm.document_page.e2')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'success.main' }}
              >
                {stats.published}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warning.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('pdm.document_page.e3')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'warning.main' }}
              >
                {stats.review}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const detailContent = (row: Record<string, unknown>) => {
    const doc = row as unknown as Document;
    const statusColors = statusColorMap[doc.status] || {
      bg: 'grey.100',
      color: 'text.secondary',
    };
    const statusLabel = statusLabelMap[doc.status] || doc.status;
    const typeLabel = typeLabelMap[doc.type] || doc.type;

    return (
      <Box
        sx={{
          pt: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.document_page.e4')}
          </Box>
          <Box sx={{ fontWeight: 500 }}>{doc.document_no}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.document_page.e5')}
          </Box>
          <Box>{typeLabel}</Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.document_page.e6')}
          </Box>
          <Box>{doc.name}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.document_page.e7')}
          </Box>
          <Box>v{doc.current_version || '1.0'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.document_page.e8')}
          </Box>
          <Box>{doc.version_count || 1}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.document_page.e9')}
          </Box>
          <Box>{doc.category || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.bom_page.e6')}
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={statusLabel}
              size='small'
              sx={{
                backgroundColor: statusColors.bg,
                color: statusColors.color,
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.document_page.e11')}
          </Box>
          <Box>{doc.uploader_name || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {t('pdm.bom_page.e8')}
          </Box>
          <Box>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('zh-CN') : '-'}</Box>
        </Box>
        {doc.description && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Box
              component='span'
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {t('pdm.bom_page.e9')}
            </Box>
            <Box>{doc.description}</Box>
          </Box>
        )}
      </Box>
    );
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={documentSchema}
        apiAdapter={baseAdapter}
        breadcrumbs={[{ label: 'PDM' }, { label: t('pdm.document_page.k28') }]}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='lg'
        customRowActions={customRowActions}
      />

      <Dialog
        open={versionDialogOpen}
        onClose={() => setVersionDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{t('pdm.document_page.r1', { v1: selectedDoc?.name || '' })}</DialogTitle>
        <DialogContent dividers>
          {versions.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              {t('pdm.document_page.k29')}
            </Box>
          ) : (
            <List>
              {versions.map((version, index) => (
                <ListItem
                  key={version.id}
                  divider={index < versions.length - 1}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={t('pdm.document_page.k30')}>
                        <IconButton
                          size='small'
                          aria-label={t('pdm.document_page.k31')}
                        >
                          <Download size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('pdm.document_page.k32')}>
                        <IconButton
                          size='small'
                          aria-label={t('pdm.document_page.k33')}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    <Clock
                      size={18}
                      color='disabled'
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600 }}
                        >
                          v{version.version_number}
                        </Typography>
                        {index === 0 && (
                          <Chip
                            label={t('pdm.document_page.k34')}
                            size='small'
                            sx={{
                              backgroundColor: 'success.lighter',
                              color: 'success.dark',
                              fontWeight: 500,
                              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary', display: 'block' }}
                        >
                          {version.changes.join(', ') ||
                            version.description ||
                            t('pdm.document_page.k35')}
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          {version.created_at
                            ? new Date(version.created_at).toLocaleString('zh-CN')
                            : ''}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)}>{t('pdm.document_page.k36')}</Button>
          <Button
            variant='outlined'
            startIcon={<Plus size={16} />}
            onClick={() => {
              addNotification({
                title: t('pdm.document_page.k38'),
                message: t('pdm.document_page.k37'),
                type: 'info',
              });
            }}
          >
            {t('pdm.document_page.e14')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('pdm.document_page.k39')}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              mt: 2,
              p: 4,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => {
              addNotification({
                title: t('pdm.document_page.k41'),
                message: t('pdm.document_page.k40'),
                type: 'info',
              });
            }}
          >
            <Upload
              size={32}
              style={{ margin: `0 auto ${designTokens.spacing.sm}px`, opacity: 0.5 }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {t('pdm.document_page.e15')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>{t('pdm.document_page.k42')}</Button>
          <Button
            variant='contained'
            disabled
          >
            {t('pdm.document_page.e16')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DocumentPage;
