/**
 * 审核合规率分析页
 *
 * 使用 recharts BarChart 展示审核合规率：
 * - 按部门分组：审核任务完成率 + 发现项关闭率
 * - 按审核类型分组：合规率
 * 数据来自 useQmsMock 的 auditPlans / auditTasks / auditFindings。
 */
import { useMemo } from 'react';
import { Grid, Paper, Typography, Alert } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { designTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { StatsPageTemplate, type StatCard } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { auditApi } from '@/api/qms/audit';
import type { AuditPlan, AuditTask, AuditFinding } from '@/api/qms/types';

export default function QmsAuditCompliancePage() {
  const { t } = useTranslation('qms');
  const { data: plansData, loading: plansLoading } = useAnalyticsData<AuditPlan[]>({
    fetcher: () => auditApi.listAuditPlans(),
    deps: [],
  });
  const { data: tasksData, loading: tasksLoading } = useAnalyticsData<AuditTask[]>({
    fetcher: () => auditApi.listAuditTasks(),
    deps: [],
  });
  const {
    data: findingsData,
    loading: findingsLoading,
    error,
    reload,
  } = useAnalyticsData<AuditFinding[]>({
    fetcher: () => auditApi.listAuditFindings(),
    deps: [],
  });

  const loading = plansLoading || tasksLoading || findingsLoading;
  const plans = useMemo(() => plansData ?? [], [plansData]);
  const tasks = useMemo(() => tasksData ?? [], [tasksData]);
  const findings = useMemo(() => findingsData ?? [], [findingsData]);

  const overall = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const taskCompletionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;
    const totalFindings = findings.length;
    const closedFindings = findings.filter(
      (f) => f.status === 'verified' || f.status === 'closed' || f.status === 'rectified'
    ).length;
    const findingCloseRate =
      totalFindings > 0 ? Math.round((closedFindings / totalFindings) * 1000) / 10 : 0;
    const totalPlans = plans.length;
    const completedPlans = plans.filter((p) => p.status === 'completed').length;
    const planCompletionRate =
      totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 1000) / 10 : 0;
    return {
      totalTasks,
      completedTasks,
      taskCompletionRate,
      totalFindings,
      closedFindings,
      findingCloseRate,
      totalPlans,
      completedPlans,
      planCompletionRate,
    };
  }, [plans, tasks, findings]);

  const byDepartment = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        completed: number;
        findings: number;
        closed: number;
      }
    >();
    plans.forEach((p) => {
      (p.departments ?? []).forEach((dept: string) => {
        if (!map.has(dept)) map.set(dept, { total: 0, completed: 0, findings: 0, closed: 0 });
        const entry = map.get(dept)!;
        entry.total += 1;
        if (p.status === 'completed') entry.completed += 1;
      });
    });
    // 关联发现项到部门（通过 task → plan → departments）
    const planDeptMap = new Map<string, string[]>();
    plans.forEach((p) => planDeptMap.set(p.id, p.departments ?? []));
    const taskPlanMap = new Map<string, string>();
    tasks.forEach((t) => taskPlanMap.set(t.id, t.plan_id));
    findings.forEach((f) => {
      const taskId = f.task_id;
      const planId = taskPlanMap.get(taskId);
      const depts = planId ? (planDeptMap.get(planId) ?? []) : [];
      depts.forEach((dept) => {
        const entry = map.get(dept);
        if (entry) {
          entry.findings += 1;
          if (f.status === 'verified' || f.status === 'closed' || f.status === 'rectified')
            entry.closed += 1;
        }
      });
    });
    return Array.from(map.entries()).map(([department, v]) => ({
      department,
      completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 1000) / 10 : 0,
      findingCloseRate: v.findings > 0 ? Math.round((v.closed / v.findings) * 1000) / 10 : 0,
    }));
  }, [plans, tasks, findings]);

  const byAuditType = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        completed: number;
      }
    >();
    plans.forEach((p) => {
      const type = p.audit_type;
      if (!map.has(type)) map.set(type, { total: 0, completed: 0 });
      const entry = map.get(type)!;
      entry.total += 1;
      if (p.status === 'completed') entry.completed += 1;
    });
    return Array.from(map.entries()).map(([auditType, v]) => ({
      auditType,
      complianceRate: v.total > 0 ? Math.round((v.completed / v.total) * 1000) / 10 : 0,
    }));
  }, [plans]);

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        id: 'planCompletionRate',
        title: t('qms.qms_audit_compliance_page.k4'),
        value: overall.planCompletionRate,
        suffix: '%',
        color: 'secondary',
        description: `${overall.completedPlans} / ${overall.totalPlans}`,
      },
      {
        id: 'taskCompletionRate',
        title: t('qms.qms_audit_compliance_page.k5'),
        value: overall.taskCompletionRate,
        suffix: '%',
        color: 'success',
        description: `${overall.completedTasks} / ${overall.totalTasks}`,
      },
      {
        id: 'findingCloseRate',
        title: t('qms.qms_audit_compliance_page.k6'),
        value: overall.findingCloseRate,
        suffix: '%',
        color: 'warning',
        description: `${overall.closedFindings} / ${overall.totalFindings}`,
      },
    ],
    [overall, t]
  );

  const radialData = [
    {
      name: t('qms.qms_audit_compliance_page.k0'),
      value: overall.planCompletionRate,
      fill: designTokens.colors.secondary.dark,
    },
    {
      name: t('qms.qms_audit_compliance_page.k1'),
      value: overall.taskCompletionRate,
      fill: designTokens.colors.success.dark,
    },
    {
      name: t('qms.qms_audit_compliance_page.k2'),
      value: overall.findingCloseRate,
      fill: designTokens.colors.warning.main,
    },
  ];

  return (
    <StatsPageTemplate
      title={t('qms.qms_audit_compliance_page.k3')}
      subtitle={`${i18n.t('qms.analytics.auditCompliance.k0')}${overall.totalPlans} ${i18n.t(
        'qms.analytics.auditCompliance.k1'
      )}${overall.totalTasks} ${i18n.t('qms.analytics.auditCompliance.k2')}${overall.totalFindings}`}
      statCards={statCards}
      showTimeRange={false}
      showSearch={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      loading={loading}
    >
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={reload}
        >
          {t('qms.qms_audit_compliance_page.load_failed', { error: String(error) })}
        </Alert>
      )}
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t('qms.qms_audit_compliance_page.k7')}
            </Typography>
            <ResponsiveContainer
              width='100%'
              height={240}
            >
              <RadialBarChart
                innerRadius='30%'
                outerRadius='100%'
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background
                  dataKey='value'
                  cornerRadius={6}
                />
                <Legend
                  iconSize={10}
                  layout='vertical'
                  verticalAlign='middle'
                  align='right'
                />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('qms.analytics.auditCompliance.k3')}
            </Typography>
            <ResponsiveContainer
              width='100%'
              height={240}
            >
              <BarChart
                data={byDepartment}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='department'
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 100]}
                  unit='%'
                  fontSize={11}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey='completionRate'
                  name={t('qms.qms_audit_compliance_page.k8')}
                  fill={designTokens.colors.success.dark}
                  barSize={20}
                />
                <Bar
                  dataKey='findingCloseRate'
                  name={t('qms.qms_audit_compliance_page.k9')}
                  fill={designTokens.colors.warning.main}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t('qms.qms_audit_compliance_page.k10')}
            </Typography>
            <ResponsiveContainer
              width='100%'
              height={260}
            >
              <BarChart
                data={byAuditType}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='auditType'
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 100]}
                  unit='%'
                  fontSize={11}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey='complianceRate'
                  name={t('qms.qms_audit_compliance_page.k11')}
                  fill={designTokens.colors.secondary.dark}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </StatsPageTemplate>
  );
}
