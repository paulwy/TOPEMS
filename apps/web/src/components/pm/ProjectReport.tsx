import React from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@mui/material';
import {
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
import type { PmStatistics, ProjectBenefit } from '@/api/pm';

interface ProjectReportProps {
  stats: PmStatistics;
  benefits: ProjectBenefit[];
}

const ProjectReport: React.FC<ProjectReportProps> = ({ stats, benefits }) => {
  const projectStatusData = [
    { name: '草稿', value: stats.draft_projects, fill: 'grey.500' },
    { name: '待审批', value: stats.pending_projects, fill: 'warning.main' },
    { name: '进行中', value: stats.active_projects, fill: 'primary.main' },
    { name: '已完成', value: stats.completed_projects, fill: 'success.main' },
    { name: '已取消', value: stats.cancelled_projects, fill: 'error.main' },
  ].filter((d) => d.value > 0);

  const riskData = [
    { name: '高风险', value: stats.high_risk_projects, fill: 'error.main' },
    { name: '中风险', value: stats.medium_risk_projects, fill: 'warning.main' },
    { name: '低风险', value: stats.low_risk_projects, fill: 'success.main' },
  ].filter((d) => d.value > 0);

  const trendData = benefits.slice(0, 6).map((b, index) => ({
    month: `第${index + 1}期`,
    cpi: b.cpi,
    spi: b.spi,
  }));

  const budgetUtilization =
    stats.total_budget > 0 ? (stats.spent_budget / stats.total_budget) * 100 : 0;

  const handleExport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      benefits: benefits,
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
            项目报表
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mt: 1 }}
          >
            生成时间: {new Date().toLocaleString('zh-CN')}
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
          导出报表
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
                  项目总数
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
                  已完成
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
                  预算使用
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
                  高风险
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
            <Typography variant='h6'>项目状态分布</Typography>
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
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
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
                  <Tooltip formatter={(value) => [`${value} 个`, '数量']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Typography variant='h6'>风险分布</Typography>
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
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
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
                  <Tooltip formatter={(value: unknown) => [`${value} 个项目`, '数量']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardHeader>
          <Typography variant='h6'>CPI/SPI 趋势分析</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <LineChart
                data={trendData.length > 0 ? trendData : [{ month: '暂无数据', cpi: 1, spi: 1 }]}
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
          <Typography variant='h6'>预算执行情况</Typography>
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
              预算利用率
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
                总预算
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
                已使用
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
                剩余
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
          <Typography variant='h6'>项目进度统计</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <BarChart
                data={[
                  { name: '准时', value: stats.on_time_projects },
                  { name: '延迟', value: stats.delayed_projects },
                ].filter((d) => d.value > 0)}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey='value'
                  name='项目数'
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
          <Typography variant='h6'>效益指标汇总</Typography>
        </CardHeader>
        <CardContent>
          {benefits.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium', color: 'grey.600' }}>期间</TableCell>
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
                      <TableCell sx={{ color: 'grey.900' }}>第{index + 1}期</TableCell>
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
              <Typography>暂无效益数据</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProjectReport;
