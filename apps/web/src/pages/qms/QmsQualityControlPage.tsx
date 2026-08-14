import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, FileText } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { qualityIssueSchema, auditPlanSchema } from '@/schemas/qms';
import { qmsApi } from '@/api/qms';
import type { QualityIssue, AuditPlan, CreateQualityIssueRequest } from '@/api/qms';
import { designTokens } from '@/theme/tokens';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';
const ct= designTokens.colors;
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
interface QualityControlStats {
  totalNonconformances: number;
  openNonconformances: number;
  closedNonconformances: number;
  totalAudits: number;
  completedAudits: number;
  inProgressAudits: number;
}
function StatsCards({ stats }: { stats: QualityControlStats }) {
  const cards = [
    {
      icon: <AlertCircle sx={{ width: 20, height: 20, color: 'error.dark' }} />,
      iconBg: 'error.lighter',
      label: i18n.t('qms.qms_quality_control_page.k0'),
      value: stats.totalNonconformances,
    },
    {
      icon: <AlertCircle sx={{ width: 20, height: 20, color: ct.warning[600] }} />,
      iconBg: 'warning.100',
      label: i18n.t('qms.qms_quality_control_page.k1'),
      value: stats.openNonconformances,
    },
    {
      icon: <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />,
      iconBg: 'success.lighter',
      label: i18n.t('qms.qms_quality_control_page.k2'),
      value: stats.closedNonconformances,
    },
    {
      icon: <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />,
      iconBg: 'primary.100',
      label: i18n.t('qms.qms_quality_control_page.k3'),
      value: stats.totalAudits,
    },
    {
      icon: <FileText sx={{ width: 20, height: 20, color: 'secondary.dark' }} />,
      iconBg: 'secondary.100',
      label: i18n.t('qms.qms_quality_control_page.k4'),
      value: stats.inProgressAudits,
    },
    {
      icon: <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />,
      iconBg: 'success.lighter',
      label: i18n.t('qms.qms_quality_control_page.k5'),
      value: stats.completedAudits,
    },
  ];
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(6, 1fr)',
        },
        gap: 2,
        mb: 4,
      }}
    >
      {cards.map((card) => (
        <Card key={card.label}>
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
const issueAdapter = createCrudPageAdapter({
  list: qmsApi.listIssues,
  create: qmsApi.createIssue,
  update: (id: string, data: Record<string, unknown>) =>
    qmsApi.updateIssue(id, data as unknown as CreateQualityIssueRequest),
  delete: (id: string) => qmsApi.deleteIssue(id),
});
const auditAdapter = createCrudPageAdapter({
  list: qmsApi.listAuditPlans,
  create: async (_data: Record<string, unknown>) => {
    throw new Error(i18n.t('qms.qms_quality_control_page.k6'));
  },
  update: async (_id: string, _data: Record<string, unknown>) => {
    throw new Error(i18n.t('qms.qms_quality_control_page.k7'));
  },
  delete: async (_id: string) => {
    throw new Error(i18n.t('qms.qms_quality_control_page.k8'));
  },
});
const QmsQualityControlPage: React.FC = () => {
  const { data: issuesResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.QMS_QUALITY_CONTROL_STATS_ISSUES_BASE,
    queryFn: async () => qmsApi.listIssues(),
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const { data: auditsResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.QMS_QUALITY_CONTROL_STATS_AUDITS_BASE,
    queryFn: async () => qmsApi.listAuditPlans(),
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const stats: QualityControlStats = useMemo(() => {
    const issues = extractListData<QualityIssue>(issuesResp);
    const audits = extractListData<AuditPlan>(auditsResp);
    return {
      totalNonconformances: issues.length,
      openNonconformances: issues.filter((n) => n.status === 'open' || n.status === i18n.t('qms.qms_quality_control_page.k9'))
        .length,
      closedNonconformances: issues.filter(
        (n) => n.status === 'closed' || n.status === 'resolved' || n.status === i18n.t('qms.qms_quality_control_page.k10')
      ).length,
      totalAudits: audits.length,
      completedAudits: audits.filter((a) => a.status === 'completed' || a.status === i18n.t('qms.qms_quality_control_page.k11'))
        .length,
      inProgressAudits: audits.filter((a) => a.status === 'in_progress' || a.status === i18n.t('qms.qms_quality_control_page.k12'))
        .length,
    };
  }, [issuesResp, auditsResp]);
  return (
    <CrudPage
      schema={qualityIssueSchema}
      apiAdapter={issueAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: i18n.t('qms.qms_quality_control_page.k13') }]}
      defaultTab='issues'
      headerContent={() => <StatsCards stats={stats} />}
      tabs={[
        {
          id: 'issues',
          label: i18n.t('qms.qms_quality_control_page.k14'),
          content: <></>,
        },
        {
          id: 'audit',
          label: i18n.t('qms.qms_quality_control_page.k15'),
          content: (
            <CrudPage
              schema={auditPlanSchema}
              apiAdapter={auditAdapter}
            />
          ),
        },
      ]}
    />
  );
};
export default QmsQualityControlPage;