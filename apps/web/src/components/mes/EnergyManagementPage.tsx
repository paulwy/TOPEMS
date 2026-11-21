import React, { useMemo, useState } from 'react';
import { Alert, AlertTitle, Box, Chip, Typography } from '@mui/material';
import i18n from '@/i18n';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BatteryCharging,
  CheckCircle,
} from 'lucide-react';
import { energyManagementApi } from '@/api/mes/energyManagement';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  ChartConfig,
  DataTable,
  StatCard,
  TabItem,
} from '@/components/templates/StatsPageTemplate';

type TabValue = 'realtime' | 'report' | 'forecast' | 'alerts';

const EnergyManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('realtime');
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const realTimeConsumption = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.REALTIMECONSUMPTION_BASE,
    queryFn: () => energyManagementApi.getRealTimeConsumption(),
    refetchInterval: 10000,
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const energyReport = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ENERGYREPORT_BASE,
    queryFn: () => energyManagementApi.getEnergyReport(),
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const energyForecast = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ENERGYFORECAST_BASE,
    queryFn: () => energyManagementApi.getEnergyForecast({ months: 3 }),
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const energyAlerts = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ENERGYALERTS_BASE,
    queryFn: () => energyManagementApi.getEnergyAlerts(),
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.REALTIMECONSUMPTION_BASE,
      exact: false,
      refetchType: 'active',
    });
    addNotification({
      title: i18n.t('mes.energy_management_page.k1'),
      message: i18n.t('mes.energy_management_page.k0'),
      type: 'success',
    });
  };

  const handleExport = async () => {
    try {
      await energyManagementApi.exportEnergyReport();
      addNotification({
        title: i18n.t('mes.energy_management_page.k3'),
        message: i18n.t('mes.energy_management_page.k2'),
        type: 'success',
      });
    } catch {
      addNotification({
        title: i18n.t('mes.energy_management_page.k5'),
        message: i18n.t('mes.energy_management_page.k4'),
        type: 'error',
      });
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'normal':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'success';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle size={24} />;
      case 'warning':
        return <AlertCircle size={24} />;
      case 'critical':
        return <AlertTriangle size={24} />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
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

  const realTimeData = useMemo(
    () => realTimeConsumption.data?.data || [],
    [realTimeConsumption.data]
  );
  const reportData = energyReport.data?.data;
  const forecastData = energyForecast.data?.data;
  const alertsData = energyAlerts.data?.data;

  const loading = useMemo(() => {
    switch (activeTab) {
      case 'realtime':
        return realTimeConsumption.isPending;
      case 'report':
        return energyReport.isPending;
      case 'forecast':
        return energyForecast.isPending;
      case 'alerts':
        return energyAlerts.isPending;
      default:
        return false;
    }
  }, [
    activeTab,
    realTimeConsumption.isPending,
    energyReport.isPending,
    energyForecast.isPending,
    energyAlerts.isPending,
  ]);

  const tabs: TabItem[] = useMemo(
    () => [
      {
        value: 'realtime',
        label: i18n.t('mes.energy_management_page.k7'),
        icon: <Activity size={18} />,
      },
      {
        value: 'report',
        label: i18n.t('mes.energy_management_page.k8'),
        icon: <BarChart3 size={18} />,
      },
      {
        value: 'forecast',
        label: i18n.t('mes.energy_management_page.k9'),
        icon: <BatteryCharging size={18} />,
      },
      {
        value: 'alerts',
        label: i18n.t('mes.energy_management_page.k10'),
        icon: <AlertTriangle size={18} />,
      },
    ],
    []
  );

  const statCards = useMemo<StatCard[]>(() => {
    switch (activeTab) {
      case 'realtime':
        return realTimeData.map((item) => ({
          id: item.equipment_id,
          title: item.equipment_name,
          value: formatNumber(item.current_value),
          suffix: item.unit,
          color: getStatusColor(item.status),
          icon: getStatusIcon(item.status),
          description:
            item.status === 'normal'
              ? i18n.t('mes.energy_management_page.k12')
              : item.status === 'warning'
                ? i18n.t('mes.energy_management_page.k13')
                : i18n.t('mes.energy_management_page.k14'),
        }));

      case 'report':
        if (!reportData) return [];
        return [
          {
            id: 'total-consumption',
            title: i18n.t('pages.energy_management_page.k3'),
            value: formatNumber(reportData.total_consumption),
            suffix: 'kWh',
            color: 'warning',
            icon: <BatteryCharging size={18} />,
          },
          {
            id: 'total-cost',
            title: i18n.t('pages.energy_management_page.k4'),
            value: formatCurrency(reportData.total_cost),
            color: 'primary',
          },
          {
            id: 'avg-cost',
            title: i18n.t('pages.energy_management_page.k5'),
            value: formatCurrency(reportData.avg_cost_per_unit),
            color: 'secondary',
          },
        ];

      case 'forecast':
        if (!forecastData) return [];
        return [
          {
            id: 'forecast-consumption',
            title: i18n.t('pages.energy_management_page.k6'),
            value: formatNumber(forecastData.forecast_consumption),
            suffix: 'kWh',
            color: 'warning',
            icon: <BatteryCharging size={18} />,
          },
          {
            id: 'forecast-cost',
            title: i18n.t('pages.energy_management_page.k7'),
            value: formatCurrency(forecastData.forecast_cost),
            color: 'primary',
          },
          {
            id: 'confidence-interval',
            title: i18n.t('mes.energy_management_page.k31'),
            value: `${formatNumber(forecastData.confidence_interval[0])} - ${formatNumber(forecastData.confidence_interval[1])}`,
            suffix: 'kWh',
            color: 'info',
          },
        ];

      case 'alerts':
        if (!alertsData) return [];
        return [
          {
            id: 'total-alerts',
            title: i18n.t('pages.energy_management_page.k0'),
            value: alertsData.total_count,
            color: 'primary',
            icon: <Activity size={18} />,
          },
          {
            id: 'critical-alerts',
            title: i18n.t('pages.energy_management_page.k1'),
            value: alertsData.critical_count,
            color: 'error',
            icon: <AlertTriangle size={18} />,
          },
          {
            id: 'warning-alerts',
            title: i18n.t('pages.energy_management_page.k2'),
            value: alertsData.warning_count,
            color: 'warning',
            icon: <AlertCircle size={18} />,
          },
        ];

      default:
        return [];
    }
  }, [activeTab, realTimeData, reportData, forecastData, alertsData]);

  const charts = useMemo<ChartConfig[]>(() => {
    if (activeTab === 'report' && reportData) {
      return [
        {
          id: 'workshop-distribution',
          title: i18n.t('mes.energy_management_page.k22'),
          type: 'pie',
          dataKey: 'value',
          nameKey: 'name',
          data: reportData.by_workshop.map((item) => ({
            name: item.workshop_name,
            value: item.total_consumption,
          })),
        },
        {
          id: 'trend-bar',
          title: i18n.t('mes.energy_management_page.k26'),
          type: 'bar',
          dataKey: 'value',
          nameKey: 'name',
          data: reportData.trend_data.map((item) => ({
            name: item.period,
            value: item.consumption,
          })),
        },
      ];
    }

    if (activeTab === 'forecast' && forecastData) {
      return [
        {
          id: 'forecast-bar',
          title: i18n.t('mes.energy_management_page.k30'),
          type: 'bar',
          dataKey: 'value',
          nameKey: 'name',
          data: [
            {
              name: i18n.t('pages.energy_management_page.k6'),
              value: forecastData.forecast_consumption,
            },
          ],
        },
      ];
    }

    return [];
  }, [activeTab, reportData, forecastData]);

  const tables = useMemo<DataTable[]>(() => {
    if (activeTab === 'report' && reportData) {
      return [
        {
          id: 'by-equipment',
          title: i18n.t('mes.energy_management_page.k16'),
          columns: [
            {
              id: 'equipment_code',
              label: i18n.t('mes.energy_management_page.k17'),
              field: 'equipment_code',
            },
            {
              id: 'equipment_name',
              label: i18n.t('mes.energy_management_page.k18'),
              field: 'equipment_name',
            },
            {
              id: 'total_consumption',
              label: i18n.t('mes.energy_management_page.kwh_19'),
              field: 'total_consumption',
              align: 'right',
            },
            {
              id: 'avg_consumption',
              label: i18n.t('mes.energy_management_page.kwh_20'),
              field: 'avg_consumption',
              align: 'right',
            },
            {
              id: 'percentage',
              label: i18n.t('mes.energy_management_page.k21'),
              field: 'percentage',
              align: 'center',
              render: (value) => (
                <Chip
                  label={`${value}%`}
                  size='small'
                />
              ),
            },
          ],
          data: reportData.by_equipment.map((item) => ({
            equipment_code: item.equipment_code,
            equipment_name: item.equipment_name,
            total_consumption: formatNumber(item.total_consumption),
            avg_consumption: formatNumber(item.avg_consumption),
            percentage: item.percentage,
          })),
        },
        {
          id: 'by-workshop',
          title: i18n.t('mes.energy_management_page.k22'),
          columns: [
            {
              id: 'workshop_name',
              label: i18n.t('mes.energy_management_page.k23'),
              field: 'workshop_name',
            },
            {
              id: 'total_consumption',
              label: i18n.t('mes.energy_management_page.kwh_24'),
              field: 'total_consumption',
              align: 'right',
            },
            {
              id: 'percentage',
              label: i18n.t('mes.energy_management_page.k25'),
              field: 'percentage',
              align: 'center',
              render: (value) => (
                <Chip
                  label={`${value}%`}
                  size='small'
                />
              ),
            },
          ],
          data: reportData.by_workshop.map((item) => ({
            workshop_name: item.workshop_name,
            total_consumption: formatNumber(item.total_consumption),
            percentage: item.percentage,
          })),
        },
        {
          id: 'trend-data',
          title: i18n.t('mes.energy_management_page.k26'),
          columns: [
            {
              id: 'period',
              label: i18n.t('mes.energy_management_page.k27'),
              field: 'period',
            },
            {
              id: 'consumption',
              label: i18n.t('mes.energy_management_page.kwh_28'),
              field: 'consumption',
              align: 'right',
            },
            {
              id: 'change_rate',
              label: i18n.t('mes.energy_management_page.k29'),
              field: 'change_rate',
              align: 'center',
              render: (value) => {
                const rate = Number(value);
                return (
                  <Chip
                    label={`${rate > 0 ? '+' : ''}${rate.toFixed(2)}%`}
                    size='small'
                    color={rate > 0 ? 'error' : rate < 0 ? 'success' : 'default'}
                  />
                );
              },
            },
          ],
          data: reportData.trend_data.map((item) => ({
            period: item.period,
            consumption: formatNumber(item.consumption),
            change_rate: item.change_rate,
          })),
        },
      ];
    }

    return [];
  }, [activeTab, reportData]);

  const customContent = useMemo(() => {
    if (activeTab === 'forecast' && forecastData) {
      return (
        <Box sx={{ mt: 3 }}>
          <Typography variant='subtitle1'>
            {i18n.t('pages.energy_management_page.k8')}: {forecastData.forecast_period}
          </Typography>
          <Typography variant='subtitle1'>{i18n.t('pages.energy_management_page.k0')}</Typography>
          <Typography variant='subtitle1'>
            {i18n.t('pages.energy_management_page.k9')}: {forecastData.seasonality_factor}
          </Typography>
        </Box>
      );
    }

    if (activeTab === 'alerts' && alertsData) {
      return alertsData.alerts.map((alert) => (
        <Alert
          key={alert.id}
          severity={getSeverityColor(alert.severity)}
          sx={{ mb: 2 }}
        >
          <AlertTitle>{alert.equipment_name}</AlertTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span>{alert.message}</span>
            <span>
              <Chip
                label={
                  alert.status === 'active'
                    ? i18n.t('mes.energy_management_page.k34')
                    : i18n.t('mes.energy_management_page.k33')
                }
                size='small'
              />
            </span>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant='body2'>
              {i18n.t('pages.energy_management_page.k10')}: {alert.threshold_value} |{' '}
              {i18n.t('pages.energy_management_page.k11')}
              {alert.actualValue} | {alert.timestamp}
            </Typography>
          </Box>
        </Alert>
      ));
    }

    return null;
  }, [activeTab, forecastData, alertsData]);

  return (
    <StatsPageTemplate
      title={i18n.t('mes.energy_management_page.k6')}
      subtitle={i18n.t('pages.energy_management_page.k0')}
      tabs={tabs}
      tabValue={activeTab}
      onTabChange={(value) => setActiveTab(value as TabValue)}
      statCards={statCards}
      statColumns={3}
      charts={charts}
      tables={tables}
      loading={loading}
      onRefresh={handleRefresh}
      onExport={activeTab === 'report' ? handleExport : undefined}
      exportText={i18n.t('pages.energy_management_page.k2')}
      showSearch={false}
      showTimeRange={false}
    >
      {customContent}
    </StatsPageTemplate>
  );
};

export default EnergyManagementPage;
