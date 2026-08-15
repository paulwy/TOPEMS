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
import i18n from '@/i18n';
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
    addNotification({ title: i18n.t('mes.energy_management_page.k1'), message: i18n.t('mes.energy_management_page.k0'), type: 'success' });
  };
  const handleExport = async () => {
    try {
      await energyManagementApi.exportEnergyReport();
      addNotification({ title: i18n.t('mes.energy_management_page.k3'), message: i18n.t('mes.energy_management_page.k2'), type: 'success' });
    } catch {
      addNotification({ title: i18n.t('mes.energy_management_page.k5'), message: i18n.t('mes.energy_management_page.k4'), type: 'error' });
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
    <PageContainer title={i18n.t('mes.energy_management_page.k6')}>
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h4'
          sx={{ mb: 4 }}
        >
          {i18n.t('pages.energy_management_page.k0')}
        </Typography>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 4 }}
        >
          <Tab
            label={i18n.t('mes.energy_management_page.k7')}
            icon={<Activity size={20} />}
          />
          <Tab
            label={i18n.t('mes.energy_management_page.k8')}
            icon={<BarChart3 size={20} />}
          />
          <Tab
            label={i18n.t('mes.energy_management_page.k9')}
            icon={<BatteryCharging size={20} />}
          />
          <Tab
            label={i18n.t('mes.energy_management_page.k10')}
            icon={<AlertTriangle size={20} />}
          />
        </Tabs>
        {activeTab === 0 && (
          <Card>
            <CardHeader
              title={i18n.t('mes.energy_management_page.k11')}
              action={
                <Button
                  onClick={handleRefresh}
                  startIcon={<RefreshCw size={20} />}
                >
                  {i18n.t('pages.energy_management_page.k1')}
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
                              ? i18n.t('mes.energy_management_page.k12')
                              : item.status === 'warning'
                                ? i18n.t('mes.energy_management_page.k13')
                                : i18n.t('mes.energy_management_page.k14')
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
              title={i18n.t('mes.energy_management_page.k15')}
              action={
                <Button
                  onClick={handleExport}
                  startIcon={<Download size={20} />}
                >
                  {i18n.t('pages.energy_management_page.k2')}
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
                        {i18n.t('pages.energy_management_page.k3')}
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
                        {i18n.t('pages.energy_management_page.k4')}
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
                        {i18n.t('pages.energy_management_page.k5')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Card sx={{ mt: 3 }}>
                <CardHeader title={i18n.t('mes.energy_management_page.k16')} />
                <CardContent>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{i18n.t('mes.energy_management_page.k17')}</TableCell>
                        <TableCell>{i18n.t('mes.energy_management_page.k18')}</TableCell>
                        <TableCell>{i18n.t('mes.energy_management_page.kwh_19')}</TableCell>
                        <TableCell>{i18n.t('mes.energy_management_page.kwh_20')}</TableCell>
                        <TableCell>{i18n.t('mes.energy_management_page.k21')}</TableCell>
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
                <CardHeader title={i18n.t('mes.energy_management_page.k22')} />
                <CardContent>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{i18n.t('mes.energy_management_page.k23')}</TableCell>
                        <TableCell>{i18n.t('mes.energy_management_page.kwh_24')}</TableCell>
                        <TableCell>{i18n.t('mes.energy_management_page.k25')}</TableCell>
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
                <CardHeader title={i18n.t('mes.energy_management_page.k26')} />
                <CardContent>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{i18n.t('mes.energy_management_page.k27')}</TableCell>
                        <TableCell>{i18n.t('mes.energy_management_page.kwh_28')}</TableCell>
                        <TableCell>{i18n.t('mes.energy_management_page.k29')}</TableCell>
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
            <CardHeader title={i18n.t('mes.energy_management_page.k30')} />
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
                        {i18n.t('pages.energy_management_page.k6')}
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
                        {i18n.t('pages.energy_management_page.k7')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid sx={{ gridColumn: 'span 4' }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant='h6'>{i18n.t('mes.energy_management_page.k31')}</Typography>
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
                  [i18n.t('pages.energy_management_page.k8')]: {forecastData.forecast_period}
                </Typography>
                <Typography variant='subtitle1'>{i18n.t('pages.energy_management_page.k0')}</Typography>
                <Typography variant='subtitle1'>
                  [i18n.t('pages.energy_management_page.k9')]: {forecastData.seasonality_factor}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
        {activeTab === 3 && alertsData && (
          <Card>
            <CardHeader title={i18n.t('mes.energy_management_page.k32')} />
            <CardContent>
              <Grid sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Grid>
                  <Chip label={`${i18n.t('pages.energy_management_page.k0')}${alertsData.total_count}`} />
                </Grid>
                <Grid>
                  <Chip
                    label={`${i18n.t('pages.energy_management_page.k1')}${alertsData.critical_count}`}
                    color='error'
                  />
                </Grid>
                <Grid>
                  <Chip
                    label={`${i18n.t('pages.energy_management_page.k2')}${alertsData.warning_count}`}
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
                        label={alert.status === 'active' ? i18n.t('mes.energy_management_page.k34') : i18n.t('mes.energy_management_page.k33')}
                        size='small'
                      />
                    </span>
                  </Box>
                  <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
                    [i18n.t('pages.energy_management_page.k10')]: {alert.threshold_value} | {i18n.t('pages.energy_management_page.k11')}{alert.actualValue} | {alert.timestamp}
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