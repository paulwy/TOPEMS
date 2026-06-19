"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import { Grid } from "@/components/Grid";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

interface ServiceStatus {
  name: string;
  key: string;
  status: "online" | "warning" | "offline";
}

interface ServiceMonitorProps {
  services: ServiceStatus[];
  onRefresh?: () => void;
  refreshInterval?: number;
}

const statusConfig = {
  online: {
    icon: CheckCircle,
    color: "#22c55e",
    label: "在线",
  },
  warning: {
    icon: AlertTriangle,
    color: "#f59e0b",
    label: "异常",
  },
  offline: {
    icon: XCircle,
    color: "#ef4444",
    label: "离线",
  },
};

export default function ServiceMonitor({
  services,
  onRefresh,
  refreshInterval = 30000,
}: ServiceMonitorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 统计在线和异常数量
  const onlineCount = services.filter((s) => s.status === "online").length;
  const warningCount = services.filter((s) => s.status === "warning").length;
  const offlineCount = services.filter((s) => s.status === "offline").length;

  // 手动刷新
  const handleRefresh = () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh();
      // 模拟刷新动画持续时间
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // 自动刷新
  useEffect(() => {
    if (refreshInterval > 0 && onRefresh) {
      const timer = setInterval(() => {
        onRefresh();
      }, refreshInterval);

      return () => clearInterval(timer);
    }
    return undefined;
  }, [refreshInterval, onRefresh]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      {/* 头部 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            服务状态监测
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Chip
              size="small"
              label={`在线 ${onlineCount}`}
              sx={{
                bgcolor: "#22c55e20",
                color: "#22c55e",
                fontWeight: 500,
              }}
            />
            {warningCount > 0 && (
              <Chip
                size="small"
                label={`异常 ${warningCount}`}
                sx={{
                  bgcolor: "#f59e0b20",
                  color: "#f59e0b",
                  fontWeight: 500,
                }}
              />
            )}
            {offlineCount > 0 && (
              <Chip
                size="small"
                label={`离线 ${offlineCount}`}
                sx={{
                  bgcolor: "#ef444420",
                  color: "#ef4444",
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
        </Box>
        <IconButton
          onClick={handleRefresh}
          disabled={!onRefresh || isRefreshing}
          sx={{
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <RefreshCw
            size={20}
            style={{
              animation: isRefreshing ? "spin 1s linear infinite" : "none",
            }}
          />
        </IconButton>
      </Box>

      {/* 服务列表 */}
      <Grid container spacing={2}>
        {services.map((service) => {
          const config = statusConfig[service.status];
          const IconComponent = config.icon;

          return (
            <Grid xs={12} sm={6} md={3} lg={1.5} key={service.key}>
              <Card
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: config.color,
                    boxShadow: `0 0 0 1px ${config.color}20`,
                  },
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <IconComponent size={20} color={config.color} />
                    <Chip
                      size="small"
                      label={config.label}
                      sx={{
                        height: 20,
                        fontSize: "0.7rem",
                        bgcolor: `${config.color}20`,
                        color: config.color,
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {service.name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* CSS 动画 */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Paper>
  );
}
