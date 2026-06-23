import React, { useState } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Slider,
} from "@mui/material";
import {
  Cpu,
  HardDrive,
  Wifi,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const metricsData = [
  { name: "CPU", value: 72, threshold: 85, unit: "%", status: "normal" },
  { name: "内存", value: 68, threshold: 90, unit: "%", status: "normal" },
  { name: "磁盘", value: 45, threshold: 80, unit: "%", status: "normal" },
  { name: "网络", value: 15, threshold: 100, unit: "ms", status: "normal" },
  { name: "API响应", value: 120, threshold: 500, unit: "ms", status: "normal" },
  { name: "数据库", value: 85, threshold: 200, unit: "ms", status: "normal" },
];

const hourlyData = [
  { hour: "00:00", cpu: 45, memory: 60, disk: 42 },
  { hour: "02:00", cpu: 38, memory: 55, disk: 42 },
  { hour: "04:00", cpu: 32, memory: 52, disk: 43 },
  { hour: "06:00", cpu: 48, memory: 58, disk: 43 },
  { hour: "08:00", cpu: 65, memory: 72, disk: 44 },
  { hour: "10:00", cpu: 78, memory: 78, disk: 44 },
  { hour: "12:00", cpu: 82, memory: 85, disk: 45 },
  { hour: "14:00", cpu: 75, memory: 78, disk: 45 },
  { hour: "16:00", cpu: 70, memory: 75, disk: 46 },
  { hour: "18:00", cpu: 68, memory: 70, disk: 46 },
  { hour: "20:00", cpu: 62, memory: 68, disk: 47 },
  { hour: "22:00", cpu: 48, memory: 62, disk: 47 },
];

interface MetricLog {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  status: "normal" | "warning" | "critical";
}

const metricLogs: MetricLog[] = [
  { id: "1", timestamp: "14:35:22", metric: "CPU", value: 72, unit: "%", status: "normal" },
  { id: "2", timestamp: "14:35:21", metric: "内存", value: 68, unit: "%", status: "normal" },
  { id: "3", timestamp: "14:35:20", metric: "磁盘", value: 45, unit: "%", status: "normal" },
  { id: "4", timestamp: "14:35:19", metric: "网络", value: 15, unit: "ms", status: "normal" },
  { id: "5", timestamp: "14:35:18", metric: "API响应", value: 120, unit: "ms", status: "normal" },
  { id: "6", timestamp: "14:35:17", metric: "数据库", value: 85, unit: "ms", status: "normal" },
];

export const MonitorMetricsPage: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState("cpu");
  const [timeRange, setTimeRange] = useState("24h");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "success";
      case "warning":
        return "warning";
      case "critical":
        return "error";
      default:
        return "default";
    }
  };

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
            性能指标监控
          </Typography>
          <Typography variant="body2" color="text.secondary">
            实时监控系统性能指标，追踪资源使用情况
          </Typography>
        </div>
        <Button variant="contained" startIcon={<RefreshCw />}>
          刷新数据
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={9}>
          <Card>
            <CardHeader
              title="指标趋势图"
              action={
                <Box sx={{ display: "flex", gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>时间范围</InputLabel>
                    <Select
                      value={timeRange}
                      label="时间范围"
                      onChange={(e) => setTimeRange(e.target.value)}
                    >
                      <MenuItem value="1h">1小时</MenuItem>
                      <MenuItem value="6h">6小时</MenuItem>
                      <MenuItem value="24h">24小时</MenuItem>
                      <MenuItem value="7d">7天</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>监控指标</InputLabel>
                    <Select
                      value={selectedMetric}
                      label="监控指标"
                      onChange={(e) => setSelectedMetric(e.target.value)}
                    >
                      <MenuItem value="cpu">CPU</MenuItem>
                      <MenuItem value="memory">内存</MenuItem>
                      <MenuItem value="disk">磁盘</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              }
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cpu" stroke="#1976d2" fill="#1976d2" fillOpacity={0.3} name="CPU" />
                  <Area type="monotone" dataKey="memory" stroke="#4caf50" fill="#4caf50" fillOpacity={0.3} name="内存" />
                  <Area type="monotone" dataKey="disk" stroke="#ff9800" fill="#ff9800" fillOpacity={0.3} name="磁盘" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={3}>
          <Card>
            <CardHeader title="指标状态" />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {metricsData.map((metric) => (
                  <Box key={metric.name}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {metric.name}
                      </Typography>
                      <Typography variant="body2">
                        {metric.value}{metric.unit}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Slider
                        value={metric.value}
                        disabled
                        sx={{ flex: 1, color: metric.value > metric.threshold * 0.8 ? "#f59e0b" : "#22c55e" }}
                      />
                      <Chip
                        size="small"
                        label="正常"
                        color={getStatusColor(metric.status)}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader title="实时指标日志" />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>指标</TableCell>
                  <TableCell>数值</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metricLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Clock size={14} />
                        {log.timestamp}
                      </Box>
                    </TableCell>
                    <TableCell>{log.metric}</TableCell>
                    <TableCell>
                      {log.value}{log.unit}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={log.status === "normal" ? "正常" : log.status === "warning" ? "警告" : "严重"}
                        color={getStatusColor(log.status)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MonitorMetricsPage;