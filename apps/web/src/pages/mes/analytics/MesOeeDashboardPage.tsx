import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import { DashboardTemplate, type StatCardConfig } from '@/components/templates/DashboardTemplate';
import { Target, Activity, Gauge, CheckCircle } from 'lucide-react';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { mesAnalyticsApi } from '@/api/mes/analytics';

const CHART_HEIGHT_SM = 200;
const CHART_HEIGHT_LG = 300;

export default function MesOeeDashboardPage() {
  const { data: analyticsData, loading } = useAnalyticsData({
    fetcher: () => mesAnalyticsApi.getOeeDashboard({ days: 7 }),
    deps: [],
  });
  const [workshop, setWorkshop] = useState('all');

  const handleWorkshopChange = (event: SelectChangeEvent) => {
    setWorkshop(event.target.value);
  };

  // 适配后端数据结构
  const data = useMemo(() => ({
    overall_oee: analyticsData?.avg_oee ?? 0,
    availability_avg: analyticsData?.avg_availability ?? 0,
    performance_avg: analyticsData?.avg_performance ?? 0,
    quality_avg: analyticsData?.avg_quality_rate ?? 0,
    by_equipment: (analyticsData?.by_equipment ?? []).map((item, i) => ({
      equipment_id: `eq-${i + 1}`,
      equipment_name: item.equipment_name,
      oee: item.oee,
      shift: i % 2 === 0 ? '白班' : '夜班',
    })),
    trend_24h: (analyticsData?.trend ?? []).map((item) => ({
      timestamp: item.date,
      oee: item.oee,
    })),
  }), [analyticsData]);

  const radarData = useMemo(
    () => [
      { metric: i18n.t('mes.mes_oee_dashboard_page.k2'), value: data.availability_avg },
      { metric: i18n.t('mes.mes_oee_dashboard_page.k3'), value: data.performance_avg },
      { metric: i18n.t('mes.mes_oee_dashboard_page.k4'), value: data.quality_avg },
    ],
    [data]
  );

  const statCards: StatCardConfig[] = useMemo(
    () => [
      {
        title: i18n.t('mes.mes_oee_dashboard_page.oee_9'),
        value: `${data.overall_oee.toFixed(1)}%`,
        icon: <Target size={24} />,
        color: 'secondary',
      },
      {
        title: i18n.t('mes.mes_oee_dashboard_page.k2'),
        value: `${data.availability_avg.toFixed(1)}%`,
        icon: <Activity size={24} />,
        color: 'success',
      },
      {
        title: i18n.t('mes.mes_oee_dashboard_page.k3'),
        value: `${data.performance_avg.toFixed(1)}%`,
        icon: <Gauge size={24} />,
        color: 'warning',
      },
      {
        title: i18n.t('mes.mes_oee_dashboard_page.k4'),
        value: `${data.quality_avg.toFixed(1)}%`,
        icon: <CheckCircle size={24} />,
        color: 'info',
      },
    ],
    [data]
  );

  return (
    <DashboardTemplate
      title={i18n.t('mes.analytics.oeeDashboard.k0')}
      statCards={statCards}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <FormControl
            size='small'
            sx={{ minWidth: 200 }}
          >
            <InputLabel id='workshop-label'>{i18n.t('mes.mes_oee_dashboard_page.k5')}</InputLabel>
            <Select
              labelId='workshop-label'
              id='workshop'
              value={workshop}
              label={i18n.t('mes.mes_oee_dashboard_page.k5')}
              onChange={handleWorkshopChange}
            >
              <MenuItem value='all'>{i18n.t('mes.mes_oee_dashboard_page.k6')}</MenuItem>
              <MenuItem value='w1'>{i18n.t('mes.mes_oee_dashboard_page.k7')}</MenuItem>
              <MenuItem value='w2'>{i18n.t('mes.mes_oee_dashboard_page.k8')}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              variant='outlined'
              sx={{ height: '100%' }}
            >
              <CardContent>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  {i18n.t('mes.mes_oee_dashboard_page.oee_9')}
                </Typography>
                <ResponsiveContainer
                  width='100%'
                  height={CHART_HEIGHT_SM}
                >
                  <RadialBarChart
                    innerRadius='60%'
                    outerRadius='100%'
                    data={[{ value: data.overall_oee }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      background
                      dataKey='value'
                      fill={designTokens.colors.secondary.dark}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <Typography
                  variant='h4'
                  sx={{ textAlign: 'center', fontWeight: 700, mt: 1 }}
                >
                  {data.overall_oee.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              variant='outlined'
              sx={{ height: '100%' }}
            >
              <CardContent>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  {i18n.t('mes.mes_oee_dashboard_page.k10')}
                </Typography>
                <ResponsiveContainer
                  width='100%'
                  height={CHART_HEIGHT_SM}
                >
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey='metric' />
                    <Radar
                      dataKey='value'
                      stroke={designTokens.colors.success.dark}
                      fill={designTokens.colors.success.dark}
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              variant='outlined'
              sx={{ height: '100%' }}
            >
              <CardContent>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  {i18n.t('mes.analytics.oeeDashboard.k1')}
                </Typography>
                <ResponsiveContainer
                  width='100%'
                  height={CHART_HEIGHT_SM}
                >
                  <LineChart data={data.trend_24h}>
                    <XAxis
                      dataKey='timestamp'
                      interval={3}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      dataKey='oee'
                      stroke={designTokens.colors.warning.main}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card variant='outlined'>
          <CardContent>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('mes.mes_oee_dashboard_page.oee_11')}
            </Typography>
            <ResponsiveContainer
              width='100%'
              height={CHART_HEIGHT_LG}
            >
              <ScatterChart>
                <CartesianGrid />
                <XAxis
                  dataKey='oee'
                  name='OEE'
                  domain={[0, 100]}
                  type='number'
                />
                <YAxis
                  dataKey='equipment_name'
                  name={i18n.t('mes.mes_oee_dashboard_page.k12')}
                  type='category'
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  data={data.by_equipment}
                  fill={designTokens.colors.secondary.dark}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>
    </DashboardTemplate>
  );
}
