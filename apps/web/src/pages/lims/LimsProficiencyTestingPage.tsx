import React from 'react';
import { Box } from '@mui/material';
import { FileCheck, Clock, CheckCircle, XCircle, Target } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import { ptPlanSchema } from '@/schemas/lims';
import { ptPlanApi } from '@/api/lims/proficiencyTesting';
import type { PtPlan } from '@/api/lims/types';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;
const ptPlanAdapter = {
  list: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    cycle?: string;
  }) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      page_size: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status && params.status !== 'all') queryParams.status = params.status;
    if (params?.cycle && params.cycle !== 'all') queryParams.cycle = params.cycle;
    const response = await ptPlanApi.list(
      queryParams as unknown as Parameters<typeof ptPlanApi.list>[0]
    );
    if (response.success && response.data) {
      return {
        data: response.data.items || [],
        total: response.data.total || 0,
      };
    }
    return { data: [], total: 0 };
  },
  create: async (data: Partial<PtPlan>) => {
    const response = await ptPlanApi.create(data as Parameters<typeof ptPlanApi.create>[0]);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('lims.lims_proficiency_testing_page.k0'));
    }
    return response.data;
  },
  update: async (id: string, data: Partial<PtPlan>) => {
    const response = await ptPlanApi.update(id, data as Parameters<typeof ptPlanApi.update>[1]);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('lims.lims_proficiency_testing_page.k1'));
    }
    return response.data;
  },
  delete: async (id: string) => {
    const response = await ptPlanApi.delete(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('lims.lims_proficiency_testing_page.k2'));
    }
  },
};
const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}> = ({ label, value, icon, bgColor, iconColor }) => (
  <Box sx={{ p: 2, bgcolor: bgColor, borderRadius: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box sx={{ display: 'flex', color: iconColor }}>{icon}</Box>
      <Box
        component='span'
        sx={{ color: 'text.secondary', fontSize: 14 }}
      >
        {label}
      </Box>
    </Box>
    <Box sx={{ fontWeight: 700, fontSize: 24, color: iconColor }}>{value}</Box>
  </Box>
);
const LimsProficiencyTestingPage: React.FC = () => {
  const headerContent = (rows: Record<string, unknown>[], total: number) => {
    const plans = rows as unknown as PtPlan[];
    const ongoingCount = plans.filter((p) => p.status === 'ongoing').length;
    const completedCount = plans.filter((p) => p.status === 'completed').length;
    const failedCount = plans.filter((p) => p.status === 'failed').length;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label={i18n.t('lims.lims_proficiency_testing_page.k3')}
          value={total}
          icon={<Target size={18} />}
          bgColor={ct.secondary[100]}
          iconColor='secondary.700'
        />
        <StatCard
          label={i18n.t('lims.lims_proficiency_testing_page.k4')}
          value={ongoingCount}
          icon={<Clock size={18} />}
          bgColor='warning.light'
          iconColor='warning.700'
        />
        <StatCard
          label={i18n.t('lims.lims_proficiency_testing_page.k5')}
          value={completedCount}
          icon={<CheckCircle size={18} />}
          bgColor='success.lighter'
          iconColor='success.700'
        />
        <StatCard
          label={i18n.t('lims.lims_proficiency_testing_page.k6')}
          value={failedCount}
          icon={<XCircle size={18} />}
          bgColor='error.lighter'
          iconColor='error.dark'
        />
      </Box>
    );
  };
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <FileCheck style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={ptPlanSchema}
        apiAdapter={ptPlanAdapter}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};
export default LimsProficiencyTestingPage;
