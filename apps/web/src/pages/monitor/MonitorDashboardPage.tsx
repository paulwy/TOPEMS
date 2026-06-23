import React from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
} from "@mui/material";
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const cpuData = [
  { name: "00:00", value: 45 },
  { name: "04:00", value: 38 },
  { name: "08:00", value: 65 },
  { name: "12:00", value: 82 },
  { name: "16:00", value: 75 },
  { name: "20:00", value: 68 },
];

const memoryData = [
  { name: "00:00", value: 60 },
  { name: "04:00", value: 55 },
  { name: "08:00", value: 72 },
  { name: "12:00", value: 85 },
  { name: "16:00", value: 78 },
  { name: "20:00", value: 70 },
];

const responseTimeData = [
  { name: "API", value: 120 },
  { name: "数据库", value: 85 },
  { name: "缓存", value: 15 },
  { name: "前端", value: 45 },
];

const alertSeverityData = [
  { name: "严重", value: 3 },
  { name: "警告", value: 8 },
  { name: "信息", value: 15 },
];

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6"];

interface AlertItem {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  source: string;
  time: string;
  status: "open" | "acknowledged" | "resolved";
}

const recentAlerts: AlertItem[] = [
  {
    id: "1",
    title: "CPU 使用率超过 80%",
    severity: "critical",
    source: "服务器 #01",
    time: "5分钟前",
    status: "open",
  },
  {
    id: "2",
    title: "内存使用率接近阈值",
    severity: "warning",
    source: "服务器 #02",
    time: "15分钟前",
    status: "acknowledged",
  },
  {
    id: "3",
    title: "磁盘空间不足",
    severity: "critical",
    source: "存储服务器",
    time: "30分钟前",
    status: "open",
  },
  {
    id: "4",
    title: "API 响应时间超时",
    severity: "warning",
    source: "API 网关",
    time: "1小时前",
    status: "resolved",
  },
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "error";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "default";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "open":
      return "error";
    case "acknowledged":
      return "warning";
    case "resolved":
      return "success";
    default:
      return "default";
  }
};

const stats = [
  {
    label: "CPU 使用率",
    value: "72%",
    icon: <Cpu size={24} />,
    color: "primary",
    trend: 5,
  },
  {
    label: "内存使用率",
    value: "68%",
    icon: <HardDrive size={24} />,
    color: "success",
    trend: -3,
  },
  {
    label: "网络延迟",
    value: "15ms",
    icon: <Wifi size={24} />,
    color: "info",
    trend: 0,
  },
  {
    label: "活跃告警",
    value: "5",
    icon: <AlertTriangle size={24} />,
    color: "error",
    trend: 2,
  },
];

export const MonitorDashboardPage: React.FC = () => {
  return (
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <div>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
            监控中心
          </Typography>
          <Typography variant="body2" color="text.secondary">
            系统性能指标概览与告警监控
          </Typography>
        </div>
        <Button variant="contained" startIcon={<Activity />}>
          实时刷新
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                  {stat.trend !== 0 && (
                    <TrendingUp
                      size={14}
                      color={stat.trend > 0 ? "#ef4444" : "#22c55e"}
                      style={{
                        transform: stat.trend < 0 ? "rotate(180deg)" : "none",
                      }}
                    />
                  )}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader title="性能趋势" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cpuData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1976d2"
                    name="CPU"
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4caf50"
                    name="内存"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title="响应时间分析" />
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader title="告警分布" />
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={alertSeverityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {alertSeverityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title="最近告警" />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {recentAlerts.map((alert) => (
                  <Box
                    key={alert.id}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      backgroundColor:
                        alert.status === "open"
                          ? "error.50"
                          : alert.status === "acknowledged"
                            ? "warning.50"
                            : "success.50",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {alert.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          alert.severity === "critical"
                            ? "严重"
                            : alert.severity === "warning"
                              ? "警告"
                              : "信息"
                        }
                        color={getSeverityColor(alert.severity)}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {alert.source} - {alert.time}
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          alert.status === "open"
                            ? "未处理"
                            : alert.status === "acknowledged"
                              ? "已确认"
                              : "已解决"
                        }
                        color={getStatusColor(alert.status)}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitorDashboardPage;
