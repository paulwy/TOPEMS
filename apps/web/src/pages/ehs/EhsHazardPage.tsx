import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { AlertTriangle, XCircle, Clock, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { safetyIssueSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import type { SafetyIssue, CreateSafetyIssueRequest } from '@/api/ehs';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';


import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct= designTokens.colors;

const safetyIssueApi = {
  list: ehsApi.listSafetyIssues,
  create: ehsApi.createSafetyIssue,
  update: ehsApi.updateSafetyIssue,
  delete: ehsApi.deleteSafetyIssue,
};

const baseAdapter = createCrudPageAdapter<SafetyIssue, CreateSafetyIssueRequest>(safetyIssueApi);

const safetyIssueAdapter: CrudApiAdapter<SafetyIssue> = {
  list: async (params) => {
  const { t } = useTranslation('ehs');
    const response = await ehsApi.listSafetyIssues({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    });
    if (!response.success) {
      throw new Error(i18n.t('ehs.ehs_hazard_page.k0'));
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as SafetyIssue[],
      total: data?.total || 0,
    };
  },
  create: baseAdapter.create as unknown as CrudApiAdapter<SafetyIssue>['create'],
  update: baseAdapter.update as unknown as CrudApiAdapter<SafetyIssue>['update'],
  delete: baseAdapter.delete,
};

const EhsHazardPage: React.FC = () => {
  const { data: issuesResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_SAFETYISSUES_STATS_BASE,
    queryFn: async () => ehsApi.listSafetyIssues({ pagesize: 500 }),
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const issues = issuesResp?.data?.items || [];
    return {
      total: issues.length,
      major: issues.filter((i) => i.level === 'major').length,
      serious: issues.filter((i) => i.level === 'serious').length,
      pending: issues.filter(
        (i) =>
          i.status === 'reported' ||
          i.status === 'rectifying' ||
          i.status === 'pending_verification'
      ).length,
      closed: issues.filter((i) => i.status === 'closed').length,
    };
  }, [issuesResp]);

  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: 'error.light' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'error.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle sx={{ width: 20, height: 20, color: 'error.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                隐患总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
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
                bgcolor: 'error.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XCircle sx={{ width: 20, height: 20, color: 'error.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                重大/严重
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.major + stats.serious}
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
                bgcolor: 'warning.light',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                待处理
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.pending}
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
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已闭环
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.closed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <AlertTriangle sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={safetyIssueSchema}
        apiAdapter={safetyIssueAdapter}
        breadcrumbs={[{ label: 'EHS' }, { label: i18n.t('ehs.ehs_hazard_page.k1') }]}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};

export default EhsHazardPage;
