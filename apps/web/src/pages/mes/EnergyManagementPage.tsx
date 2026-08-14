import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Typography,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  BatteryCharging,
  Activity,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
} from 'lucide-react';
import { energyManagementApi } from '../../api/mes/energyManagement';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import { PageContainer } from '@/components/common';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens, semanticTokens } from '@topems/tokens';

const EnergyManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const realTimeConsumption = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.REALTIMECONSUMPTION_BASE,
    queryFn: () => energyManagementApi.getRealTimeConsumption(),
    refetchInterval: 10000,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const energyReport = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ENERGYREPORT_BASE,
    queryFn: () => energyManagementApi.getEnergyReport(),
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const energyForecast = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ENERGYFORECAST_BASE,
    queryFn: () => energyManagementApi.getEnergyForecast({ months: 3 }),
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const energyAlerts = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ENERGYALERTS_BASE,
    queryFn: () => energyManagementApi.getEnergyAlerts(),
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.REALTIMECONSUMPTION_BASE ,
  exact: false,
  refetchType: 'active',
});
    addNotification({ title: '成功', message: '数据已刷新', type: 'success' });
  };

  const handleExport = async () => {
    try {
      await energyManagementApi.exportEnergyReport();
      addNotification({ title: '成功', message: '报告导出成功', type: 'success' });
    } catch {
      addNotification({ title: '错误', message: '报告导出失败', type: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return (
          <CheckCircle
            style={{ color: 'success.500' }}
            size={24}
          />
        );
      case 'warning':
        return (
          <AlertCircle
            style={{ color: 'warning.500' }}
            size={24}
          />
        );
      case 'critical':
        return (
          <AlertTriangle
            style={{ color: 'error.500' }}
            size={24}
          />
        );
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'success';
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2 }).format(value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const realTimeData = realTimeConsumption.data?.data || [];
  const reportData = energyReport.data?.data;
  const forecastData = energyForecast.data?.data;
  const alertsData = energyAlerts.data?.data;

  return (
    <PageContainer title='能源管理'>
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h4'
          sx={{ mb: 4 }}
        >
          能耗管理
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 4 }}
        >
          <Tab
            label='实时监控'
            icon={<Activity size={20} />}
          />
          <Tab
            label='能耗报表'
            icon={<BarChart3 size={20} />}
          />
          <Tab
            label='能耗预测'
            icon={<BatteryCharging size={20} />}
          />
          <Tab
            label='告警管理'
            icon={<AlertTriangle size={20} />}
          />
        </Tabs>

        {activeTab === 0 && (
          <Card>
            <CardHeader
              title='实时能耗监控'
              action={
                <Button
                  onClick={handleRefresh}
                  startIcon={<RefreshCw size={20} />}
                >
                  刷新
                </Button>
              }
            />
            <CardContent>
              <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
                {realTimeData.map((item) => (
                  <Grid
                    sx={{ gridColumn: 'span 4' }}
                    key={item.equipment_id}
                  >
                    <Card
                      sx={{
                        borderLeft: `4px solid ${item.status === 'normal' ? 'colors.success.main' : item.status === 'warning' ? designTokens.colors.warning.main : designTokens.colors.error.main}`,
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant='subtitle1'
                            sx={{ fontWeight: 'bold' }}
                          >
                            {item.equipment_name}
                          </Typography>
                          {getStatusIcon(item.status)}
                        </Box>
                        <Typography
                          variant='h3'
                          sx={{ mb: 1 }}
                        >
                          {formatNumber(item.current_value)}
                          <Typography
                            variant='body1'
                            component='span'
                            sx={{ ml: 1, color: 'text.secondary' }}
                          >
                            {item.unit}
                          </Typography>
                        </Typography>
                        <Chip
                          label={
                            item.status === 'normal'
                              ? '正常'
                              : item.status === 'warning'
                                ? '警告'
                                : '异常'
                          }
                          color={getStatusColor(item.status)}
                          size='small'
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {activeTab === 1 && reportData && (
          <Card>
            <CardHeader
              title='能耗报表'
              action={
                <Button
                  onClick={handleExport}
                  startIcon={<Download size={20} />}
                >
                  导出报表
                </Button>
              }
            />
            <CardContent>
              <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, mb: 4 }}>
                <Grid sx={{ gridColumn: 'span 4' }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <BatteryCharging
                        style={{ fontSize: 40, color: 'warning.500', marginBottom: 8 }}
                      />
                      <Typography variant='h5'>
                        {formatNumber(reportData.total_consumption)} kWh
                      </Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        总能耗
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid sx={{ gridColumn: 'span 4' }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant='h5'>{formatCurrency(reportData.total_cost)}</Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        能耗费用
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid sx={{ gridColumn: 'span 4' }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant='h5'>
                        {formatCurrency(reportData.avg_cost_per_unit)}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        单位电价
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Card sx={{ mt: 3 }}>
                <CardHeader title='设备能耗排行' />
                <CardContent>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>设备编码</TableCell>
                        <TableCell>设备名称</TableCell>
                        <TableCell>总能耗 (kWh)</TableCell>
                        <TableCell>日均能耗 (kWh)</TableCell>
                        <TableCell>占比</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.by_equipment.map((item) => (
                        <TableRow key={item.equipment_id}>
                          <TableCell>{item.equipment_code}</TableCell>
                          <TableCell>{item.equipment_name}</TableCell>
                          <TableCell>{formatNumber(item.total_consumption)}</TableCell>
                          <TableCell>{formatNumber(item.avg_consumption)}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${item.percentage}%`}
                              size='small'
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardHeader title='车间能耗分布' />
                <CardContent>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>车间名称</TableCell>
                        <TableCell>总能耗 (kWh)</TableCell>
                        <TableCell>占比</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.by_workshop.map((item) => (
                        <TableRow key={item.workshop_id}>
                          <TableCell>{item.workshop_name}</TableCell>
                          <TableCell>{formatNumber(item.total_consumption)}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${item.percentage}%`}
                              size='small'
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card sx={{ mt: 3 }}>
                <CardHeader title='能耗趋势' />
                <CardContent>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>周期</TableCell>
                        <TableCell>能耗 (kWh)</TableCell>
                        <TableCell>变化率</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.trend_data.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.period}</TableCell>
                          <TableCell>{formatNumber(item.consumption)}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${item.change_rate > 0 ? '+' : ''}${item.change_rate.toFixed(2)}%`}
                              size='small'
                              color={
                                item.change_rate > 0
                                  ? 'error'
                                  : item.change_rate < 0
                                    ? 'success'
                                    : 'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && forecastData && (
          <Card>
            <CardHeader title='能耗预测' />
            <CardContent>
              <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
                <Grid sx={{ gridColumn: 'span 4' }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <BatteryCharging
                        style={{ fontSize: 40, color: 'secondary.500', marginBottom: 8 }}
                      />
                      <Typography variant='h5'>
                        {formatNumber(forecastData.forecast_consumption)} kWh
                      </Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        预测能耗
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid sx={{ gridColumn: 'span 4' }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant='h5'>
                        {formatCurrency(forecastData.forecast_cost)}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        预测费用
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid sx={{ gridColumn: 'span 4' }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant='h6'>置信区间</Typography>
                      <Typography variant='h5'>
                        {formatNumber(forecastData.confidence_interval[0])} -{' '}
                        {formatNumber(forecastData.confidence_interval[1])} kWh
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4 }}>
                <Typography variant='subtitle1'>
                  预测周期: {forecastData.forecast_period}
                </Typography>
                <Typography variant='subtitle1'>趋势因子: {forecastData.trend_factor}</Typography>
                <Typography variant='subtitle1'>
                  季节性因子: {forecastData.seasonality_factor}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {activeTab === 3 && alertsData && (
          <Card>
            <CardHeader title='能耗告警' />
            <CardContent>
              <Grid sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Grid>
                  <Chip label={`总计: ${alertsData.total_count}`} />
                </Grid>
                <Grid>
                  <Chip
                    label={`严重: ${alertsData.critical_count}`}
                    color='error'
                  />
                </Grid>
                <Grid>
                  <Chip
                    label={`警告: ${alertsData.warning_count}`}
                    color='warning'
                  />
                </Grid>
              </Grid>

              {alertsData.alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  severity={getSeverityColor(alert.severity)}
                  sx={{ mb: 2 }}
                >
                  <AlertTitle>{alert.equipment_name}</AlertTitle>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{alert.message}</span>
                    <span>
                      <Chip
                        label={alert.status === 'active' ? '活跃' : '已解决'}
                        size='small'
                      />
                    </span>
                  </Box>
                  <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
                    阈值: {alert.threshold_value} | 当前值: {alert.actualValue} | {alert.timestamp}
                  </Box>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}
      </Box>
    </PageContainer>
  );
};

export default EnergyManagementPage;
