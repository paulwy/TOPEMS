import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Switch,
  Grid,
} from "@mui/material";
import {
  RefreshCw,
  CloudUpload,
  CloudDownload,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface SyncRecord {
  id: string;
  type: string;
  name: string;
  size: string;
  status: "pending" | "syncing" | "completed" | "failed";
  progress: number;
  lastSync: string;
  nextSync: string;
}

export const OfflineSyncPage: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30);
  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>([
    {
      id: "1",
      type: "task",
      name: "巡检任务数据",
      size: "128 KB",
      status: "completed",
      progress: 100,
      lastSync: "2024-01-15 10:30:00",
      nextSync: "2024-01-15 11:00:00",
    },
    {
      id: "2",
      type: "scan",
      name: "扫码记录",
      size: "256 KB",
      status: "completed",
      progress: 100,
      lastSync: "2024-01-15 10:25:00",
      nextSync: "2024-01-15 10:55:00",
    },
    {
      id: "3",
      type: "evidence",
      name: "现场取证照片",
      size: "15 MB",
      status: "pending",
      progress: 0,
      lastSync: "2024-01-15 09:00:00",
      nextSync: "2024-01-15 10:30:00",
    },
    {
      id: "4",
      type: "location",
      name: "位置轨迹数据",
      size: "512 KB",
      status: "syncing",
      progress: 65,
      lastSync: "2024-01-15 10:00:00",
      nextSync: "2024-01-15 10:30:00",
    },
  ]);

  useEffect(() => {
    if (isSyncing) {
      const interval = setInterval(() => {
        setSyncRecords((prev) =>
          prev.map((record) => {
            if (record.status === "syncing") {
              const newProgress = record.progress + Math.random() * 10;
              if (newProgress >= 100) {
                return {
                  ...record,
                  progress: 100,
                  status: "completed" as const,
                };
              }
              return { ...record, progress: newProgress };
            }
            return record;
          }),
        );
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isSyncing]);

  const handleStartSync = () => {
    setIsSyncing(true);
    setSyncRecords((prev) =>
      prev.map((record) =>
        record.status === "pending"
          ? { ...record, status: "syncing" as const, progress: 0 }
          : record,
      ),
    );
    setTimeout(() => setIsSyncing(false), 5000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "syncing":
        return "primary";
      case "pending":
        return "warning";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "已同步";
      case "syncing":
        return "同步中";
      case "pending":
        return "待同步";
      case "failed":
        return "失败";
      default:
        return status;
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
            离线数据同步
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理离线数据缓存、同步策略和历史记录
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<RefreshCw />}
          onClick={handleStartSync}
          disabled={isSyncing}
        >
          {isSyncing ? "同步中..." : "立即同步"}
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader title="同步设置" />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                    />
                  }
                  label="自动同步"
                />
                <Box>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    同步间隔
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {syncInterval} 分钟
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    离线缓存大小
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    2.3 GB / 10 GB
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={23}
                    sx={{ mt: 2, height: 8 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader title="同步状态" subheader="最近同步记录" />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>数据类型</TableCell>
                      <TableCell>名称</TableCell>
                      <TableCell>大小</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>进度</TableCell>
                      <TableCell>上次同步</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {syncRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {record.type === "task" && <Clock size={16} />}
                            {record.type === "scan" && (
                              <CloudDownload size={16} />
                            )}
                            {record.type === "evidence" && (
                              <CloudUpload size={16} />
                            )}
                            {record.type === "location" && (
                              <Database size={16} />
                            )}
                            <Typography variant="body2">
                              {record.type}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.size}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getStatusLabel(record.status)}
                            color={getStatusColor(record.status)}
                            icon={
                              record.status === "completed" ? (
                                <CheckCircle size={14} />
                              ) : record.status === "failed" ? (
                                <AlertCircle size={14} />
                              ) : null
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <LinearProgress
                            variant="determinate"
                            value={record.progress}
                            sx={{ width: 100, height: 6 }}
                          />
                          <Typography variant="caption">
                            {Math.round(record.progress)}%
                          </Typography>
                        </TableCell>
                        <TableCell>{record.lastSync}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OfflineSyncPage;
