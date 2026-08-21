import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import {
  Activity,
  CircleDot,
  FolderKanban,
  Building,
  Link,
  Users,
  Factory,
  ClipboardList,
  Truck,
  ShoppingCart,
  Warehouse,
  Map,
  BarChart2,
  Smartphone,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';
import i18n from '@/i18n';
import { ServiceStatusCard } from './ServiceStatusCard';
import { designTokens, semanticTokens } from '@topems/tokens';

interface ServiceStatusMonitorProps {
  serviceStatuses?: Record<string, boolean>;
  onRefresh?: () => void;
}

const groupColors: Record<
  string,
  {
    bg: string;
    border: string;
    titleColor: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  core: {
    bg: 'primary.light',
    border: 'primary.light',
    titleColor: 'primary.dark',
    iconBg: 'primary.100',
    iconColor: 'primary.dark',
  },
  business: {
    bg: 'success.light',
    border: 'success.light',
    titleColor: 'success.700',
    iconBg: 'success.lighter',
    iconColor: 'success.dark',
  },
  rd: {
    bg: 'secondary.light',
    border: 'secondary.100',
    titleColor: 'secondary.700',
    iconBg: 'secondary.light',
    iconColor: 'secondary.main',
  },
  quality: {
    bg: 'white7ed',
    border: designTokens.colors.warning[200],
    titleColor: 'orange.700',
    iconBg: designTokens.colors.warning[100],
    iconColor: 'orange.500',
  },
  supply: {
    bg: 'white1f2',
    border: 'var(--color-error-200)',
    titleColor: 'pink.700',
    iconBg: 'var(--color-error-100)',
    iconColor: 'error.600',
  },
  manufacturing: {
    bg: 'success.light',
    border: designTokens.colors.success[200],
    titleColor: 'teal.900',
    iconBg: 'success.lighter',
    iconColor: 'success.main',
  },
  data: {
    bg: designTokens.colors.secondary[50],
    border: 'secondary.main',
    titleColor: 'secondary.700',
    iconBg: 'secondary.100',
    iconColor: 'primary.light',
  },
  platform: {
    bg: 'var(--color-secondary-50)',
    border: 'var(--color-secondary-200)',
    titleColor: 'purple.700',
    iconBg: 'var(--color-secondary-100)',
    iconColor: 'purple.600',
  },
};

interface ServiceItem {
  name: string;
  service: string;
  port: number;
  key: string;
  icon: React.ComponentType<any>;
}

const generateInitialStatuses = (): Record<string, boolean> => {
  const statuses: Record<string, boolean> = {};
  const allServices = [
    'unified-core',
    'pm',
    'integration',
    'erp',
    'hrm',
    'crm',
    'rs',
    'manufacturing',
    'ai',
    'quality-assurance',
    'scm',
    'srm',
    'wms',
    'gis',
    'mobile',
  ];
  allServices.forEach((service) => {
    statuses[service] = Math.random() > 0.1;
  });
  return statuses;
};

const simulateStatusChange = (statuses: Record<string, boolean>): Record<string, boolean> => {
  const newStatuses = { ...statuses };
  const allServices = Object.keys(newStatuses);
  const randomService = allServices[Math.floor(Math.random() * allServices.length)];
  newStatuses[randomService] = !newStatuses[randomService];
  return newStatuses;
};

export const ServiceStatusMonitor: React.FC<ServiceStatusMonitorProps> = ({
  serviceStatuses: externalStatuses,
  onRefresh = () => {},
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [internalStatuses, setInternalStatuses] = useState<Record<string, boolean>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const hasExternalStatuses = externalStatuses && Object.keys(externalStatuses).length > 0;
  const currentStatuses = hasExternalStatuses ? externalStatuses : internalStatuses;

  useEffect(() => {
    if (!hasExternalStatuses) {
      setInternalStatuses(generateInitialStatuses());
    }
  }, [hasExternalStatuses]);

  useEffect(() => {
    if (!hasExternalStatuses) {
      const interval = setInterval(() => {
        setInternalStatuses((prev) => simulateStatusChange(prev));
        setLastUpdate(new Date());
      }, 10000);
      return () => clearInterval(interval);
    }
    return;
  }, [hasExternalStatuses]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    onRefresh();
    if (!hasExternalStatuses) {
      setInternalStatuses(generateInitialStatuses());
      setLastUpdate(new Date());
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [hasExternalStatuses, onRefresh]);

  const serviceGroups: { title: string; groupKey: string; services: ServiceItem[] }[] = [
    {
      title: i18n.t('shared.service_status_monitor.k1'),
      groupKey: 'core',
      services: [
        {
          name: i18n.t('shared.service_status_monitor.k2'),
          service: 'CORE',
          port: 8000,
          key: 'unified-core',
          icon: CircleDot,
        },
        {
          name: i18n.t('shared.service_status_monitor.k3'),
          service: 'PM',
          port: 8023,
          key: 'pm',
          icon: FolderKanban,
        },
        {
          name: i18n.t('shared.service_status_monitor.k4'),
          service: 'INTEGRATION',
          port: 8072,
          key: 'integration',
          icon: Link,
        },
      ],
    },
    {
      title: i18n.t('shared.service_status_monitor.k5'),
      groupKey: 'business',
      services: [
        {
          name: i18n.t('shared.service_status_monitor.k6'),
          service: 'ERP',
          port: 8010,
          key: 'erp',
          icon: Building,
        },
        {
          name: i18n.t('shared.service_status_monitor.k7'),
          service: 'HRM',
          port: 8020,
          key: 'hrm',
          icon: Users,
        },
        {
          name: i18n.t('shared.service_status_monitor.k8'),
          service: 'CRM',
          port: 8029,
          key: 'crm',
          icon: Users,
        },
      ],
    },
    {
      title: i18n.t('shared.service_status_monitor.k9'),
      groupKey: 'rd',
      services: [
        {
          name: i18n.t('shared.service_status_monitor.k10'),
          service: 'RD',
          port: 8053,
          key: 'rd',
          icon: FlaskConical,
        },
        {
          name: i18n.t('shared.service_status_monitor.k11'),
          service: 'MES',
          port: 8030,
          key: 'mes',
          icon: Factory,
        },
        {
          name: i18n.t('shared.service_status_monitor.k12'),
          service: 'PDM',
          port: 8031,
          key: 'pdm',
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: i18n.t('shared.service_status_monitor.k13'),
      groupKey: 'quality',
      services: [
        {
          name: i18n.t('shared.service_status_monitor.k14'),
          service: 'QMS',
          port: 8050,
          key: 'qms',
          icon: ClipboardList,
        },
        {
          name: i18n.t('shared.service_status_monitor.k15'),
          service: 'LIMS',
          port: 8051,
          key: 'lims',
          icon: FlaskConical,
        },
        {
          name: i18n.t('shared.service_status_monitor.k16'),
          service: 'EHS',
          port: 8052,
          key: 'ehs',
          icon: Truck,
        },
      ],
    },
    {
      title: i18n.t('shared.service_status_monitor.k17'),
      groupKey: 'supply',
      services: [
        {
          name: i18n.t('shared.service_status_monitor.k18'),
          service: 'SCM',
          port: 8040,
          key: 'scm',
          icon: Truck,
        },
        {
          name: i18n.t('shared.service_status_monitor.k19'),
          service: 'WMS',
          port: 8041,
          key: 'wms',
          icon: Warehouse,
        },
        {
          name: i18n.t('shared.service_status_monitor.k20'),
          service: 'SRM',
          port: 8042,
          key: 'srm',
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: i18n.t('shared.service_status_monitor.k21'),
      groupKey: 'data',
      services: [
        {
          name: i18n.t('shared.service_status_monitor.k22'),
          service: 'BI',
          port: 8060,
          key: 'bi',
          icon: BarChart2,
        },
        {
          name: i18n.t('shared.service_status_monitor.k23'),
          service: 'PORTAL',
          port: 8063,
          key: 'portal',
          icon: Building,
        },
      ],
    },
    {
      title: i18n.t('shared.service_status_monitor.k24'),
      groupKey: 'platform',
      services: [
        {
          name: i18n.t('shared.service_status_monitor.k25'),
          service: 'GIS',
          port: 8071,
          key: 'gis',
          icon: Map,
        },
        {
          name: i18n.t('shared.service_status_monitor.k26'),
          service: 'MOBILE',
          port: 8070,
          key: 'mobile',
          icon: Smartphone,
        },
      ],
    },
  ];

  const onlineCount = Object.values(currentStatuses).filter(Boolean).length;
  const totalCount = Object.keys(currentStatuses).length;
  const offlineCount = totalCount - onlineCount;

  return (
    <Box
      sx={{
        backgroundColor: 'common.white',
        borderRadius: 3,
        padding: 3,
        boxShadow: designTokens.shadows.sm,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              backgroundColor: 'success.lighter',
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 2,
            }}
          >
            <Activity sx={{ width: 20, height: 20, color: 'success.dark' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'text.primary' }}>
              {i18n.t('components.service_status_monitor.k7')}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'grey.600' }}>
              {i18n.t('shared.service_status_monitor.k27')}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'grey.400', mt: 0.5 }}>
              [i18n.t('components.service_status_monitor.k8')]:{' '}
              {lastUpdate.toLocaleTimeString('zh-CN')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${i18n.t('components.service_status_monitor.k0')}${onlineCount}`}
              sx={{
                backgroundColor: 'success.lighter',
                color: 'success.800',
                fontWeight: 500,
                fontSize: 11,
                height: 24,
              }}
            />
            {offlineCount > 0 && (
              <Chip
                label={`${i18n.t('components.service_status_monitor.k1')}${offlineCount}`}
                sx={{
                  backgroundColor: 'error.lighter',
                  color: 'error.800',
                  fontWeight: 500,
                  fontSize: 11,
                  height: 24,
                }}
              />
            )}
          </Box>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              paddingX: 2,
              paddingY: 1,
              borderRadius: 1,
              backgroundColor: 'grey.100',
              color: 'grey.600',
              fontSize: 12,
              fontWeight: 500,
              '&:hover': { backgroundColor: 'grey.200' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            <RefreshCw
              sx={{ width: 14, height: 14 }}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{i18n.t('shared.service_status_monitor.k28')}</span>
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {serviceGroups.map((group) => {
          const colors = groupColors[group.groupKey] || groupColors.core;
          return (
            <Box
              key={group.title}
              sx={{
                padding: 2,
                borderRadius: 3,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    backgroundColor: colors.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 1,
                  }}
                >
                  <Activity sx={{ width: 14, height: 14, color: colors.iconColor }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.titleColor,
                  }}
                >
                  {group.title}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.5,
                }}
              >
                {group.services.map((service) => (
                  <ServiceStatusCard
                    key={service.key}
                    name={service.name}
                    service={service.service}
                    port={service.port}
                    status={currentStatuses[service.key]}
                    icon={service.icon}
                  />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};
