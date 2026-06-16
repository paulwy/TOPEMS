/**
 * 运营仪表盘页面
 *
 * 功能：
 * 1. 统计卡片展示运营数据总览
 * 2. 图表区域展示数据趋势
 * 3. 数据列表展示最新运营信息
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Button,
  Card,
  CardContent,
  useTheme,
} from "@mui/material";
import {
  LayoutDashboard,
  Package,
  Car,
  Warehouse,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
} from "lucide-react";
import { PageHeader } from "../components/layout";
import { StatCardGroup, type StatCardProps } from "../components/mui";

// ============ Mock 数据 ============
const mockStats = {
  totalAssets: 1256,
  totalAssetsChange: 12.5,
  activeAssets: 1089,
  activeAssetsChange: 8.3,
  totalEquipment: 456,
  totalEquipmentChange: 5.2,
  equipmentUtilization: 94.5,
  equipmentUtilizationChange: 2.1,
};

const mockRecentAssets = [
  { id: "1", name: "联想ThinkPad X1笔记本", assetNo: "ZC-2024-001", status: "使用中", date: "2024-01-15" },
  { id: "2", name: "戴尔UltraSharp显示器", assetNo: "ZC-2024-002", status: "使用中", date: "2024-01-14" },
  { id: "3", name: "华为MateBook 14", assetNo: "ZC-2024-003", status: "闲置", date: "2024-01-13" },
  { id: "4", name: "iPhone 15 Pro手机", assetNo: "ZC-2024-004", status: "维护中", date: "2024-01-12" },
  { id: "5", name: "罗技MX Master 3鼠标", assetNo: "ZC-2024-005", status: "使用中", date: "2024-01-11" },
];

const mockRecentEquipment = [
  { id: "1", name: "激光打印机 HP LaserJet", equipmentNo: "SB-2024-001", status: "正常", nextMaintenance: "2024-02-15" },
  { id: "2", name: "投影仪 Epson EB-980U", equipmentNo: "SB-2024-002", status: "正常", nextMaintenance: "2024-03-01" },
  { id: "3", name: "复印机 Canon imageRUNNER", equipmentNo: "SB-2024-003", status: "预警", nextMaintenance: "2024-01-20" },
  { id: "4", name: "扫描仪 Fujitsu fi-7160", equipmentNo: "SB-2024-004", status: "正常", nextMaintenance: "2024-04-10" },
];

const mockVehicleUsage = [
  { id: "1", plateNo: "京A12345", driver: "张师傅", status: "行驶中", destination: "首都机场" },
  { id: "2", plateNo: "京B67890", driver: "李师傅", status: "待命", destination: "-" },
  { id: "3", plateNo: "京C11111", driver: "王师傅", status: "保养中", destination: "-" },
];

const mockMeetingRoomUsage = [
  { id: "1", name: "第一会议室", capacity: 20, current: "产品评审会", time: "14:00-16:00" },
  { id: "2", name: "第二会议室", capacity: 10, current: "技术讨论", time: "10:00-12:00" },
  { id: "3", name: "第三会议室", capacity: 6, current: "-", time: "-" },
  { id: "4", name: "视频会议室", capacity: 8, current: "远程面试", time: "15:00-17:00" },
];

const mockLowStockSupplies = [
  { id: "1", name: "A4打印纸", current: 5, min: 20, unit: "箱" },
  { id: "2", name: "黑色墨盒", current: 2, min: 10, unit: "个" },
  { id: "3", name: "中性笔", current: 15, min: 50, unit: "支" },
];

// ============ 组件 ============
const OperationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  // 跳转到各管理模块
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // 统计卡片数据
  const statCards = useMemo<StatCardProps[]>(() => [
    {
      id: "total-assets",
      title: "资产总数",
      value: mockStats.totalAssets,
      icon: <Package style={{ width: 24, height: 24 }} />,
      color: "primary" as const,
      trend: mockStats.totalAssetsChange,
      trendLabel: "较上月",
    },
    {
      id: "active-assets",
      title: "使用中资产",
      value: mockStats.activeAssets,
      icon: <TrendingUp style={{ width: 24, height: 24 }} />,
      color: "success" as const,
      trend: mockStats.activeAssetsChange,
      trendLabel: "较上月",
    },
    {
      id: "total-equipment",
      title: "设备总数",
      value: mockStats.totalEquipment,
      icon: <LayoutDashboard style={{ width: 24, height: 24 }} />,
      color: "info" as const,
      trend: mockStats.totalEquipmentChange,
      trendLabel: "较上月",
    },
    {
      id: "equipment-utilization",
      title: "设备利用率",
      value: `${mockStats.equipmentUtilization}%`,
      icon: <TrendingUp style={{ width: 24, height: 24 }} />,
      color: "warning" as const,
      trend: mockStats.equipmentUtilizationChange,
      trendLabel: "较上月",
    },
  ], []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="运营仪表盘"
        subtitle="实时查看企业运营数据总览"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Eye style={{ width: 18, height: 18 }} />}
              onClick={() => handleNavigate("/asset-management")}
            >
              资产管理
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => handleNavigate("/equipment-management")}
              sx={{ bgcolor: "#3b82f6" }}
            >
              设备管理
            </Button>
          </Box>
        }
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          运营概览
        </Typography>
        <StatCardGroup stats={statCards} columns={4} />
      </Paper>

      {/* 主要内容区域 */}
      <Grid container spacing={3}>
        {/* 最近资产动态 */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                最近资产动态
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowUpRight style={{ width: 16, height: 16 }} />}
                onClick={() => handleNavigate("/asset-management")}
              >
                查看全部
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {mockRecentAssets.map((asset) => (
                <Box
                  key={asset.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "grey.50",
                    "&:hover": { bgcolor: "grey.100" },
                    cursor: "pointer",
                  }}
                  onClick={() => handleNavigate("/asset-management")}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: "#3b82f6",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Package style={{ width: 20, height: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {asset.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {asset.assetNo}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Chip
                      size="small"
                      label={asset.status}
                      color={
                        asset.status === "使用中"
                          ? "success"
                          : asset.status === "闲置"
                          ? "info"
                          : "warning"
                      }
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {asset.date}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* 设备状态 */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                设备状态
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowUpRight style={{ width: 16, height: 16 }} />}
                onClick={() => handleNavigate("/equipment-management")}
              >
                查看全部
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {mockRecentEquipment.map((equipment) => (
                <Box
                  key={equipment.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "grey.50",
                    "&:hover": { bgcolor: "grey.100" },
                    cursor: "pointer",
                  }}
                  onClick={() => handleNavigate("/equipment-management")}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: equipment.status === "预警" ? "#ef4444" : "#3b82f6",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <LayoutDashboard style={{ width: 20, height: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {equipment.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {equipment.equipmentNo}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Chip
                      size="small"
                      label={equipment.status}
                      color={equipment.status === "预警" ? "error" : "success"}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      下次维保: {equipment.nextMaintenance}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* 车辆使用情况 */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                车辆使用情况
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowUpRight style={{ width: 16, height: 16 }} />}
                onClick={() => handleNavigate("/vehicle-management")}
              >
                查看全部
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {mockVehicleUsage.map((vehicle) => (
                <Box
                  key={vehicle.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "grey.50",
                    "&:hover": { bgcolor: "grey.100" },
                    cursor: "pointer",
                  }}
                  onClick={() => handleNavigate("/vehicle-management")}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: vehicle.status === "行驶中" ? "#22c55e" : vehicle.status === "待命" ? "#3b82f6" : "#f59e0b",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Car style={{ width: 20, height: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {vehicle.plateNo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        司机: {vehicle.driver}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {vehicle.destination !== "-" ? `→ ${vehicle.destination}` : vehicle.destination}
                    </Typography>
                    <Chip
                      size="small"
                      label={vehicle.status}
                      color={
                        vehicle.status === "行驶中"
                          ? "success"
                          : vehicle.status === "待命"
                          ? "info"
                          : "warning"
                      }
                      variant="outlined"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* 会议室使用情况 */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                会议室使用情况
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowUpRight style={{ width: 16, height: 16 }} />}
                onClick={() => handleNavigate("/meeting-room-management")}
              >
                查看全部
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {mockMeetingRoomUsage.map((room) => (
                <Box
                  key={room.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: room.current !== "-" ? "primary.50" : "grey.50",
                    "&:hover": { bgcolor: room.current !== "-" ? "primary.100" : "grey.100" },
                    cursor: "pointer",
                  }}
                  onClick={() => handleNavigate("/meeting-room-management")}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: room.current !== "-" ? "#8b5cf6" : "#94a3b8",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Calendar style={{ width: 20, height: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {room.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        容量: {room.capacity}人
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {room.current !== "-" ? (
                      <>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="caption" color="text.secondary">
                            {room.time}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: "primary.main" }}>
                            {room.current}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <Chip size="small" label="空闲" color="default" variant="outlined" />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* 库存预警 */}
        <Grid xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                库存预警
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowUpRight style={{ width: 16, height: 16 }} />}
                onClick={() => handleNavigate("/office-supplies-management")}
              >
                查看全部
              </Button>
            </Box>
            <Grid container spacing={2}>
              {mockLowStockSupplies.map((supply) => (
                <Grid xs={12} sm={4} key={supply.id}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: "error.50",
                      border: "1px solid",
                      borderColor: "error.200",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "error.100" },
                    }}
                    onClick={() => handleNavigate("/office-supplies-management")}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                      <Package style={{ width: 20, height: 20, color: "#ef4444" }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {supply.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">
                        当前库存: {supply.current}{supply.unit}
                      </Typography>
                      <Typography variant="caption" color="error.main">
                        最低: {supply.min}{supply.unit}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        mt: 1,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: "grey.200",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: `${Math.min((supply.current / supply.min) * 100, 100)}%`,
                          height: "100%",
                          borderRadius: 2,
                          bgcolor: "error.main",
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OperationDashboardPage;
