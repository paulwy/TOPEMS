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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  MapPin,
  Plus,
  Edit,
  Delete,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface GeoFence {
  id: string;
  name: string;
  type: "circle" | "polygon" | "rectangle";
  radius?: number;
  coordinates: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  status: "active" | "inactive";
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export const GisFencePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const geoFences: GeoFence[] = [
    {
      id: "F001",
      name: "仓库区域",
      type: "polygon",
      coordinates: "39.9042, 116.4074",
      alertOnEnter: true,
      alertOnExit: true,
      status: "active",
      createdAt: "2024-01-10 09:00:00",
      lastTriggered: "2024-01-15 14:30:00",
      triggerCount: 156,
    },
    {
      id: "F002",
      name: "危险区域 A",
      type: "circle",
      radius: 50,
      coordinates: "39.9142, 116.4174",
      alertOnEnter: true,
      alertOnExit: false,
      status: "active",
      createdAt: "2024-01-12 10:00:00",
      lastTriggered: "2024-01-15 13:20:00",
      triggerCount: 89,
    },
    {
      id: "F003",
      name: "办公区域",
      type: "rectangle",
      coordinates: "39.9242, 116.4274",
      alertOnEnter: false,
      alertOnExit: true,
      status: "active",
      createdAt: "2024-01-08 11:00:00",
      lastTriggered: "2024-01-15 12:00:00",
      triggerCount: 45,
    },
    {
      id: "F004",
      name: "测试区域",
      type: "circle",
      radius: 30,
      coordinates: "39.8942, 116.3974",
      alertOnEnter: true,
      alertOnExit: true,
      status: "inactive",
      createdAt: "2024-01-05 09:00:00",
      triggerCount: 12,
    },
  ];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "circle":
        return "圆形";
      case "polygon":
        return "多边形";
      case "rectangle":
        return "矩形";
      default:
        return type;
    }
  };

  const stats = [
    { label: "围栏总数", value: "24", icon: <Shield size={20} />, color: "primary" },
    { label: "激活围栏", value: "18", icon: <CheckCircle size={20} />, color: "success" },
    { label: "今日触发", value: "45", icon: <AlertTriangle size={20} />, color: "warning" },
    { label: "待处理告警", value: "3", icon: <Clock size={20} />, color: "error" },
  ];

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
            地理围栏管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            定义和管理地理围栏区域，设置进出告警规则
          </Typography>
        </div>
        <Button variant="contained" startIcon={<Plus />} onClick={() => setOpenDialog(true)}>
          创建围栏
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
            <CardHeader
              title="围栏列表"
              action={
                <TextField
                  placeholder="搜索围栏..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  sx={{ width: 200 }}
                  InputProps={{
                    startAdornment: <Search size={16} sx={{ mr: 1 }} />,
                  }}
                />
              }
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>围栏名称</TableCell>
                      <TableCell>类型</TableCell>
                      <TableCell>坐标</TableCell>
                      <TableCell>告警规则</TableCell>
                      <TableCell>触发次数</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {geoFences.map((fence) => (
                      <TableRow key={fence.id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <MapPin size={16} />
                            {fence.name}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getTypeLabel(fence.type)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{fence.coordinates}</Typography>
                          {fence.radius && (
                            <Typography variant="caption" color="text.secondary">
                              (半径: {fence.radius}m)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            {fence.alertOnEnter && (
                              <Chip size="small" label="进入告警" color="warning" />
                            )}
                            {fence.alertOnExit && (
                              <Chip size="small" label="离开告警" color="info" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{fence.triggerCount}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={fence.status === "active" ? "激活" : "停用"}
                            color={fence.status === "active" ? "success" : "default"}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <IconButton size="small">
                              <Edit size={16} />
                            </IconButton>
                            <IconButton size="small" color="error">
                              <Delete size={16} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader title="地图预览" />
            <CardContent>
              <Box
                sx={{
                  height: 400,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <MapPin size={48} color="#1976d2" />
                <Typography variant="body2" color="text.secondary">
                  地图预览区域
                </Typography>
                <Box
                  sx={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    right: 20,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Chip
                    size="small"
                    label="围栏区域"
                    color="primary"
                    icon={<Shield size={14} />}
                  />
                  <Chip
                    size="small"
                    label="告警区域"
                    color="error"
                    icon={<AlertTriangle size={14} />}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title="最近告警" />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[
                  {
                    time: "14:30",
                    location: "仓库区域",
                    type: "进入",
                    device: "设备 #003",
                  },
                  {
                    time: "13:20",
                    location: "危险区域 A",
                    type: "进入",
                    device: "设备 #005",
                  },
                  {
                    time: "12:00",
                    location: "办公区域",
                    type: "离开",
                    device: "人员 #012",
                  },
                ].map((alert, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      backgroundColor: alert.type === "进入" ? "warning.50" : "info.50",
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
                        {alert.location}
                      </Typography>
                      <Chip
                        size="small"
                        label={alert.type === "进入" ? "进入" : "离开"}
                        color={alert.type === "进入" ? "warning" : "info"}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {alert.time} - {alert.device}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>创建地理围栏</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
            <TextField
              label="围栏名称"
              placeholder="输入围栏名称"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>围栏类型</InputLabel>
              <Select defaultValue="circle" label="围栏类型">
                <MenuItem value="circle">圆形</MenuItem>
                <MenuItem value="polygon">多边形</MenuItem>
                <MenuItem value="rectangle">矩形</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="中心坐标"
              placeholder="如: 39.9042, 116.4074"
              fullWidth
            />
            <TextField
              label="半径 (米)"
              type="number"
              placeholder="仅圆形围栏需要"
              fullWidth
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              告警规则
            </Typography>
            <Box sx={{ display: "flex", gap: 4 }}>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="进入时告警"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="离开时告警"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button variant="contained">创建围栏</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GisFencePage;