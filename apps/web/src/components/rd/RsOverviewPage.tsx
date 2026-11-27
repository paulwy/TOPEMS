/**
 * 研发项目概览
 *
 * 数据全部来自 RD 真实列表端点：
 *  - /api/rd/projects：项目总数 / 进行中 / 状态分布
 *  - /api/rd/bugs：缺陷总数 / 严重度分布
 *  - /api/rd/builds：构建总数 / 成功率 / 最近构建
 * 原先写死的 24/12/67/1,842/94.2%/8、模块代码量 85000… 与五条示例动态已删除。
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Activity, Bug, Hammer, Rocket, GitBranch, ShieldCheck, Plus } from 'lucide-react';
import i18n from '@/i18n';
import { DashboardTemplate, type StatCard, type ChartCard, type QuickAction, type RecentItem } from '@/components/templates';
import { RD_PATHS } from '@/module-configs/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTheme } from '@mui/material';
import { projectApi, bugApi, buildApi } from '@/api/rd';
import type { Bug as BugRow, Build } from '@/api/rd/types';

const PAGE_SIZE = 200;

interface ProjectRow {
  id: string;
  name?: string;
  status?: string;
  created_at?: string;
}

function groupBy<T>(rows: T[], key: (r: T) => string): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  rows.forEach((r) => map.set(key(r), (map.get(key(r)) ?? 0) + 1));
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

const RsOverviewPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const projectsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.RD_DASHBOARD_BASE, 'projects'],
    queryFn: async () => {
      const res = await projectApi.listProjects({ page: 1, page_size: PAGE_SIZE });
      return res.success && res.data ? res.data : { projects: [], total: 0 };
    },
  });

  const bugsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.RD_DASHBOARD_BASE, 'bugs'],
    queryFn: async () => {
      const res = await bugApi.listBugs({ page: 1, page_size: PAGE_SIZE });
      return res.success && res.data ? res.data : { bugs: [], total: 0 };
    },
  });

  const buildsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.RD_DASHBOARD_BASE, 'builds'],
    queryFn: async () => {
      const res = await buildApi.listBuilds({ page: 1, page_size: PAGE_SIZE });
      return res.success && res.data ? res.data : { builds: [], total: 0 };
    },
  });

  const loading = projectsQuery.isLoading || bugsQuery.isLoading || buildsQuery.isLoading;

  const projects = ((projectsQuery.data as { projects?: ProjectRow[] })?.projects ?? []);
  const bugs: BugRow[] = ((bugsQuery.data as { bugs?: BugRow[] })?.bugs ?? []);
  const builds: Build[] = ((buildsQuery.data as { builds?: Build[] })?.builds ?? []);

  const projectsTotal = Number((projectsQuery.data as { total?: number })?.total ?? 0);
  const bugsTotal = Number((bugsQuery.data as { total?: number })?.total ?? 0);
  const buildsTotal = Number((buildsQuery.data as { total?: number })?.total ?? 0);

  const inProgress = projects.filter((p) =>
    ['in_progress', 'active', 'running'].includes(String(p.status))
  ).length;

  const successRate = useMemo(() => {
    if (!builds.length) return 0;
    const ok = builds.filter((b) => ['success', 'succeeded', 'passed'].includes(String(b.status))).length;
    return (ok / builds.length) * 100;
  }, [builds]);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-projects',
        title: i18n.t('rd.rs_overview_page.k0'),
        value: String(projectsTotal),
        icon: <FolderKanban size={24} />,
        color: 'primary',
      },
      {
        id: 'in-progress',
        title: i18n.t('rd.rs_overview_page.k2'),
        value: String(inProgress),
        icon: <Activity size={24} />,
        color: 'info',
      },
      {
        id: 'bug-count',
        title: i18n.t('rd.rs_overview_page.k4'),
        value: String(bugsTotal),
        icon: <Bug size={24} />,
        color: 'warning',
      },
      {
        id: 'builds',
        title: i18n.t('rd.rs_overview_page.builds_total'),
        value: String(buildsTotal),
        icon: <Hammer size={24} />,
        color: 'success',
      },
      {
        id: 'build-success',
        title: i18n.t('rd.rs_overview_page.k8'),
        value: `${successRate.toFixed(1)}%`,
        icon: <ShieldCheck size={24} />,
        color: 'primary',
      },
    ],
    [projectsTotal, inProgress, bugsTotal, buildsTotal, successRate]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'project-status',
        title: i18n.t('rd.rs_overview_page.k21'),
        type: 'pie',
        data: groupBy(projects, (p) => String(p.status || i18n.t('rd.rs_overview_page.status_unknown'))),
      },
      {
        id: 'bug-severity',
        title: i18n.t('rd.rs_overview_page.bug_severity'),
        type: 'bar',
        data: groupBy(bugs, (b) => String(b.severity || i18n.t('rd.rs_overview_page.status_unknown'))),
      },
    ],
    [projects, bugs]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      { id: 'new-project', label: i18n.t('rd.rs_overview_page.k24'), icon: <Plus size={20} />, onClick: () => navigate(RD_PATHS.projectCreate), color: theme.palette.primary.dark },
      { id: 'bug-manage', label: i18n.t('rd.rs_overview_page.k25'), icon: <Bug size={20} />, onClick: () => navigate(RD_PATHS.bug), color: theme.palette.error.dark },
      { id: 'code-manage', label: i18n.t('rd.rs_overview_page.k26'), icon: <GitBranch size={20} />, onClick: () => navigate(RD_PATHS.code), color: theme.palette.secondary.dark },
      { id: 'build-manage', label: i18n.t('rd.rs_overview_page.k27'), icon: <Hammer size={20} />, onClick: () => navigate(RD_PATHS.build), color: theme.palette.warning.dark },
      { id: 'release', label: i18n.t('rd.rs_overview_page.k28'), icon: <Rocket size={20} />, onClick: () => navigate(RD_PATHS.release), color: theme.palette.teal[700] },
      { id: 'review', label: i18n.t('rd.rs_overview_page.k29'), icon: <ShieldCheck size={20} />, onClick: () => navigate(RD_PATHS.review), color: theme.palette.success.dark },
    ],
    [navigate, theme]
  );

  const recentItems: RecentItem[] = useMemo(
    () =>
      builds.slice(0, 5).map((b) => ({
        id: b.id,
        title: String((b as { build_number?: string; name?: string }).build_number || (b as { name?: string }).name || b.id),
        description: String(b.status || ''),
        time: (b as { created_at?: string }).created_at
          ? new Date((b as { created_at: string }).created_at).toLocaleString('zh-CN', { hour12: false })
          : '',
        icon: <Hammer size={18} />,
        status:
          ['success', 'succeeded', 'passed'].includes(String(b.status))
            ? ('success' as const)
            : String(b.status).includes('fail')
              ? ('error' as const)
              : ('info' as const),
        onClick: () => navigate(RD_PATHS.build),
      })),
    [builds, navigate]
  );

  return (
    <DashboardTemplate
      title={i18n.t('rd.rs_overview_page.k36')}
      breadcrumbs={[
        { label: i18n.t('rd.rs_overview_page.k38'), href: '/dashboard' },
        { label: i18n.t('rd.rs_overview_page.k37') },
      ]}
      stats={stats}
      charts={charts}
      recentItems={recentItems}
      recentTitle={i18n.t('rd.rs_overview_page.k39')}
      quickActions={quickActions}
      quickActionsTitle={i18n.t('rd.rs_overview_page.k40')}
      loading={loading}
    />
  );
};

export default RsOverviewPage;
