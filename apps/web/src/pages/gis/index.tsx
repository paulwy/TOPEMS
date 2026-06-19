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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {type === "devicePoints" && (
                <>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">坐标</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">状态</th>
                </>
              )}
              {type === "pipelines" && (
                <>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">起点</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">终点</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">状态</th>
                </>
              )}
              {type === "storageLocations" && (
                <>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">容量</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">坐标</th>
                </>
              )}
              {type === "evidenceRecords" && (
                <>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">标题</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">记录人</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">时间</th>
                </>
              )}
              {type === "factoryMaps" && (
                <>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">编号</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">创建时间</th>
                </>
              )}
              {type === "businessLocations" && (
                <>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">地址</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">联系人</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">状态</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {type === "devicePoints" &&
              (data as DevicePoint[]).map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.device_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </td>
                  <td className="px-4 py-3">{<StatusChip status={item.status} />}</td>
                </tr>
              ))}
            {type === "pipelines" &&
              (data as Pipeline[]).map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.pipeline_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.start_point
                      ? `${item.start_point[0].toFixed(4)}, ${item.start_point[1].toFixed(4)}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.end_point
                      ? `${item.end_point[0].toFixed(4)}, ${item.end_point[1].toFixed(4)}`
                      : ""}
                  </td>
                  <td className="px-4 py-3">{<StatusChip status={item.status} />}</td>
                </tr>
              ))}
            {type === "storageLocations" &&
              (data as StorageLocation[]).map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.location_type}</td>
                  <td className="px-4 py-3">{item.capacity}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </td>
                </tr>
              ))}
            {type === "evidenceRecords" &&
              (data as EvidenceRecord[]).map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3">{item.evidence_type}</td>
                  <td className="px-4 py-3">{item.recorded_by}</td>
                  <td className="px-4 py-3">
                    {item.recorded_at
                      ? new Date(item.recorded_at).toLocaleString()
                      : ""}
                  </td>
                </tr>
              ))}
            {type === "factoryMaps" &&
              (data as FactoryMap[]).map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.code}</td>
                  <td className="px-4 py-3">{item.map_type}</td>
                  <td className="px-4 py-3">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString()
                      : ""}
                  </td>
                </tr>
              ))}
            {type === "businessLocations" &&
              (data as BusinessLocation[]).map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.business_name}</td>
                  <td className="px-4 py-3">{item.business_type}</td>
                  <td className="px-4 py-3">{item.address}</td>
                  <td className="px-4 py-3">{item.contact_person}</td>
                  <td className="px-4 py-3">{<StatusChip status={item.status} />}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
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
          sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 4 }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                GIS地图
              </Typography>
              <Typography color="text.secondary">
                管理设备点位、管线、仓储位置、现场取证、厂区地图和业务位置
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <button
              onClick={() => loadAllData(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
              <span className="text-sm font-medium">刷新数据</span>
            </button>
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics?.device_points || devicePoints.length}
                </div>
                <div className="text-sm text-gray-500">设备点位</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics?.pipelines || pipelines.length}
                </div>
                <div className="text-sm text-gray-500">管线管理</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics?.storage_locations || storageLocations.length}
                </div>
                <div className="text-sm text-gray-500">仓储位置</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <Camera className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics?.evidence_records || evidenceRecords.length}
                </div>
                <div className="text-sm text-gray-500">现场取证</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Map className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics?.factory_maps || factoryMaps.length}
                </div>
                <div className="text-sm text-gray-500">厂区地图</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics?.business_locations || businessLocations.length}
                </div>
                <div className="text-sm text-gray-500">业务位置</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
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
                  borderColor: "divider",
                  borderRadius: 1.5,
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
          </div>
        </div>
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