import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Calendar, FileCheck, Plus, Download, Upload } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Box,
  Typography,
  Button,
} from '@mui/material';
import i18n from '@/i18n';

import { DetailPageTemplate } from '@/components/templates';
import CrudPage from '@/components/templates/CrudPage';
import { standardRevisionSchema } from '@/schemas/qms';
import { PageContainer } from '@/components/common';
import { qmsApi } from '@/api/qms';
import type { QualityStandard, StandardRevision, CreateQualityStandardRequest } from '@/api/qms';
import { useCrudMutations } from '@/hooks';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { QMS_PATHS } from '@/modules/qms/config';

const ct = designTokens.colors;

const QmsStandardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: standard, isPending: loading } = useQuery<QualityStandard | null>({
    queryKey: QUERY_KEYS.QMS.STANDARD(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await qmsApi.getStandard(id);
      if (!res.success) {
        throw new Error(res.message || i18n.t('pages.qms_standard_detail_page.k0'));
      }
      return (res.data as QualityStandard) ?? null;
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: revisions = [] } = useQuery<StandardRevision[]>({
    queryKey: QUERY_KEYS.QMS.STANDARD_REVISIONS(id || ''),
    queryFn: async () => {
      if (!id) return [];
      const res = await qmsApi.listRevisions(id);
      if (!res.success) {
        throw new Error(res.message || i18n.t('pages.qms_standard_detail_page.k1'));
      }
      const revisionsData = res.data as unknown as
        StandardRevision[] | { revisions?: StandardRevision[] };
      return Array.isArray(revisionsData) ? revisionsData : revisionsData.revisions || [];
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    version: '',
    status: 'active',
    category: '',
    effective_date: '',
  });

  useEffect(() => {
    if (standard) {
      setFormData({
        title: standard.title || '',
        code: standard.code || '',
        description: standard.description || '',
        version: standard.version || '',
        status: standard.status || 'active',
        category: standard.category || '',
        effective_date: standard.effective_date
          ? new Date(standard.effective_date).toISOString().split('T')[0]
          : '',
      });
    }
  }, [standard]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: {
        color: 'bg-green-100 text-green-700',
        label: i18n.t('pages.qms_standard_detail_page.k2'),
      },
      [i18n.t('pages.qms_standard_detail_page.k0')]: {
        color: 'bg-green-100 text-green-700',
        label: i18n.t('pages.qms_standard_detail_page.k3'),
      },
      draft: {
        color: 'bg-yellow-100 text-yellow-700',
        label: i18n.t('pages.qms_standard_detail_page.k4'),
      },
      [i18n.t('pages.qms_standard_detail_page.k1')]: {
        color: 'bg-yellow-100 text-yellow-700',
        label: i18n.t('pages.qms_standard_detail_page.k5'),
      },
      expired: {
        color: 'bg-red-100 text-red-700',
        label: i18n.t('pages.qms_standard_detail_page.k6'),
      },
      [i18n.t('pages.qms_standard_detail_page.k2')]: {
        color: 'bg-red-100 text-red-700',
        label: i18n.t('pages.qms_standard_detail_page.k7'),
      },
      archived: {
        color: 'bg-gray-100 text-gray-700',
        label: i18n.t('pages.qms_standard_detail_page.k8'),
      },
      [i18n.t('pages.qms_standard_detail_page.k3')]: {
        color: 'bg-gray-100 text-gray-700',
        label: i18n.t('pages.qms_standard_detail_page.k9'),
      },
    };
    const item = statusMap[status] || {
      color: 'bg-gray-100 text-gray-700',
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{
          backgroundColor: item.color.includes('green')
            ? 'success.lighter'
            : item.color.includes('yellow')
              ? 'warning.100'
              : item.color.includes('red')
                ? 'error.lighter'
                : 'grey.100',
          color: item.color.includes('green')
            ? 'success.700'
            : item.color.includes('yellow')
              ? ct.yellow[700]
              : item.color.includes('red')
                ? 'error.darker'
                : 'text.secondary',
        }}
      />
    );
  };

  const { updateMutation, createMutation: createRevisionMutation } = useCrudMutations<
    CreateQualityStandardRequest,
    CreateQualityStandardRequest,
    string
  >({
    queryKeyToInvalidate: QUERY_KEYS.QMS.STANDARDS,
    createFn: async (data) => {
      const response = await qmsApi.createStandard(data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.qms_standard_detail_page.k10'));
      }
      return response;
    },
    updateFn: async ({ id, data }) => {
      const response = await qmsApi.updateStandard(String(id), data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.qms_standard_detail_page.k11'));
      }
      return response;
    },
    deleteFn: async (id) => {
      const response = await qmsApi.deleteStandard(String(id));
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.qms_standard_detail_page.k12'));
      }
      return response;
    },
    entityName: i18n.t('pages.qms_standard_detail_page.k13'),
    onUpdateSuccess: () => {
      setShowEditModal(false);
      if (standard) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.QMS.STANDARD(standard.id),
          exact: false,
          refetchType: 'active',
        });
      }
    },
    onCreateSuccess: () => {
      setShowRevisionModal(false);
      if (standard) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.QMS.STANDARD_REVISIONS(standard.id),
          exact: false,
          refetchType: 'active',
        });
      }
      navigate(QMS_PATHS.standards);
    },
  });

  const submitting = updateMutation.isPending || createRevisionMutation.isPending;

  const handleUpdateStandard = () => {
    if (!standard) return;
    updateMutation.mutate({
      id: standard.id,
      data: {
        name: formData.title,
        code: formData.code,
        description: formData.description,
        version: formData.version,
        status: formData.status,
        category: formData.category,
        content: standard.content || '',
        effective_date: formData.effective_date,
      },
    });
  };

  const handleCreateRevision = () => {
    if (!standard) return;
    const newVersion = formData.version || standard.version || '1.0';
    const [major, minor] = newVersion.split('.').map(Number);
    const nextVersion = `${major}.${minor + 1}`;

    createRevisionMutation.mutate({
      name: standard.name,
      code: `${standard.code}-v${nextVersion}`,
      version: nextVersion,
      description: `${i18n.t('pages.qms_standard_detail_page.k4')} ${nextVersion}`,
      category: standard.category,
      content: standard.content,
      status: 'draft',
      effective_date: new Date().toISOString().split('T')[0],
    });
  };

  if (!loading && !standard) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, grey.100 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              color: 'error.main',
              mx: 'auto',
              mb: 2,
            }}
            component='svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
          >
            <circle
              cx={12}
              cy={12}
              r={10}
            />
            <line
              x1={12}
              y1={8}
              x2={12}
              y2={12}
            />
            <line
              x1={12}
              y1={16}
              x2={12.01}
              y2={16}
            />
          </Box>
          <Typography sx={{ color: 'grey.600', mb: 2 }}>
            {i18n.t('pages.qms_standard_detail_page.k14')}
          </Typography>
          <Button onClick={() => navigate(QMS_PATHS.root)}>
            {i18n.t('pages.qms_standard_detail_page.k15')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title={i18n.t('pages.qms_standard_detail_page.k16')}
      subtitle='Quality Standard Detail'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          standard?.title ||
          standard?.name ||
          standard?.code ||
          i18n.t('pages.qms_standard_detail_page.k17')
        }
        backHref={QMS_PATHS.root}
        onBack={() => navigate(QMS_PATHS.root)}
        onEdit={() => setShowEditModal(true)}
        loading={loading}
        infoCard={{
          title: standard?.name,
          subtitle: standard?.code || standard?.id,
          tags: [
            standard?.status === 'active'
              ? i18n.t('pages.qms_standard_detail_page.k18')
              : standard?.status || '',
            `v${standard?.version || '1.0'}`,
          ].filter(Boolean),
          stats: [
            {
              label: i18n.t('pages.qms_standard_detail_page.k19'),
              value: `v${standard?.version || '1.0'}`,
            },
            {
              label: i18n.t('pages.qms_standard_detail_page.k20'),
              value: standard?.category || '-',
            },
          ],
        }}
        sidebar={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('pages.qms_standard_detail_page.k5')}
            </Typography>
            <Button
              fullWidth
              sx={{ justifyContent: 'flex-start' }}
              variant='outlined'
              startIcon={<Download sx={{ width: 16, height: 16 }} />}
            >
              {i18n.t('pages.qms_standard_detail_page.k6')}
            </Button>
            <Button
              fullWidth
              sx={{ justifyContent: 'flex-start' }}
              variant='outlined'
              startIcon={<Upload sx={{ width: 16, height: 16 }} />}
            >
              {i18n.t('pages.qms_standard_detail_page.k7')}
            </Button>
          </Box>
        }
        tabs={[
          {
            id: 'info',
            label: i18n.t('pages.qms_standard_detail_page.k21'),
            icon: <FileText style={{ width: 16, height: 16 }} />,
            content: (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      {i18n.t('pages.qms_standard_detail_page.k8')}
                    </Typography>
                    <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                      {standard?.code || standard?.id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      {i18n.t('pages.qms_standard_detail_page.k9')}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{getStatusBadge(standard?.status || '')}</Box>
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.qms_standard_detail_page.k10')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500, mt: 0.5 }}>{standard?.name}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.qms_standard_detail_page.k11')}
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>{standard?.category || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.qms_standard_detail_page.k12')}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Calendar sx={{ width: 16, height: 16 }} />
                    {standard?.effective_date
                      ? new Date(standard.effective_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.qms_standard_detail_page.k13')}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                      lineHeight: 1.6,
                    }}
                  >
                    {standard?.description || i18n.t('pages.qms_standard_detail_page.k22')}
                  </Typography>
                </Box>
              </Box>
            ),
          },
          {
            id: 'history',
            label: i18n.t('pages.qms_standard_detail_page.k23'),
            icon: <FileCheck style={{ width: 16, height: 16 }} />,
            badge: revisions.length,
            content: (
              <CrudPage
                schema={standardRevisionSchema}
                apiAdapter={{
                  list: async () => ({ data: revisions, total: revisions.length }),
                  create: async () => ({}) as StandardRevision,
                  update: async () => ({}) as StandardRevision,
                  delete: async () => {},
                }}
                breadcrumbs={[]}
                headerContent={
                  revisions.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <FileText
                        style={{
                          width: 64,
                          height: 64,
                          margin: `0 auto ${designTokens.spacing.md}px auto`,
                          opacity: 0.5,
                        }}
                      />
                      <Typography>{i18n.t('pages.qms_standard_detail_page.k24')}</Typography>
                      <Button
                        variant='outlined'
                        size='small'
                        sx={{ mt: 2 }}
                        onClick={() => setShowRevisionModal(true)}
                        startIcon={<Plus style={{ width: 12, height: 12 }} />}
                      >
                        {i18n.t('pages.qms_standard_detail_page.k14')}
                      </Button>
                    </Box>
                  ) : null
                }
              />
            ),
          },
        ]}
        actions={[
          {
            label: i18n.t('pages.qms_standard_detail_page.k25'),
            icon: <Plus style={{ width: 16, height: 16 }} />,
            onClick: () => setShowRevisionModal(true),
            variant: 'outlined',
          },
        ]}
      />

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.qms_standard_detail_page.k26')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'text.secondary',
                  }}
                >
                  {i18n.t('pages.qms_standard_detail_page.k15')}
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder={i18n.t('pages.qms_standard_detail_page.k27')}
                />
              </Box>
              <Box>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'text.secondary',
                  }}
                >
                  {i18n.t('pages.qms_standard_detail_page.k16')}
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.version}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                  }
                  placeholder={i18n.t('pages.qms_standard_detail_page.10_17')}
                />
              </Box>
            </Box>
            <Box>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  color: 'text.secondary',
                }}
              >
                {i18n.t('pages.qms_standard_detail_page.k18')}
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={i18n.t('pages.qms_standard_detail_page.k28')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'text.secondary',
                  }}
                >
                  {i18n.t('pages.qms_standard_detail_page.k19')}
                </Box>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder={i18n.t('pages.qms_standard_detail_page.k29')}
                />
              </Box>
              <Box>
                <Box
                  component='label'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'text.secondary',
                  }}
                >
                  {i18n.t('pages.qms_standard_detail_page.k20')}
                </Box>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 2,
                    borderRadius: 'md',
                    border: '1px solid border.default',
                  }}
                >
                  <option value='active'>{i18n.t('pages.qms_standard_detail_page.k30')}</option>
                  <option value='draft'>{i18n.t('pages.qms_standard_detail_page.k31')}</option>
                  <option value='expired'>{i18n.t('pages.qms_standard_detail_page.k32')}</option>
                  <option value='archived'>{i18n.t('pages.qms_standard_detail_page.k33')}</option>
                </select>
              </Box>
            </Box>
            <Box>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  color: 'text.secondary',
                }}
              >
                {i18n.t('pages.qms_standard_detail_page.k21')}
              </Box>
              <TextField
                type='date'
                size='small'
                fullWidth
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    effective_date: e.target.value,
                  }))
                }
              />
            </Box>
            <Box>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  color: 'text.secondary',
                }}
              >
                {i18n.t('pages.qms_standard_detail_page.k22')}
              </Box>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={i18n.t('pages.qms_standard_detail_page.k23')}
                style={{
                  width: '100%',
                  padding: 3,
                  borderRadius: 'sm',
                  border: '1px solid border.default',
                  resize: 'none',
                  height: '96px',
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowEditModal(false)}
            disabled={submitting}
          >
            {i18n.t('pages.qms_standard_detail_page.k24')}
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdateStandard}
            disabled={submitting}
          >
            {submitting
              ? i18n.t('pages.qms_standard_detail_page.k25')
              : i18n.t('pages.qms_standard_detail_page.k34')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.qms_standard_detail_page.k35')}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                component='span'
                sx={{ color: 'text.secondary' }}
              >
                [i18n.t('pages.qms_standard_detail_page.k26')]:
              </Box>
              <Box
                component='span'
                sx={{ fontWeight: 500 }}
              >
                {standard?.version}
              </Box>
            </Box>
            <Box sx={{ color: 'text.secondary', mt: 2 }}>
              {i18n.t('pages.qms_standard_detail_page.k27')}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  color: 'text.secondary',
                }}
              >
                {i18n.t('pages.qms_standard_detail_page.k28')}
              </Box>
              <textarea
                placeholder={i18n.t('pages.qms_standard_detail_page.k29')}
                style={{
                  width: '100%',
                  padding: 3,
                  borderRadius: 'sm',
                  border: '1px solid border.default',
                  resize: 'none',
                  height: '96px',
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowRevisionModal(false)}
            disabled={submitting}
          >
            {i18n.t('pages.qms_standard_detail_page.k30')}
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateRevision}
            disabled={submitting}
            sx={{
              backgroundColor: 'secondary.dark',
              '&:hover': { backgroundColor: ct.purple[700] },
            }}
          >
            {submitting
              ? i18n.t('pages.qms_standard_detail_page.k31')
              : i18n.t('pages.qms_standard_detail_page.k36')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsStandardDetailPage;
