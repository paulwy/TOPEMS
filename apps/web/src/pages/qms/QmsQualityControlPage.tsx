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
      label: '不合格品总数',
      value: stats.totalNonconformances,
    },
    {
      icon: <AlertCircle sx={{ width: 20, height: 20, color: ct.warning[600] }} />,
      iconBg: 'warning.100',
      label: '待处理',
      value: stats.openNonconformances,
    },
    {
      icon: <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />,
      iconBg: 'success.lighter',
      label: '已关闭',
      value: stats.closedNonconformances,
    },
    {
      icon: <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />,
      iconBg: 'primary.100',
      label: '审核总数',
      value: stats.totalAudits,
    },
    {
      icon: <FileText sx={{ width: 20, height: 20, color: 'secondary.dark' }} />,
      iconBg: 'secondary.100',
      label: '进行中审核',
      value: stats.inProgressAudits,
    },
    {
      icon: <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />,
      iconBg: 'success.lighter',
      label: '已完成审核',
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
    throw new Error('审核计划不支持创建');
  },
  update: async (_id: string, _data: Record<string, unknown>) => {
    throw new Error('审核计划不支持更新');
  },
  delete: async (_id: string) => {
    throw new Error('审核计划不支持删除');
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
      openNonconformances: issues.filter((n) => n.status === 'open' || n.status === '待处理')
        .length,
      closedNonconformances: issues.filter(
        (n) => n.status === 'closed' || n.status === 'resolved' || n.status === '已关闭'
      ).length,
      totalAudits: audits.length,
      completedAudits: audits.filter((a) => a.status === 'completed' || a.status === '已完成')
        .length,
      inProgressAudits: audits.filter((a) => a.status === 'in_progress' || a.status === '进行中')
        .length,
    };
  }, [issuesResp, auditsResp]);

  return (
    <CrudPage
      schema={qualityIssueSchema}
      apiAdapter={issueAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: '质量管理' }]}
      defaultTab='issues'
      headerContent={() => <StatsCards stats={stats} />}
      tabs={[
        {
          id: 'issues',
          label: '不合格品管理',
          content: <></>,
        },
        {
          id: 'audit',
          label: '审核管理',
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
