import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { FileCheck, ClipboardCheck, AlertTriangle, Shield } from 'lucide-react';

import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { regulationSchema, assessmentSchema, permitSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import { designTokens } from '@/theme/tokens';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

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
  const cards = [
    {
      icon: <FileCheck sx={{ width: 20, height: 20, color: ct.success.dark }} />,
      iconBg: 'success.lighter',
      label: i18n.t('ehs.compliance_page.k0'),
      value: stats.totalRegulations,
      accentColor: 'success',
    },
    {
      icon: <Shield sx={{ width: 20, height: 20, color: ct.primary.dark }} />,
      iconBg: 'primary.lighter',
      label: i18n.t('ehs.compliance_page.k1'),
      value: stats.effectiveRegulations,
      accentColor: 'primary',
    },
    {
      icon: <ClipboardCheck sx={{ width: 20, height: 20, color: ct.warning.dark }} />,
      iconBg: 'warning.lighter',
      label: i18n.t('ehs.compliance_page.k2'),
      value: stats.completedAssessments,
      accentColor: 'warning',
    },
    {
      icon: <AlertTriangle sx={{ width: 20, height: 20, color: ct.info.dark }} />,
      iconBg: 'info.lighter',
      label: i18n.t('ehs.compliance_page.k3'),
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
          sx={{ bgcolor: `${card.accentColor}.light` }}
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
    queryFn: async () => ehsApi.listEnvironmentalRegulations({ pagesize: 500 }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: assessmentsResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_COMPLIANCE_STATS_ASSESSMENTS_BASE,
    queryFn: async () => ehsApi.listComplianceAssessments({ pagesize: 500 }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: permitsResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_COMPLIANCE_STATS_PERMITS_BASE,
    queryFn: async () => ehsApi.listDischargePermits({ pagesize: 500 }),

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
      breadcrumbs={[{ label: 'EHS' }, { label: i18n.t('ehs.compliance_page.k4') }]}
      defaultTab='list'
      headerContent={() => <StatsCards stats={stats} />}
      tabs={[
        {
          id: 'assessments',
          label: i18n.t('ehs.compliance_page.k5'),
          content: (
            <CrudPage
              schema={assessmentSchema}
              apiAdapter={assessmentAdapter}
            />
          ),
        },
        {
          id: 'permits',
          label: i18n.t('ehs.compliance_page.k6'),
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
