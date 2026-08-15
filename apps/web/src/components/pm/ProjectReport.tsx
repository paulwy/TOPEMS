import React from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Badge,
  LinearProgress,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { PmStatistics, ProjectBenefit } from '@/api/pm';

interface ProjectReportProps {
  stats: PmStatistics;
  benefits: ProjectBenefit[];
}

const ProjectReport: React.FC<ProjectReportProps> = ({ stats, benefits }) => {
  const projectStatusData = [
    { name: i18n.t('components.project_report.k0'), value: stats.draft_projects, fill: 'grey.500' },
    { name: i18n.t('components.project_report.k1'), value: stats.pending_projects, fill: 'warning.main' },
    { name: i18n.t('components.project_report.k2'), value: stats.active_projects, fill: 'primary.main' },
    { name: i18n.t('components.project_report.k3'), value: stats.completed_projects, fill: 'success.main' },
    { name: i18n.t('components.project_report.k4'), value: stats.cancelled_projects, fill: 'error.main' },
  ].filter((d) => (d.value ?? 0) > 0);

  const riskData = [
    { name: i18n.t('components.project_report.k5'), value: stats.high_risk_projects ?? 0, fill: 'error.main' },
    { name: i18n.t('components.project_report.k6'), value: stats.medium_risk_projects ?? 0, fill: 'warning.main' },
    { name: i18n.t('components.project_report.k7'), value: stats.low_risk_projects ?? 0, fill: 'success.main' },
  ].filter((d) => (d.value ?? 0) > 0);

  const trendData = benefits.slice(0, 6).map((b, index) => ({
    month: `${i18n.t('components.project_report.k0')}${index + 1}${i18n.t('components.project_report.k1')}`,
    cpi: b.cpi,
    spi: b.spi,
  }));

  const budgetUtilization =
    stats.total_budget > 0 ? (stats.spent_budget / stats.total_budget) * 100 : 0;

  const handleExport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      benefits,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 'bold', color: 'grey.900' }}
          >
            {i18n.t('components.project_report.k2')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mt: 1 }}
          >
            [i18n.t('components.project_report.k3')]: {new Date().toLocaleString('zh-CN')}
          </Typography>
        </Box>
        <Button
          onClick={handleExport}
          startIcon={
            <Box
              component={Download}
              sx={{ width: 16, height: 16 }}
            />
          }
        >
          {i18n.t('components.project_report.k4')}
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'blue.100' }}>
                <Box
                  component={Calendar}
                  sx={{ width: 20, height: 20, color: 'blue.600' }}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('components.project_report.k5')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold', color: 'grey.900' }}
                >
                  {stats.total_projects}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'green.100' }}>
                <Box
                  component={CheckCircle}
                  sx={{ width: 20, height: 20, color: 'green.600' }}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('components.project_report.k6')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold', color: 'green.600' }}
                >
                  {stats.completed_projects}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'orange.100' }}>
                <Box
                  component={DollarSign}
                  sx={{ width: 20, height: 20, color: 'orange.600' }}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('components.project_report.k7')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold', color: 'orange.600' }}
                >
                  {stats.budget_usage_rate}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'red.100' }}>
                <Box
                  component={AlertTriangle}
                  sx={{ width: 20, height: 20, color: 'red.600' }}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('components.project_report.k8')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold', color: 'red.600' }}
                >
                  {stats.high_risk_projects}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 3,
        }}
      >
        <Card>
          <CardHeader>
            <Typography variant='h6'>{i18n.t('components.project_report.k8')}</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ height: 256 }}>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    dataKey='value'
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} ${i18n.t('components.project_report.k9')}`, i18n.t('components.project_report.k9')]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Typography variant='h6'>{i18n.t('components.project_report.k10')}</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ height: 256 }}>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <PieChart>
                  <Pie
                    data={riskData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={60}
                    dataKey='value'
                  >
                    {riskData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => [`${value} ${i18n.t('components.project_report.k10')}`, i18n.t('components.project_report.k11')]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardHeader>
          <Typography variant='h6'>{i18n.t('components.project_report.pipi_0')}</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <LineChart
                data={trendData.length > 0 ? trendData : [{ month: i18n.t('components.project_report.k12'), cpi: 1, spi: 1 }]}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis domain={[0.5, 1.5]} />
                <Tooltip />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='cpi'
                  name='CPI'
                  stroke='primary.main'
                  strokeWidth={2}
                />
                <Line
                  type='monotone'
                  dataKey='spi'
                  name='SPI'
                  stroke='success.main'
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Typography variant='h6'>{i18n.t('components.project_report.k13')}</Typography>
        </CardHeader>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant='body2'
              sx={{ color: 'grey.600' }}
            >
              {i18n.t('components.project_report.k11')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium', color: 'grey.900' }}
            >
              {budgetUtilization.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={budgetUtilization}
            sx={{ height: 16 }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
              mt: 1,
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'blue.50',
                borderRadius: 1,
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'blue.600' }}
              >
                {i18n.t('components.project_report.k12')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', color: 'blue.800' }}
              >
                {stats.total_budget.toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'green.50',
                borderRadius: 1,
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'green.600' }}
              >
                {i18n.t('components.project_report.k13')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', color: 'green.800' }}
              >
                {stats.spent_budget.toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {i18n.t('components.project_report.k14')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', color: 'grey.800' }}
              >
                {(stats.total_budget - stats.spent_budget).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Typography variant='h6'>{i18n.t('components.project_report.k14')}</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <BarChart
                data={[
                  { name: i18n.t('components.project_report.k15'), value: stats.on_time_projects ?? 0 },
                  { name: i18n.t('components.project_report.k16'), value: stats.delayed_projects ?? 0 },
                ].filter((d) => (d.value ?? 0) > 0)}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey='value'
                  name={i18n.t('components.project_report.k17')}
                >
                  <Cell fill='success.main' />
                  <Cell fill='error.main' />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Typography variant='h6'>{i18n.t('components.project_report.k18')}</Typography>
        </CardHeader>
        <CardContent>
          {benefits.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium', color: 'grey.600' }}>{i18n.t('components.project_report.k19')}</TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      CPI
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      SPI
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      CV
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      SV
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      ROI
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {benefits.map((benefit, index) => (
                    <TableRow
                      key={benefit.id}
                      hover
                    >
                      <TableCell sx={{ color: 'grey.900' }}>{i18n.t('components.project_report.index1_1')}</TableCell>
                      <TableCell align='right'>
                        <Badge
                          sx={{
                            bgcolor: benefit.cpi >= 1 ? 'green.100' : 'red.100',
                            color: benefit.cpi >= 1 ? 'green.800' : 'red.800',
                          }}
                        >
                          {benefit.cpi.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell align='right'>
                        <Badge
                          sx={{
                            bgcolor: benefit.spi >= 1 ? 'green.100' : 'red.100',
                            color: benefit.spi >= 1 ? 'green.800' : 'red.800',
                          }}
                        >
                          {benefit.spi.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ color: 'grey.600' }}
                      >
                        {benefit.cv.toLocaleString()}
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ color: 'grey.600' }}
                      >
                        {benefit.sv.toLocaleString()}
                      </TableCell>
                      <TableCell align='right'>
                        <Typography
                          component='span'
                          sx={{
                            color: benefit.roi >= 0 ? 'green.600' : 'red.600',
                          }}
                        >
                          {(benefit.roi * 100).toFixed(2)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'grey.500' }}>
              <Box
                component={TrendingUp}
                sx={{
                  width: 48,
                  height: 48,
                  mx: 'auto',
                  mb: 2,
                  color: 'grey.300',
                }}
              />
              <Typography>{i18n.t('components.project_report.k20')}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProjectReport;
