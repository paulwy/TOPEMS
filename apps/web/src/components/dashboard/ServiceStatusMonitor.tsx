import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, Button, Chip, SvgIconProps } from "@mui/material";
import {
  Activity,
  CircleDot,
  FolderKanban,
  Building,
  Link,
  Users,
  Factory,
  ClipboardList,
  AlertTriangle,
  Truck,
  ShoppingCart,
  Warehouse,
  Map,
  BarChart2,
  Bot,
  Smartphone,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import { ServiceStatusCard } from "./ServiceStatusCard";

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
    bg: "#eff6ff",
    border: "#bfdbfe",
    titleColor: "#1d4ed8",
    iconBg: "#dbeafe",
    iconColor: "#2563eb",
  },
  业务运营: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    titleColor: "#15803d",
    iconBg: "#dcfce7",
    iconColor: "#22c55e",
  },
  研发管理: {
    bg: "#faf5ff",
    border: "#ddd6fe",
    titleColor: "#6d28d9",
    iconBg: "#ede9fe",
    iconColor: "#8b5cf6",
  },
  生产管理: {
    bg: "#fff7ed",
    border: "#fed7aa",
    titleColor: "#c2410c",
    iconBg: "#ffedd5",
    iconColor: "#f97316",
  },
  供应链: {
    bg: "#ecfdf5",
    border: "#a7f3d0",
    titleColor: "#065f46",
    iconBg: "#d1fae5",
    iconColor: "#10b981",
  },
  专业服务: {
    bg: "#eef2ff",
    border: "#c7d2fe",
    titleColor: "#4338ca",
    iconBg: "#ddd6fe",
    iconColor: "#6366f1",
  },
};

interface ServiceItem {
  name: string;
  service: string;
  port: number;
  key: string;
  icon: React.ComponentType<SvgIconProps>;
}

const generateInitialStatuses = (): Record<string, boolean> => {
  const statuses: Record<string, boolean> = {};
  const allServices = [
    "unified-core", "pm", "integration",
    "erp", "hrm", "crm",
    "rs", "manufacturing", "ai",
    "quality-assurance",
    "scm", "srm", "wms",
    "gis", "mobile",
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
    return undefined;
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
      title: "核心服务",
      services: [
        { name: "统一核心", service: "CORE", port: 8000, key: "unified-core", icon: CircleDot },
        { name: "项目管理", service: "PM", port: 8001, key: "pm", icon: FolderKanban },
        { name: "系统集成", service: "INTEGRATION", port: 8005, key: "integration", icon: Link },
      ],
    },
    {
      title: "业务运营",
      services: [
        { name: "企业资源", service: "ERP", port: 8010, key: "erp", icon: Building },
        { name: "人力资源", service: "HRM", port: 8011, key: "hrm", icon: Users },
        { name: "客户关系", service: "CRM", port: 8012, key: "crm", icon: Users },
      ],
    },
    {
      title: "研发管理",
      services: [
        { name: "研发管理", service: "RS", port: 8020, key: "rs", icon: FlaskConical },
        { name: "制造服务", service: "MFG", port: 8023, key: "manufacturing", icon: Factory },
        { name: "AI服务", service: "AI", port: 8062, key: "ai", icon: Bot },
      ],
    },
    {
      title: "生产管理",
      services: [
        { name: "质量保证", service: "QA", port: 8032, key: "quality-assurance", icon: ClipboardList },
      ],
    },
    {
      title: "供应链",
      services: [
        { name: "供应链管理", service: "SCM", port: 8040, key: "scm", icon: Truck },
        { name: "供应商管理", service: "SRM", port: 8041, key: "srm", icon: ShoppingCart },
        { name: "仓储管理", service: "WMS", port: 8042, key: "wms", icon: Warehouse },
      ],
    },
    {
      title: "专业服务",
      services: [
        { name: "地理信息", service: "GIS", port: 8053, key: "gis", icon: Map },
        { name: "移动服务", service: "MOBILE", port: 8070, key: "mobile", icon: Smartphone },
      ],
    },
  ];

  const onlineCount = Object.values(currentStatuses).filter(Boolean).length;
  const totalCount = Object.keys(currentStatuses).length;
  const offlineCount = totalCount - onlineCount;

  return (
    <Box
      sx={{
        backgroundColor: "#ffffff",
        borderRadius: 3,
        padding: 3,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              backgroundColor: "#dcfce7",
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 2,
            }}
          >
            <Activity sx={{ width: 20, height: 20, color: "#22c55e" }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>
              服务状态监测
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#64748b" }}>
              实时监控各服务运行状态
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#94a3b8", mt: 0.5 }}>
              最后更新: {lastUpdate.toLocaleTimeString("zh-CN")}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={`在线 ${onlineCount}`}
              sx={{
                backgroundColor: "#dcfce7",
                color: "#166534",
                fontWeight: 500,
                fontSize: 11,
                height: 24,
              }}
            />
            {offlineCount > 0 && (
              <Chip
                label={`离线 ${offlineCount}`}
                sx={{
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
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
              display: "flex",
              alignItems: "center",
              gap: 1,
              paddingX: 2,
              paddingY: 1,
              borderRadius: 1,
              backgroundColor: "#f1f5f9",
              color: "#64748b",
              fontSize: 12,
              fontWeight: 500,
              "&:hover": { backgroundColor: "#e2e8f0" },
              "&:disabled": { opacity: 0.5 },
            }}
          >
            <RefreshCw
              sx={{ width: 14, height: 14 }}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>刷新</span>
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
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
                borderRadius: 2,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    backgroundColor: colors.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
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
