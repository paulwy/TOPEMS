import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
} from "@mui/material";
import {
  Smartphone,
  RefreshCw,
  QrCode,
  Bell,
  Settings,
  Cloud,
  Database,
  Battery,
} from "lucide-react";

export const MobileSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: "offline-sync",
      title: "离线数据同步",
      description: "管理离线数据缓存和同步策略",
      icon: <Cloud size={28} />,
      color: "#3B82F6",
      path: "/mobile/offline-sync",
    },
    {
      id: "scan",
      title: "扫码功能",
      description: "配置扫码识别和数据关联",
      icon: <QrCode size={28} />,
      color: "#10B981",
      path: "/mobile/scan",
    },
    {
      id: "notifications",
      title: "通知推送",
      description: "管理移动端消息推送设置",
      icon: <Bell size={28} />,
      color: "#F59E0B",
      path: "/mobile/notifications",
    },
    {
      id: "settings",
      title: "系统设置",
      description: "通用配置和设备管理",
      icon: <Settings size={28} />,
      color: "#8B5CF6",
      path: "/mobile/settings",
    },
  ];

  const stats = [
    { label: "在线设备", value: "12", icon: <Smartphone size={20} /> },
    { label: "离线缓存", value: "2.3 GB", icon: <Database size={20} /> },
    { label: "同步状态", value: "正常", icon: <RefreshCw size={20} /> },
    { label: "电池优化", value: "已开启", icon: <Battery size={20} /> },
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
            移动端管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            配置移动端应用的各项功能和同步策略
          </Typography>
        </div>
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
                  {stat.icon}
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
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} lg={3} key={item.id}>
            <Card
              sx={{
                height: "100%",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
              onClick={() => navigate(item.path)}
            >
              <CardContent>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    backgroundColor: `${item.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 3,
                  }}
                >
                  <Box sx={{ color: item.color }}>{item.icon}</Box>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MobileSettingsPage;