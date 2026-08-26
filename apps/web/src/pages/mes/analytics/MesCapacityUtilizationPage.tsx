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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import i18n from '@/i18n';
import type { CapacityUtilizationData } from '@/api/mes/types';
import { designTokens } from '@topems/tokens';
import { DashboardTemplate, type DataTableConfig } from '@/components/templates/DashboardTemplate';

const SCHEDULE_COLORS = [
  designTokens.colors.success.dark,
  designTokens.colors.warning.main,
  designTokens.colors.error.main,
  designTokens.colors.secondary.dark,
];

const HEATMAP_HEIGHT = 320;
const CHART_HEIGHT = 260;

function useCapacityMock(): CapacityUtilizationData {
  return useMemo(() => {
    const equipments = [
      'CNC-01',
      'CNC-02',
      i18n.t('mes.mes_capacity_utilization_page.01_3'),
      i18n.t('mes.mes_capacity_utilization_page.01_2'),
      i18n.t('mes.mes_capacity_utilization_page.01_1'),
      i18n.t('mes.mes_capacity_utilization_page.01_0'),
    ];
    const shifts = [
      i18n.t('mes.mes_capacity_utilization_page.k6'),
      i18n.t('mes.mes_capacity_utilization_page.k5'),
      i18n.t('mes.mes_capacity_utilization_page.k4'),
    ];
    const days = [
      i18n.t('mes.mes_capacity_utilization_page.k11'),
      i18n.t('mes.mes_capacity_utilization_page.k10'),
      i18n.t('mes.mes_capacity_utilization_page.k9'),
      i18n.t('mes.mes_capacity_utilization_page.k8'),
      i18n.t('mes.mes_capacity_utilization_page.k7'),
    ];
    const heatmap: CapacityUtilizationData['heatmap'] = [];
    equipments.forEach((eq, ei) => {
      days.forEach((d, di) => {
        shifts.forEach((s, si) => {
          heatmap.push({
            equipment: eq,
            date: d,
            shift: s,
            utilization: Math.round(
              55 + Math.sin(ei * 0.7 + di * 0.4 + si) * 25 + ((ei + di + si) % 4) * 5
            ),
          });
        });
      });
    });
    const stages = [
      i18n.t('mes.mes_capacity_utilization_page.k16'),
      i18n.t('mes.mes_capacity_utilization_page.k15'),
      i18n.t('mes.mes_capacity_utilization_page.k14'),
      i18n.t('mes.mes_capacity_utilization_page.k13'),
      i18n.t('mes.mes_capacity_utilization_page.k12'),
    ];
    let running = 100;
    const waterfall = stages.map((stage, i) => {
      const delta = i === 0 ? 100 : -(i * 7 + (i % 2) * 4);
      running += delta > 0 ? 0 : delta;
      return {
        stage,
        value: i === 0 ? 100 : delta,
        end: i === 0 ? 100 : running,
      };
    });
    return {
      heatmap,
      waterfall,
      bottleneck_top10: equipments
        .map((eq, i) => ({
          equipment: eq,
          utilization: Math.round(85 + Math.cos(i) * 10),
        }))
        .sort((a, b) => a.utilization - b.utilization),
    };
  }, []);
}

const SCHEDULE_PIE = [
  { name: i18n.t('mes.mes_capacity_utilization_page.k17'), value: 42 },
  { name: i18n.t('mes.mes_capacity_utilization_page.k18'), value: 38 },
  { name: i18n.t('mes.mes_capacity_utilization_page.k19'), value: 14 },
  { name: i18n.t('mes.mes_capacity_utilization_page.k20'), value: 6 },
];

