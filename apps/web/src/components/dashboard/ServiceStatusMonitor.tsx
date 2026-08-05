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
import { ServiceStatusCard } from './ServiceStatusCard';

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
  核心服务: {
    bg: 'primary.light',
    border: 'primary.light',
    titleColor: 'primary.dark',
    iconBg: 'primary.100',
    iconColor: 'primary.dark',
  },
  业务运营: {
    bg: 'success.light',
    border: 'success.light',
    titleColor: 'success.700',
    iconBg: 'success.lighter',
    iconColor: 'success.dark',
  },
  研发管理: {
    bg: 'secondary.light',
    border: 'secondary.100',
    titleColor: 'secondary.700',
    iconBg: 'secondary.light',
    iconColor: 'secondary.main',
  },
  生产管理: {
    bg: 'white7ed',
    border: '#fed7aa',
    titleColor: 'orange.700',
    iconBg: '#ffedd5',
    iconColor: 'orange.500',
  },
  质量管理: {
    bg: 'white1f2',
    border: '#fecdd3',
    titleColor: 'pink.700',
    iconBg: '#ffe4e6',
    iconColor: 'error.600',
  },
  供应链: {
    bg: 'success.light',
    border: '#a7f3d0',
    titleColor: 'teal.900',
    iconBg: 'success.lighter',
    iconColor: 'success.main',
  },
  专业服务: {
    bg: '#eef2ff',
    border: 'secondary.main',
    titleColor: 'secondary.700',
    iconBg: 'secondary.100',
    iconColor: 'primary.light',
  },
  '数据/门户': {
    bg: '#fdf4ff',
    border: '#f5d0fe',
    titleColor: 'purple.700',
    iconBg: '#fae8ff',
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

  const serviceGroups: { title: string; services: ServiceItem[] }[] = [
    {
      title: '核心服务',
      services: [
        {
          name: '统一核心',
          service: 'CORE',
          port: 8000,
          key: 'unified-core',
          icon: CircleDot,
        },
        {
          name: '项目管理',
          service: 'PM',
          port: 8023,
          key: 'pm',
          icon: FolderKanban,
        },
        {
          name: '系统集成',
          service: 'INTEGRATION',
          port: 8072,
          key: 'integration',
          icon: Link,
        },
      ],
    },
    {
      title: '业务运营',
      services: [
        {
          name: '企业资源',
          service: 'ERP',
          port: 8010,
          key: 'erp',
          icon: Building,
        },
        {
          name: '人力资源',
          service: 'HRM',
          port: 8020,
          key: 'hrm',
          icon: Users,
        },
        {
          name: '客户关系',
          service: 'CRM',
          port: 8029,
          key: 'crm',
          icon: Users,
        },
      ],
    },
    {
      title: '研发管理',
      services: [
        {
          name: '研发管理',
          service: 'RD',
          port: 8053,
          key: 'rd',
          icon: FlaskConical,
        },
        {
          name: '生产执行',
          service: 'MES',
          port: 8030,
          key: 'mes',
          icon: Factory,
        },
        {
          name: '产品数据',
          service: 'PDM',
          port: 8031,
          key: 'pdm',
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: '质量管理',
      services: [
        {
          name: '质量管理',
          service: 'QMS',
          port: 8050,
          key: 'qms',
          icon: ClipboardList,
        },
        {
          name: '实验室信息',
          service: 'LIMS',
          port: 8051,
          key: 'lims',
          icon: FlaskConical,
        },
        {
          name: '环境安全',
          service: 'EHS',
          port: 8052,
          key: 'ehs',
          icon: Truck,
        },
      ],
    },
    {
      title: '供应链',
      services: [
        {
          name: '供应链管理',
          service: 'SCM',
          port: 8040,
          key: 'scm',
          icon: Truck,
        },
        {
          name: '仓储管理',
          service: 'WMS',
          port: 8041,
          key: 'wms',
          icon: Warehouse,
        },
        {
          name: '供应商管理',
          service: 'SRM',
          port: 8042,
          key: 'srm',
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: '数据/门户',
      services: [
        { name: '商业智能', service: 'BI', port: 8060, key: 'bi', icon: BarChart2 },
        { name: '企业门户', service: 'PORTAL', port: 8063, key: 'portal', icon: Building },
      ],
    },
    {
      title: '专业服务',
      services: [
        { name: '地理信息', service: 'GIS', port: 8071, key: 'gis', icon: Map },
        {
          name: '移动服务',
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
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
              服务状态监测
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'grey.600' }}>实时监控各服务运行状态</Typography>
            <Typography sx={{ fontSize: 11, color: 'grey.400', mt: 0.5 }}>
              最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`在线 ${onlineCount}`}
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
                label={`离线 ${offlineCount}`}
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
              '&:hover': { backgroundColor: 'border.default' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            <RefreshCw
              sx={{ width: 14, height: 14 }}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>刷新</span>
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
          const colors = groupColors[group.title];
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
