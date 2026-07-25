import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { FileCheck, ClipboardCheck, AlertTriangle, Shield } from 'lucide-react';

import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { regulationSchema, assessmentSchema, permitSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

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
      label: '法规总数',
      value: stats.totalRegulations,
      accentColor: 'success',
    },
    {
      icon: <Shield sx={{ width: 20, height: 20, color: ct.primary.dark }} />,
      iconBg: 'primary.lighter',
      label: '有效法规',
      value: stats.effectiveRegulations,
      accentColor: 'primary',
    },
    {
      icon: <ClipboardCheck sx={{ width: 20, height: 20, color: ct.warning.dark }} />,
      iconBg: 'warning.lighter',
      label: '已完成评估',
      value: stats.completedAssessments,
      accentColor: 'warning',
    },
    {
      icon: <AlertTriangle sx={{ width: 20, height: 20, color: ct.info.dark }} />,
      iconBg: 'info.lighter',
      label: '有效许可证',
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
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
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
    queryKey: ['ehs', 'compliance', 'stats', 'regulations'],
    queryFn: async () => ehsApi.listEnvironmentalRegulations({ pagesize: 500 }),
  });

  const { data: assessmentsResp } = useQuery({
    queryKey: ['ehs', 'compliance', 'stats', 'assessments'],
    queryFn: async () => ehsApi.listComplianceAssessments({ pagesize: 500 }),
  });

  const { data: permitsResp } = useQuery({
    queryKey: ['ehs', 'compliance', 'stats', 'permits'],
    queryFn: async () => ehsApi.listDischargePermits({ pagesize: 500 }),
  });

  const stats: ComplianceStats = useMemo(() => {
    const regulations = extractListData<any>(regulationsResp);
    const assessments = extractListData<any>(assessmentsResp);
    const permits = extractListData<any>(permitsResp);

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
      breadcrumbs={[{ label: 'EHS' }, { label: '合规管理' }]}
      defaultTab='list'
      headerContent={() => <StatsCards stats={stats} />}
      tabs={[
        {
          id: 'assessments',
          label: '合规评估',
          content: (
            <CrudPage
              schema={assessmentSchema}
              apiAdapter={assessmentAdapter}
            />
          ),
        },
        {
          id: 'permits',
          label: '排污许可证',
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
