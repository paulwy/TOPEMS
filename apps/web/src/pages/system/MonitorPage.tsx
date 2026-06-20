import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  LinearProgress,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { monitorApi } from "@/api/shared/monitor";
import { apiLogger } from "@/utils/logger";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Cpu,
  HardDrive,
  Wifi,
  Database,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Activity,
  Server,
} from "lucide-react";

const MonitorPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<{
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_in: number;
    network_out: number;
    uptime: number;
    timestamp: string;
  } | null>(null);
  const [serviceHealth, setServiceHealth] = useState<
    {
      service_name: string;
      status: "healthy" | "degraded" | "unhealthy";
      latency: number;
      error_rate: number;
      last_checked: string;
      uptime_percentage: number;
    }[]
  >([]);
  const [alerts, setAlerts] = useState<
    {
      id: string;
      alert_type: string;
      severity: "critical" | "warning" | "info";
      title: string;
      message: string;
      service_name: string;
      status: "active" | "resolved" | "acknowledged";
      created_at: string;
    }[]
  >([]);

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsRes, healthRes, alertsRes] = await Promise.all([
        monitorApi.getSystemMetrics(),
        monitorApi.getServiceHealth(),
        monitorApi.listAlerts({ page_size: 20 }),
      ]);
      setSystemMetrics(metricsRes.data || null);
      setServiceHealth(healthRes.data || []);
      setAlerts(alertsRes.data?.items || []);
    } catch (error) {
      apiLogger.error("加载监控数据失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载监控数据",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "success.main";
      case "degraded":
        return "warning.main";
      case "unhealthy":
        return "error.main";
      default:
        return "grey.500";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "error.main";
      case "warning":
        return "warning.main";
      case "info":
        return "info.main";
      default:
        return "grey.500";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          系统监控
        </Typography>
        <Button variant="outlined" startIcon={<RefreshCw />} onClick={loadData}>
          刷新数据
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        <Card>
          <CardHeader>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Cpu sx={{ width: 16, height: 16, color: "primary.main" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                CPU 使用率
              </Typography>
            </Box>
          </CardHeader>
          <CardContent>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color:
                  (systemMetrics?.cpu_usage || 0) >= 80
                    ? "error.main"
                    : (systemMetrics?.cpu_usage || 0) >= 60
                      ? "warning.main"
                      : "success.main",
              }}
            >
              {(systemMetrics?.cpu_usage || 0).toFixed(1)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={systemMetrics?.cpu_usage || 0}
              sx={{ mt: 2, height: 8 }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <HardDrive
                sx={{ width: 16, height: 16, color: "primary.main" }}
              />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                内存使用率
              </Typography>
            </Box>
          </CardHeader>
          <CardContent>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color:
                  (systemMetrics?.memory_usage || 0) >= 80
                    ? "error.main"
                    : (systemMetrics?.memory_usage || 0) >= 60
                      ? "warning.main"
                      : "success.main",
              }}
            >
              {(systemMetrics?.memory_usage || 0).toFixed(1)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={systemMetrics?.memory_usage || 0}
              sx={{ mt: 2, height: 8 }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Database sx={{ width: 16, height: 16, color: "primary.main" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                磁盘使用率
              </Typography>
            </Box>
          </CardHeader>
          <CardContent>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color:
                  (systemMetrics?.disk_usage || 0) >= 80
                    ? "error.main"
                    : (systemMetrics?.disk_usage || 0) >= 60
                      ? "warning.main"
                      : "success.main",
              }}
            >
              {(systemMetrics?.disk_usage || 0).toFixed(1)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={systemMetrics?.disk_usage || 0}
              sx={{ mt: 2, height: 8 }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Activity sx={{ width: 16, height: 16, color: "primary.main" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                系统运行时间
              </Typography>
            </Box>
          </CardHeader>
          <CardContent>
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", color: "success.main" }}
            >
              {formatUptime(systemMetrics?.uptime || 0)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardHeader>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Server sx={{ width: 20, height: 20 }} />
            服务健康状态
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.875rem" }}>
              <thead style={{ backgroundColor: "#f5f5f5" }}>
                <tr>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                  >
                    服务名称
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    状态
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    延迟 (ms)
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    错误率
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    可用性
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                  >
                    最后检查
                  </th>
                </tr>
              </thead>
              <tbody>
                {serviceHealth.length > 0 ? (
                  serviceHealth.map((service) => (
                    <tr
                      key={service.service_name}
                      style={{ borderBottom: "1px solid" }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        {service.service_name}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <Chip
                          size="small"
                          label={
                            service.status === "healthy"
                              ? "健康"
                              : service.status === "degraded"
                                ? "降级"
                                : "异常"
                          }
                          icon={
                            service.status === "healthy" ? (
                              <CheckCircle sx={{ width: 14, height: 14 }} />
                            ) : (
                              <AlertTriangle sx={{ width: 14, height: 14 }} />
                            )
                          }
                          sx={{
                            bgcolor: `${getStatusColor(service.status)}20`,
                          }}
                        />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {service.latency}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {service.error_rate.toFixed(2)}%
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {service.uptime_percentage.toFixed(1)}%
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {new Date(service.last_checked).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        color: "text.disabled",
                      }}
                    >
                      暂无服务健康数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <AlertTriangle sx={{ width: 20, height: 20 }} />
            告警列表
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            最近20条告警记录
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.875rem" }}>
              <thead style={{ backgroundColor: "#f5f5f5" }}>
                <tr>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                  >
                    标题
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    级别
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                  >
                    服务
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                  >
                    消息
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    状态
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                  >
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <tr key={alert.id} style={{ borderBottom: "1px solid" }}>
                      <td style={{ padding: "12px 16px" }}>{alert.title}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <Chip
                          size="small"
                          label={
                            alert.severity === "critical"
                              ? "严重"
                              : alert.severity === "warning"
                                ? "警告"
                                : "信息"
                          }
                          sx={{
                            bgcolor: `${getSeverityColor(alert.severity)}20`,
                            color: getSeverityColor(alert.severity),
                          }}
                        />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {alert.service_name}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {alert.message}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <Chip
                          size="small"
                          label={
                            alert.status === "active"
                              ? "活跃"
                              : alert.status === "resolved"
                                ? "已解决"
                                : "已确认"
                          }
                          sx={{
                            bgcolor:
                              alert.status === "active"
                                ? "error.light"
                                : "success.light",
                          }}
                        />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {new Date(alert.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        color: "text.disabled",
                      }}
                    >
                      暂无告警记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MonitorPage;
