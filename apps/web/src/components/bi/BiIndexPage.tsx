/**
 * BI 工作台
 *
 * 真实数据来源：/api/bi/dashboard、/api/bi/reports、/api/bi/datasets。
 * 原先写死的 12/28/16/8、虚拟 sparkline、7 天假访问趋势、四类"最近"假列表与假数据集行数全部删除：
 *  - 指标卡只保留后端真有总数的三项
 *  - 三块列表分别渲染真实最近仪表盘 / 报表 / 数据集，无数据时展示空态
 */
import React, { useEffect, useMemo } from 'react';
import { LayoutDashboard, FileText, Database, ChevronRight } from 'lucide-react';
import { Box, Typography, Card, CardContent, Grid, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Chip, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DashboardTemplate, type StatCard } from '@/components/templates';
import { fetchDashboards, listDatasets, type Dashboard, type Report, type Dataset } from '@/api/bi';
import { fetchReports } from '@/api/report';
import { logger } from '@/utils/logger';
import { BI_PATHS } from '@/module-configs/bi/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const BiIndexPage: React.FC = () => {
  const biDataQuery = useQuery<{
    dashboards: Dashboard[];
    reports: Report[];
    datasets: Dataset[];
    dashboardTotal: number;
    datasetTotal: number;
  }>({
    queryKey: QUERY_KEYS.AD_HOC.BI_INDEX_DATA_BASE,
    queryFn: async () => {
      const [dashRes, reportRes, dsRes] = await Promise.all([
        fetchDashboards(),
        fetchReports(),
        listDatasets({ page: 1, pageSize: 5 }),
      ]);
      return {
        dashboards: dashRes?.success && dashRes.data?.items ? dashRes.data.items.slice(0, 5) : [],
        dashboardTotal: Number(dashRes?.success && dashRes.data?.total ? dashRes.data.total : 0),
        reports: reportRes?.success && Array.isArray(reportRes.data) ? (reportRes.data as unknown as Report[]).slice(0, 5) : [],
        datasets: dsRes?.success && dsRes.data?.items ? dsRes.data.items.slice(0, 5) : [],
        datasetTotal: Number(dsRes?.success && dsRes.data?.total ? dsRes.data.total : 0),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (biDataQuery.isError) logger.error('Failed to load BI data:', biDataQuery.error);
  }, [biDataQuery.isError, biDataQuery.error]);

  const data = biDataQuery.data;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'dashboards',
        title: i18n.t('bi.bi_index_page.dashboard_stat'),
        value: String(data?.dashboardTotal ?? 0),
        icon: <LayoutDashboard size={22} />,
        color: 'primary',
      },
      {
        id: 'reports',
        title: i18n.t('bi.bi_index_page.report_stat'),
        value: String(data?.reports.length ?? 0),
        icon: <FileText size={22} />,
        color: 'warning',
      },
      {
        id: 'datasets',
        title: i18n.t('bi.bi_index_page.dataset_stat'),
        value: String(data?.datasetTotal ?? 0),
        icon: <Database size={22} />,
        color: 'success',
      },
    ],
    [data]
  );

  return (
    <DashboardTemplate
      title={i18n.t('bi.bi_index_page.bi_hero_title')}
      subtitle={i18n.t('bi.bi_index_page.hero_subtitle')}
      breadcrumbs={[{ label: i18n.t('bi.bi_index_page.home'), href: '/dashboard' }, { label: 'BI' }]}
      stats={stats}
      loading={biDataQuery.isLoading}
    >
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {i18n.t('bi.bi_index_page.k16')}
                </Typography>
                <Button size='small' endIcon={<ChevronRight size={16} />} href={BI_PATHS.dashboard}>
                  {i18n.t('bi.bi_index_page.k17')}
                </Button>
              </Box>
              {data?.dashboards.length ? (
                <List dense disablePadding>
                  {data.dashboards.map((d) => (
                    <ListItem key={d.id} disablePadding>
                      <ListItemButton href={BI_PATHS.dashboard}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <LayoutDashboard size={16} />
                        </ListItemIcon>
                        <ListItemText
                          primary={d.name}
                          secondary={d.description || ''}
                          slotProps={{ primary: { variant: 'body2' }, secondary: { variant: 'caption' } }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  {i18n.t('bi.bi_index_page.empty')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {i18n.t('bi.bi_index_page.k18')}
                </Typography>
                <Button size='small' endIcon={<ChevronRight size={16} />} href={BI_PATHS.report}>
                  {i18n.t('bi.bi_index_page.k17')}
                </Button>
              </Box>
              {data?.reports.length ? (
                <List dense disablePadding>
                  {data.reports.map((r) => (
                    <ListItem key={r.id} disablePadding>
                      <ListItemButton href='/bi/reports'>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <FileText size={16} />
                        </ListItemIcon>
                        <ListItemText
                          primary={r.name}
                          secondary={r.report_type || r.type || ''}
                          slotProps={{ primary: { variant: 'body2' }, secondary: { variant: 'caption' } }}
                        />
                        {r.status ? <Chip label={r.status} size='small' variant='outlined' /> : null}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  {i18n.t('bi.bi_index_page.empty')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {i18n.t('bi.bi_index_page.k20')}
                </Typography>
                <Button size='small' endIcon={<ChevronRight size={16} />} href={BI_PATHS.dataset}>
                  {i18n.t('bi.bi_index_page.k17')}
                </Button>
              </Box>
              {data?.datasets.length ? (
                <List dense disablePadding>
                  {data.datasets.map((ds) => (
                    <ListItem key={ds.id} disablePadding>
                      <ListItemButton href={BI_PATHS.dataset}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Database size={16} />
                        </ListItemIcon>
                        <ListItemText
                          primary={ds.name}
                          secondary={ds.row_count != null ? `${ds.row_count} rows` : ds.status}
                          slotProps={{ primary: { variant: 'body2' }, secondary: { variant: 'caption' } }}
                        />
                        <Chip label={ds.status} size='small' variant='outlined' />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  {i18n.t('bi.bi_index_page.empty')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardTemplate>
  );
};

export default BiIndexPage;
