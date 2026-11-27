import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { FileCheck, ClipboardCheck, AlertTriangle, Shield } from 'lucide-react';

import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { regulationSchema, assessmentSchema, permitSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import { designTokens } from '@/theme/tokens';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

interface StatusItem {
  status: string;
}

function extractListData<T>(response: unknown): T[] {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as T[];
    if (Array.isArray(d.data)) return d.data as T[];
  }
  return [];
}

interface ComplianceStats {
  totalRegulations: number;
  effectiveRegulations: number;
  completedAssessments: number;
  validPermits: number;
}

function StatsCards({ stats }: { stats: ComplianceStats }) {
  const theme = useTheme();
  const cards = [
    {
      icon: <FileCheck sx={{ width: 20, height: 20, color: theme.palette.success.dark }} />,
      iconBg: 'success.50',
      label: i18n.t('ehs:compliance_page.regulation_total'),
      value: stats.totalRegulations,
      accentColor: 'success',
    },
    {
      icon: <Shield sx={{ width: 20, height: 20, color: theme.palette.primary.dark }} />,
      iconBg: 'primary.50',
      label: i18n.t('ehs:compliance_page.regulation_effective'),
      value: stats.effectiveRegulations,
      accentColor: 'primary',
    },
    {
      icon: <ClipboardCheck sx={{ width: 20, height: 20, color: theme.palette.warning.dark }} />,
      iconBg: 'warning.50',
      label: i18n.t('ehs:compliance_page.assessment_completed'),
      value: stats.completedAssessments,
      accentColor: 'warning',
    },
    {
      icon: <AlertTriangle sx={{ width: 20, height: 20, color: theme.palette.info.dark }} />,
      iconBg: 'info.50',
      label: i18n.t('ehs:compliance_page.permit_valid'),
      value: stats.validPermits,
      accentColor: 'info',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {cards.map((card) => (
        <Card
          key={card.label}
          sx={{
            bgcolor: alpha(
              (theme.palette as unknown as Record<string, { main: string }>)[card.accentColor]
                ?.main ?? theme.palette.primary.main,
              0.06
            ),
            border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: card.iconBg,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'slate.600',
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {card.value}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

const regulationAdapter = createCrudPageAdapter({
  list: ehsApi.listEnvironmentalRegulations,
  create: ehsApi.createEnvironmentalRegulation,
  update: ehsApi.updateEnvironmentalRegulation,
  delete: ehsApi.deleteEnvironmentalRegulation,
});

const assessmentAdapter = createCrudPageAdapter({
  list: ehsApi.listComplianceAssessments,
  create: ehsApi.createComplianceAssessment,
  update: ehsApi.updateComplianceAssessment,
  delete: ehsApi.deleteComplianceAssessment,
});

const permitAdapter = createCrudPageAdapter({
  list: ehsApi.listDischargePermits,
  create: ehsApi.createDischargePermit,
  update: ehsApi.updateDischargePermit,
  delete: ehsApi.deleteDischargePermit,
});

const CompliancePage: React.FC = () => {
  const { data: regulationsResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_COMPLIANCE_STATS_REGULATIONS_BASE,
    queryFn: async () => ehsApi.listEnvironmentalRegulations({ page_size: 500 }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: assessmentsResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_COMPLIANCE_STATS_ASSESSMENTS_BASE,
    queryFn: async () => ehsApi.listComplianceAssessments({ page_size: 500 }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: permitsResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_COMPLIANCE_STATS_PERMITS_BASE,
    queryFn: async () => ehsApi.listDischargePermits({ page_size: 500 }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const stats: ComplianceStats = useMemo(() => {
    const regulations = extractListData<StatusItem>(regulationsResp);
    const assessments = extractListData<StatusItem>(assessmentsResp);
    const permits = extractListData<StatusItem>(permitsResp);

    return {
      totalRegulations: regulations.length,
      effectiveRegulations: regulations.filter((r) => r.status === 'effective').length,
      completedAssessments: assessments.filter((a) => a.status === 'completed').length,
      validPermits: permits.filter((p) => p.status === 'valid').length,
    };
  }, [regulationsResp, assessmentsResp, permitsResp]);

  return (
    <CrudPage
      schema={regulationSchema}
      apiAdapter={regulationAdapter}
      breadcrumbs={[
        { label: 'EHS' },
        { label: i18n.t('ehs:compliance_page.compliance_management') },
      ]}
      defaultTab='list'
      headerContent={() => <StatsCards stats={stats} />}
      tabs={[
        {
          // 第一个 Tab 就是主列表（法规清单），不传 content —— 曾有「首个 Tab 塞自定义列表
          // + 主列表」的双渲染问题（A-02/A-03），CrudPage 现已做防御，这里也补齐默认 Tab，
          // 否则 defaultTab='list' 指向不存在的 Tab，切成评估/许可后无法切回法规清单。
          id: 'list',
          label: i18n.t('ehs:compliance_page.regulation_list'),
        },
        {
          id: 'assessments',
          label: i18n.t('ehs:compliance_page.assessment_list'),
          content: (
            <CrudPage
              schema={assessmentSchema}
              apiAdapter={assessmentAdapter}
            />
          ),
        },
        {
          id: 'permits',
          label: i18n.t('ehs:compliance_page.permit_list'),
          content: (
            <CrudPage
              schema={permitSchema}
              apiAdapter={permitAdapter}
            />
          ),
        },
      ]}
    />
  );
};

export default CompliancePage;