export default function MesCapacityUtilizationPage() {
  const data = useCapacityMock();
  const [workCenter, setWorkCenter] = useState('all');

  const handleWorkCenterChange = (event: SelectChangeEvent) => {
    setWorkCenter(event.target.value);
  };

  const tableConfig: DataTableConfig = useMemo(
    () => ({
      title: i18n.t('mes.mes_capacity_utilization_page.top10_30'),
      columns: [
        { id: 'equipment', label: i18n.t('mes.mes_capacity_utilization_page.k31') },
        { id: 'utilization', label: i18n.t('mes.mes_capacity_utilization_page.k32') },
        {
          id: 'status',
          label: i18n.t('mes.mes_capacity_utilization_page.k33'),
          render: (value: unknown) => {
            const utilization = Number(value);
            const isBottleneck = utilization < 80;
            return (
              <Box
                component='span'
                sx={{
                  display: 'inline-block',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                  bgcolor: isBottleneck
                    ? designTokens.colors.error[100]
                    : designTokens.colors.success[100],
                  color: isBottleneck
                    ? designTokens.colors.error[700]
                    : designTokens.colors.success[700],
                }}
              >
                {isBottleneck
                  ? i18n.t('mes.mes_capacity_utilization_page.k35')
                  : i18n.t('mes.mes_capacity_utilization_page.k34')}
              </Box>
            );
          },
        },
      ],
      data: data.bottleneck_top10.map((item) => ({
        equipment: item.equipment,
        utilization: `${item.utilization}%`,
        status: item.utilization,
      })),
    }),
    [data]
  );

  return (
    <DashboardTemplate
      title={i18n.t('mes.mes_capacity_utilization_page.k21')}
      table={tableConfig}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <FormControl
            size='small'
            sx={{ minWidth: 200 }}
          >
            <InputLabel id='work-center-label'>
              {i18n.t('mes.mes_capacity_utilization_page.k22')}
            </InputLabel>
            <Select
              labelId='work-center-label'
              id='work-center'
              value={workCenter}
              label={i18n.t('mes.mes_capacity_utilization_page.k22')}
              onChange={handleWorkCenterChange}
            >
              <MenuItem value='all'>{i18n.t('mes.mes_capacity_utilization_page.k23')}</MenuItem>
              <MenuItem value='wc1'>WC-A</MenuItem>
              <MenuItem value='wc2'>WC-B</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Card variant='outlined'>
          <CardContent>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('mes.analytics.capacityUtilization.k0')}
            </Typography>
            <ResponsiveContainer
              width='100%'
              height={HEATMAP_HEIGHT}
            >
              <ScatterChart>
                <CartesianGrid />
                <XAxis
                  dataKey='equipment'
                  name={i18n.t('mes.mes_capacity_utilization_page.k24')}
                  type='category'
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  dataKey='shift'
                  name={i18n.t('mes.mes_capacity_utilization_page.k25')}
                  type='category'
                  tick={{ fontSize: 11 }}
                />
                <ZAxis
                  dataKey='utilization'
                  range={[50, 400]}
                  name={i18n.t('mes.mes_capacity_utilization_page.k26')}
                  unit='%'
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  data={data.heatmap}
                  fill={designTokens.colors.secondary.dark}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              variant='outlined'
              sx={{ height: '100%' }}
            >
              <CardContent>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  {i18n.t('mes.mes_capacity_utilization_page.k27')}
                </Typography>
                <ResponsiveContainer
                  width='100%'
                  height={CHART_HEIGHT}
                >
                  <BarChart data={data.waterfall}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                      dataKey='stage'
                      tick={{ fontSize: 10 }}
                      angle={-15}
                      textAnchor='end'
                      height={60}
                    />
                    <YAxis unit='%' />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey='value'
                      name={i18n.t('mes.mes_capacity_utilization_page.k28')}
                      fill={designTokens.colors.warning.main}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              variant='outlined'
              sx={{ height: '100%' }}
            >
              <CardContent>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  {i18n.t('mes.mes_capacity_utilization_page.k29')}
                </Typography>
                <ResponsiveContainer
                  width='100%'
                  height={CHART_HEIGHT}
                >
                  <PieChart>
                    <Pie
                      data={SCHEDULE_PIE}
                      dataKey='value'
                      nameKey='name'
                      innerRadius={50}
                      outerRadius={90}
                      label
                    >
                      {SCHEDULE_PIE.map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={SCHEDULE_COLORS[idx % SCHEDULE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardTemplate>
  );
}
