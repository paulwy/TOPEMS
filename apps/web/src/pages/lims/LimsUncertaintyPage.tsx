import React, { useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import { PageContainer } from '@/components/common';
import { uncertaintyProjectSchema } from '@/schemas/lims';
import { limsApi } from '@/api/lims';
import type { UncertaintyProject } from '@/api/lims';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';

const ct = designTokens.colors;
const uncertaintyAdapter = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const response = await limsApi.listUncertaintyProjects();
    let data: UncertaintyProject[] = [];
    if (response.success && response.data) {
      const raw = response.data as unknown;
      if (Array.isArray(raw)) {
        data = raw as UncertaintyProject[];
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.items)) data = obj.items as UncertaintyProject[];
        else if (Array.isArray(obj.projects)) data = obj.projects as UncertaintyProject[];
        else if (Array.isArray(obj.data)) data = obj.data as UncertaintyProject[];
      }
    }
    if (params?.search) {
      const search = params.search.toLowerCase();
      data = data.filter(
        (item) =>
          item.project_name.toLowerCase().includes(search) ||
          item.project_no.toLowerCase().includes(search)
      );
    }
    if (params?.status && params.status !== 'all') {
      data = data.filter((item) => item.status === params.status);
    }
    const total = data.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = data.slice(start, end);
    return { data: paginatedData, total };
  },
  create: async (data: Partial<UncertaintyProject>) => {
    const response = await limsApi.createUncertaintyProject(
      data as Parameters<typeof limsApi.createUncertaintyProject>[0]
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('lims.lims_uncertainty_page.k0'));
    }
    return response.data as unknown as UncertaintyProject;
  },
  update: async (id: string, data: Partial<UncertaintyProject>) => {
    const response = await limsApi.updateUncertaintyProject(
      id,
      data as Parameters<typeof limsApi.updateUncertaintyProject>[1]
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('lims.lims_uncertainty_page.k1'));
    }
    return response.data as unknown as UncertaintyProject;
  },
  delete: async (id: string) => {
    const response = await limsApi.deleteUncertaintyProject(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('lims.lims_uncertainty_page.k2'));
    }
  },
};
const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  bgColor?: string;
  iconBgColor: string;
  iconColor: string;
  gradient?: boolean;
}> = ({ label, value, icon, bgColor, iconBgColor, iconColor, gradient }) => (
  <Card sx={bgColor ? { bgcolor: bgColor } : undefined}>
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            bgcolor: gradient ? undefined : iconBgColor,
            background: gradient
              ? `linear-gradient(135deg, ${iconBgColor}, ${iconColor})`
              : undefined,
            boxShadow: gradient ? ((theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`) : undefined,
            borderRadius: gradient ? '50%' : 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ color: gradient ? ct.background.paper : iconColor, display: 'flex' }}>
            {icon}
          </Box>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600', fontSize: '0.875rem' }}
          >
            {label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'slate.900' }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);
const LimsUncertaintyPage: React.FC = () => {
  const { data: allProjects } = useQuery({
    queryKey: [uncertaintyProjectSchema.entity, 'stats'],
    queryFn: async () => {
      const response = await limsApi.listUncertaintyProjects();
      let data: UncertaintyProject[] = [];
      if (response.success && response.data) {
        const raw = response.data as unknown;
        if (Array.isArray(raw)) {
          data = raw as UncertaintyProject[];
        } else if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          if (Array.isArray(obj.items)) data = obj.items as UncertaintyProject[];
          else if (Array.isArray(obj.projects)) data = obj.projects as UncertaintyProject[];
        }
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const projects = allProjects || [];
  const stats = useMemo(() => {
    return {
      total: projects.length,
      draft: projects.filter((p) => p.status === i18n.t('lims.lims_uncertainty_page.k3')).length,
      calculating: projects.filter((p) => p.status === i18n.t('lims.lims_uncertainty_page.k4'))
        .length,
      completed: projects.filter((p) => p.status === i18n.t('lims.lims_uncertainty_page.k5'))
        .length,
    };
  }, [projects]);
  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <StatCard
        label={i18n.t('lims.lims_uncertainty_page.k6')}
        value={stats.total}
        icon={<Calculator size={20} />}
        bgColor={ct.orange[50]}
        iconBgColor={ct.orange[100]}
        iconColor='warning.600'
      />
      <StatCard
        label={i18n.t('lims.lims_uncertainty_page.k7')}
        value={stats.draft}
        icon={<Calculator size={20} />}
        iconBgColor={ct.primary.main}
        iconColor={ct.primary[600]}
        gradient
      />
      <StatCard
        label={i18n.t('lims.lims_uncertainty_page.k8')}
        value={stats.calculating}
        icon={<Calculator size={20} />}
        iconBgColor='primary.100'
        iconColor='primary.dark'
      />
      <StatCard
        label={i18n.t('lims.lims_uncertainty_page.k9')}
        value={stats.completed}
        icon={<Calculator size={20} />}
        iconBgColor={ct.success.main}
        iconColor={ct.success[600]}
        gradient
      />
    </Box>
  );
  return (
    <PageContainer
      title={i18n.t('lims.lims_uncertainty_page.k10')}
      subtitle='Uncertainty Evaluation'
      headerProps={{
        pageIcon: <Calculator style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.orange.main} 0%, ${ct.orange.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={uncertaintyProjectSchema}
        apiAdapter={uncertaintyAdapter}
        breadcrumbs={[
          { label: i18n.t('lims.lims_uncertainty_page.k11'), href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS' },
          { label: i18n.t('lims.lims_uncertainty_page.k12') },
        ]}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};
export default LimsUncertaintyPage;
