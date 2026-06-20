import React, { useState, useEffect } from "react";
import { GisProvider, useGis } from "../../context/GisContext";
import MapView from "../../components/gis/MapView";
import {
  MapPin,
  ArrowRight,
  Warehouse,
  Camera,
  Map,
  Building2,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  Box,
  Paper,
  Stack,
  Chip,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Button,
} from "@mui/material";
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
} from "../../api/gis";

type TabType =
  | "map"
  | "devicePoints"
  | "pipelines"
  | "storageLocations"
  | "evidenceRecords"
  | "factoryMaps"
  | "businessLocations";

const GisContent: React.FC = () => {
  const { state, loadAllData } = useGis();
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
    statistics,
    loading,
    error,
  } = state;

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: "map", label: "地图视图", icon: <Map size={18} /> },
    { id: "devicePoints", label: "设备点位", icon: <MapPin size={18} /> },
    { id: "pipelines", label: "管线管理", icon: <ArrowRight size={18} /> },
    {
      id: "storageLocations",
      label: "仓储位置",
      icon: <Warehouse size={18} />,
    },
    { id: "evidenceRecords", label: "现场取证", icon: <Camera size={18} /> },
    { id: "factoryMaps", label: "厂区地图", icon: <Map size={18} /> },
    {
      id: "businessLocations",
      label: "业务位置",
      icon: <Building2 size={18} />,
    },
  ];

  const getStatusStyle = (status: string) => {
    if (!status) return { bgcolor: "#f1f5f9", color: "#475569" };
    const s = status.toLowerCase();
    if (s.includes("active") || s.includes("启用"))
      return { bgcolor: "#dcfce7", color: "#15803d" };
    if (s.includes("pending") || s.includes("待处理"))
      return { bgcolor: "#fef3c7", color: "#b45309" };
    if (s.includes("inactive") || s.includes("禁用"))
      return { bgcolor: "#fee2e2", color: "#b91c1c" };
    return { bgcolor: "#f1f5f9", color: "#475569" };
  };

  const StatusChip: React.FC<{ status: string }> = ({ status }) => {
    const style = getStatusStyle(status);
    return (
      <Chip
        label={status}
        size="small"
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const renderDataTable = (data: any[], type: TabType) => {
    if (data.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography color="text.secondary">暂无数据</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              {type === "devicePoints" && (
                <>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    名称
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    类型
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    坐标
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    状态
                  </th>
                </>
              )}
              {type === "pipelines" && (
                <>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    名称
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    类型
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    起点
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    终点
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    状态
                  </th>
                </>
              )}
              {type === "storageLocations" && (
                <>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    名称
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    类型
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    容量
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    坐标
                  </th>
                </>
              )}
              {type === "evidenceRecords" && (
                <>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    标题
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    类型
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    记录人
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    时间
                  </th>
                </>
              )}
              {type === "factoryMaps" && (
                <>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    名称
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    编号
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    类型
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    创建时间
                  </th>
                </>
              )}
              {type === "businessLocations" && (
                <>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    名称
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    类型
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    地址
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    联系人
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    状态
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {type === "devicePoints" &&
              (data as DevicePoint[]).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 16px" }}>{item.name}</td>
                  <td style={{ padding: "12px 16px" }}>{item.device_type}</td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {<StatusChip status={item.status} />}
                  </td>
                </tr>
              ))}
            {type === "pipelines" &&
              (data as Pipeline[]).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 16px" }}>{item.name}</td>
                  <td style={{ padding: "12px 16px" }}>{item.pipeline_type}</td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {item.start_point
                      ? `${item.start_point[0].toFixed(4)}, ${item.start_point[1].toFixed(4)}`
                      : ""}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {item.end_point
                      ? `${item.end_point[0].toFixed(4)}, ${item.end_point[1].toFixed(4)}`
                      : ""}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {<StatusChip status={item.status} />}
                  </td>
                </tr>
              ))}
            {type === "storageLocations" &&
              (data as StorageLocation[]).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 16px" }}>{item.name}</td>
                  <td style={{ padding: "12px 16px" }}>{item.location_type}</td>
                  <td style={{ padding: "12px 16px" }}>{item.capacity}</td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </td>
                </tr>
              ))}
            {type === "evidenceRecords" &&
              (data as EvidenceRecord[]).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 16px" }}>{item.title}</td>
                  <td style={{ padding: "12px 16px" }}>{item.evidence_type}</td>
                  <td style={{ padding: "12px 16px" }}>{item.recorded_by}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {item.recorded_at
                      ? new Date(item.recorded_at).toLocaleString()
                      : ""}
                  </td>
                </tr>
              ))}
            {type === "factoryMaps" &&
              (data as FactoryMap[]).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 16px" }}>{item.name}</td>
                  <td style={{ padding: "12px 16px" }}>{item.code}</td>
                  <td style={{ padding: "12px 16px" }}>{item.map_type}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString()
                      : ""}
                  </td>
                </tr>
              ))}
            {type === "businessLocations" &&
              (data as BusinessLocation[]).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 16px" }}>{item.business_name}</td>
                  <td style={{ padding: "12px 16px" }}>{item.business_type}</td>
                  <td style={{ padding: "12px 16px" }}>{item.address}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {item.contact_person}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {<StatusChip status={item.status} />}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Box>
    );
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "devicePoints":
        return devicePoints;
      case "pipelines":
        return pipelines;
      case "storageLocations":
        return storageLocations;
      case "evidenceRecords":
        return evidenceRecords;
      case "factoryMaps":
        return factoryMaps;
      case "businessLocations":
        return businessLocations;
      default:
        return [];
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #ecfeff 100%)",
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, sm: 3 }, py: 4 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            mb: 4,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                GIS地图
              </Typography>
              <Typography color="text.secondary">
                管理设备点位、管线、仓储位置、现场取证、厂区地图和业务位置
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              onClick={() => loadAllData(true)}
              startIcon={
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
              }
              sx={{
                bgcolor: "white",
                border: 1,
                borderColor: "#e5e7eb",
                borderRadius: 2,
                "&:hover": { bgcolor: "#f9fafb" },
                textTransform: "none",
              }}
            >
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
                刷新数据
              </Typography>
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert
            severity="error"
            icon={<AlertTriangle size={20} />}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        <Snackbar
          open={Boolean(notification)}
          autoHideDuration={3000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            severity={notification?.type === "success" ? "success" : "error"}
            onClose={() => setNotification(null)}
            icon={
              notification?.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertCircle size={20} />
              )
            }
          >
            {notification?.message}
          </Alert>
        </Snackbar>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(6, 1fr)",
            },
            gap: 4,
            mb: 6,
          }}
        >
          <Paper
            sx={{
              borderRadius: 2,
              p: 4,
              boxShadow: 1,
              border: 1,
              borderColor: "#f3f4f6",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin size={20} style={{ color: "#16a34a" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#111827" }}
                >
                  {statistics?.device_points || devicePoints.length}
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  设备点位
                </Typography>
              </Box>
            </Box>
          </Paper>
          <Paper
            sx={{
              borderRadius: 2,
              p: 4,
              boxShadow: 1,
              border: 1,
              borderColor: "#f3f4f6",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowRight size={20} style={{ color: "#6366f1" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#111827" }}
                >
                  {statistics?.pipelines || pipelines.length}
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  管线管理
                </Typography>
              </Box>
            </Box>
          </Paper>
          <Paper
            sx={{
              borderRadius: 2,
              p: 4,
              boxShadow: 1,
              border: 1,
              borderColor: "#f3f4f6",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Warehouse size={20} style={{ color: "#d97706" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#111827" }}
                >
                  {statistics?.storage_locations || storageLocations.length}
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  仓储位置
                </Typography>
              </Box>
            </Box>
          </Paper>
          <Paper
            sx={{
              borderRadius: 2,
              p: 4,
              boxShadow: 1,
              border: 1,
              borderColor: "#f3f4f6",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "#fce7f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={20} style={{ color: "#db2777" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#111827" }}
                >
                  {statistics?.evidence_records || evidenceRecords.length}
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  现场取证
                </Typography>
              </Box>
            </Box>
          </Paper>
          <Paper
            sx={{
              borderRadius: 2,
              p: 4,
              boxShadow: 1,
              border: 1,
              borderColor: "#f3f4f6",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "#f3e8ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Map size={20} style={{ color: "#9333ea" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#111827" }}
                >
                  {statistics?.factory_maps || factoryMaps.length}
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  厂区地图
                </Typography>
              </Box>
            </Box>
          </Paper>
          <Paper
            sx={{
              borderRadius: 2,
              p: 4,
              boxShadow: 1,
              border: 1,
              borderColor: "#f3f4f6",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "#ccfbf1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Building2 size={20} style={{ color: "#14b8a6" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#111827" }}
                >
                  {statistics?.business_locations || businessLocations.length}
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  业务位置
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        <Paper
          sx={{
            borderRadius: 2,
            boxShadow: 1,
            border: 1,
            borderColor: "#f3f4f6",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              borderBottom: 1,
              borderColor: "#f3f4f6",
              overflowX: "auto",
            }}
          >
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 20,
                  py: 12,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  color: activeTab === tab.id ? "#0891b2" : "#4b5563",
                  borderBottom: activeTab === tab.id ? 2 : 0,
                  borderColor: activeTab === tab.id ? "#0891b2" : "transparent",
                  bgcolor: activeTab === tab.id ? "#ecfeff" : "transparent",
                  "&:hover": {
                    bgcolor: activeTab === tab.id ? "#ecfeff" : "#f9fafb",
                  },
                  textTransform: "none",
                }}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ p: 4 }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 12,
                }}
              >
                <CircularProgress sx={{ color: "#06b6d4" }} />
              </Box>
            ) : activeTab === "map" ? (
              <Box
                sx={{
                  height: 600,
                  border: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <MapView
                  devicePoints={devicePoints}
                  pipelines={pipelines}
                  storageLocations={storageLocations}
                />
              </Box>
            ) : (
              renderDataTable(getCurrentData(), activeTab)
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

const GisMapPage: React.FC = () => {
  return (
    <GisProvider>
      <GisContent />
    </GisProvider>
  );
};

export default GisMapPage;
