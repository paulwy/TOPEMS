/**
 * EquipmentManagementPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 使用 mock 数据
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import {
  LayoutDashboard,
  Plus,
  Eye,
  Edit,
  Trash2,
  ClipboardCheck,
  Wrench,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  StatCardGroup,
  type ColumnDef,
  type RowAction,
} from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ 类型定义 ============
interface Equipment {
  id: string;
  equipment_number: string;
  name: string;
  equipment_type: string;
  brand: string;
  model: string;
  purchase_date: string;
  use_status: "normal" | "abnormal" | "maintenance";
  maintenance_cycle: string;
  location: string;
}

interface InspectionRecord {
  id: string;
  equipment_code: string;
  equipment_name: string;
  inspector: string;
  inspection_date: string;
  status: "normal" | "abnormal";
  temperature?: number;
  vibration?: number;
  noise_level?: number;
  abnormalities?: string;
}

interface MaintenanceRecord {
  id: string;
  equipment_code: string;
  equipment_name: string;
  maintenance_type: string;
  description: string;
  maintainer: string;
  start_time: string;
  end_time?: string;
  cost?: number;
  status: "pending" | "in_progress" | "completed";
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============ Mock 数据 ============
const mockEquipment: Equipment[] = [
  { id: "1", equipment_number: "SB-2024-001", name: "激光打印机 HP LaserJet", equipment_type: "打印设备", brand: "惠普", model: "LaserJet Pro", purchase_date: "2023-06-15", use_status: "normal", maintenance_cycle: "季度", location: "行政部" },
  { id: "2", equipment_number: "SB-2024-002", name: "投影仪 Epson EB-980U", equipment_type: "显示设备", brand: "爱普生", model: "EB-980U", purchase_date: "2023-08-20", use_status: "normal", maintenance_cycle: "半年", location: "会议室" },
  { id: "3", equipment_number: "SB-2024-003", name: "复印机 Canon imageRUNNER", equipment_type: "打印设备", brand: "佳能", model: "imageRUNNER", purchase_date: "2022-11-10", use_status: "abnormal", maintenance_cycle: "季度", location: "行政部" },
  { id: "4", equipment_number: "SB-2024-004", name: "扫描仪 Fujitsu fi-7160", equipment_type: "扫描设备", brand: "富士通", model: "fi-7160", purchase_date: "2023-03-25", use_status: "normal", maintenance_cycle: "年度", location: "IT部" },
  { id: "5", equipment_number: "SB-2024-005", name: "碎纸机 deli E9000", equipment_type: "办公设备", brand: "得力", model: "E9000", purchase_date: "2023-09-01", use_status: "maintenance", maintenance_cycle: "年度", location: "财务部" },
  { id: "6", equipment_number: "SB-2024-006", name: "考勤机 ZKTeco C3-400", equipment_type: "安防设备", brand: "中控智慧", model: "C3-400", purchase_date: "2022-05-18", use_status: "normal", maintenance_cycle: "季度", location: "大门" },
];

const mockInspections: InspectionRecord[] = [
  { id: "1", equipment_code: "SB-2024-001", equipment_name: "激光打印机 HP LaserJet", inspector: "张师傅", inspection_date: "2024-01-15", status: "normal", temperature: 45, vibration: 0.2, noise_level: 55 },
  { id: "2", equipment_code: "SB-2024-002", equipment_name: "投影仪 Epson EB-980U", inspector: "李师傅", inspection_date: "2024-01-14", status: "normal", temperature: 38, vibration: 0.1, noise_level: 42 },
  { id: "3", equipment_code: "SB-2024-003", equipment_name: "复印机 Canon imageRUNNER", inspector: "王师傅", inspection_date: "2024-01-13", status: "abnormal", temperature: 65, vibration: 0.8, noise_level: 72, abnormalities: "复印件有黑边" },
  { id: "4", equipment_code: "SB-2024-004", equipment_name: "扫描仪 Fujitsu fi-7160", inspector: "张师傅", inspection_date: "2024-01-12", status: "normal", temperature: 35, vibration: 0.1, noise_level: 38 },
];

const mockMaintenances: MaintenanceRecord[] = [
  { id: "1", equipment_code: "SB-2024-001", equipment_name: "激光打印机 HP LaserJet", maintenance_type: "定期维护", description: "更换墨粉盒，清洁内部", maintainer: "张师傅", start_time: "2024-01-10 09:00", end_time: "2024-01-10 11:00", cost: 300, status: "completed" },
  { id: "2", equipment_code: "SB-2024-003", equipment_name: "复印机 Canon imageRUNNER", maintenance_type: "故障维修", description: "感光鼓更换", maintainer: "李师傅", start_time: "2024-01-16 14:00", status: "in_progress", cost: 1500 },
  { id: "3", equipment_code: "SB-2024-005", equipment_name: "碎纸机 deli E9000", maintenance_type: "预防性维护", description: "刀片保养", maintainer: "王师傅", start_time: "2024-01-20 10:00", status: "pending" },
];

// ============ 列定义 ============
const getEquipmentColumns = (
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<Equipment>[] => [
  {
    id: "equipment_number",
    header: "设备编号",
    accessor: "equipment_number",
    minWidth: 120,
    render: (row: Equipment) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {row.equipment_number}
      </Typography>
    ),
  },
  {
    id: "name",
    header: "设备名称",
    accessor: "name",
    minWidth: 180,
    render: (row: Equipment) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LayoutDashboard sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{row.name}</Typography>
      </Box>
    ),
  },
  {
    id: "equipment_type",
    header: "设备类型",
    accessor: "equipment_type",
    minWidth: 100,
    render: (row: Equipment) => (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {row.equipment_type}
      </Typography>
    ),
  },
  {
    id: "brand",
    header: "品牌",
    accessor: "brand",
    minWidth: 80,
    render: (row: Equipment) => (
      <Typography variant="body2">{row.brand}</Typography>
    ),
  },
  {
    id: "purchase_date",
    header: "购买日期",
    accessor: "purchase_date",
    minWidth: 100,
    render: (row: Equipment) => (
      <Typography variant="body2">{row.purchase_date}</Typography>
    ),
  },
  {
    id: "use_status",
    header: "使用状态",
    accessor: "use_status",
    width: 100,
    render: (row: Equipment) => getStatusBadge(row.use_status),
  },
  {
    id: "maintenance_cycle",
    header: "维护周期",
    accessor: "maintenance_cycle",
    minWidth: 80,
    render: (row: Equipment) => (
      <Typography variant="body2">{row.maintenance_cycle}</Typography>
    ),
  },
];

const getInspectionColumns = (): ColumnDef<InspectionRecord>[] => [
  {
    id: "equipment_code",
    header: "设备编号",
    accessor: "equipment_code",
    minWidth: 120,
  },
  {
    id: "equipment_name",
    header: "设备名称",
    accessor: "equipment_name",
    minWidth: 180,
  },
  {
    id: "inspector",
    header: "点检人",
    accessor: "inspector",
    minWidth: 80,
  },
  {
    id: "inspection_date",
    header: "点检日期",
    accessor: "inspection_date",
    minWidth: 100,
  },
  {
    id: "temperature",
    header: "温度(°C)",
    accessor: "temperature",
    minWidth: 80,
    render: (row: InspectionRecord) => (
      <Typography variant="body2">{row.temperature || "-"}</Typography>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 80,
    render: (row: InspectionRecord) => (
      <Chip
        size="small"
        color={row.status === "normal" ? "success" : "error"}
        label={row.status === "normal" ? "正常" : "异常"}
        variant="outlined"
      />
    ),
  },
];

const getMaintenanceColumns = (): ColumnDef<MaintenanceRecord>[] => [
  {
    id: "equipment_code",
    header: "设备编号",
    accessor: "equipment_code",
    minWidth: 120,
  },
  {
    id: "equipment_name",
    header: "设备名称",
    accessor: "equipment_name",
    minWidth: 180,
  },
  {
    id: "maintenance_type",
    header: "维护类型",
    accessor: "maintenance_type",
    minWidth: 100,
  },
  {
    id: "maintainer",
    header: "维护人员",
    accessor: "maintainer",
    minWidth: 80,
  },
  {
    id: "start_time",
    header: "开始时间",
    accessor: "start_time",
    minWidth: 140,
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: MaintenanceRecord) => (
      <Chip
        size="small"
        color={
          row.status === "completed"
            ? "success"
            : row.status === "in_progress"
            ? "warning"
            : "default"
        }
        label={
          row.status === "completed"
            ? "已完成"
            : row.status === "in_progress"
            ? "进行中"
            : "待处理"
        }
        variant="outlined"
      />
    ),
  },
];

// ============ 筛选配置 ============
const getEquipmentFilters = (): FilterConfig[] => [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索设备名称、编号...",
    width: 250,
  },
  {
    id: "equipment_type",
    label: "设备类型",
    type: "select",
    options: [
      { label: "全部类型", value: "all" },
      { label: "打印设备", value: "打印设备" },
      { label: "显示设备", value: "显示设备" },
      { label: "扫描设备", value: "扫描设备" },
      { label: "办公设备", value: "办公设备" },
      { label: "安防设备", value: "安防设备" },
    ],
  },
  {
    id: "use_status",
    label: "使用状态",
    type: "select",
    options: [
      { label: "全部状态", value: "all" },
      { label: "正常", value: "normal" },
      { label: "异常", value: "abnormal" },
      { label: "维护中", value: "maintenance" },
    ],
  },
];

// ============ 组件 ============
const EquipmentManagementPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // Tab状态
  const [activeTab, setActiveTab] = useState("equipment");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [equipmentData, setEquipmentData] = useState<PaginatedResult<Equipment>>({
    items: mockEquipment,
    total: mockEquipment.length,
    page: 1,
    page_size: 10,
  });
  const [inspectionData] = useState<PaginatedResult<InspectionRecord>>({
    items: mockInspections,
    total: mockInspections.length,
    page: 1,
    page_size: 10,
  });
  const [maintenanceData] = useState<PaginatedResult<MaintenanceRecord>>({
    items: mockMaintenances,
    total: mockMaintenances.length,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("all");
  const [useStatusFilter, setUseStatusFilter] = useState("all");

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, "success" | "warning" | "error"> = {
      normal: "success",
      abnormal: "error",
      maintenance: "warning",
    };
    const labels: Record<string, string> = {
      normal: "正常",
      abnormal: "异常",
      maintenance: "维护中",
    };
    return (
      <Chip
        size="small"
        color={colors[status] || "default"}
        label={labels[status] || status}
        variant="outlined"
      />
    );
  }, []);

  // 统计卡片
  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "设备总数",
        value: mockEquipment.length,
        icon: <LayoutDashboard style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "normal",
        title: "正常",
        value: mockEquipment.filter((e) => e.use_status === "normal").length,
        icon: <ClipboardCheck style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "abnormal",
        title: "异常",
        value: mockEquipment.filter((e) => e.use_status === "abnormal").length,
        icon: <LayoutDashboard style={{ width: 24, height: 24 }} />,
        color: "error" as const,
      },
      {
        id: "maintenance",
        title: "维护中",
        value: mockEquipment.filter((e) => e.use_status === "maintenance").length,
        icon: <Wrench style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
    ],
    [],
  );

  const equipmentColumns = useMemo(() => getEquipmentColumns(getStatusBadge), [getStatusBadge]);
  const inspectionColumns = useMemo(() => getInspectionColumns(), []);
  const maintenanceColumns = useMemo(() => getMaintenanceColumns(), []);
  const filterConfigs = useMemo(() => getEquipmentFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.equipment_type !== undefined) setEquipmentTypeFilter(filters.equipment_type);
      if (filters.use_status !== undefined) setUseStatusFilter(filters.use_status);
    },
    [],
  );

  // 搜索处理
  const handleSearch = useCallback(() => {
    let filtered = [...mockEquipment];
    if (searchText) {
      filtered = filtered.filter(
        (e) =>
          e.name.includes(searchText) ||
          e.equipment_number.includes(searchText)
      );
    }
    if (equipmentTypeFilter && equipmentTypeFilter !== "all") {
      filtered = filtered.filter((e) => e.equipment_type === equipmentTypeFilter);
    }
    if (useStatusFilter && useStatusFilter !== "all") {
      filtered = filtered.filter((e) => e.use_status === useStatusFilter);
    }
    setEquipmentData({
      items: filtered,
      total: filtered.length,
      page: 1,
      page_size: 10,
    });
  }, [searchText, equipmentTypeFilter, useStatusFilter]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setEquipmentTypeFilter("all");
    setUseStatusFilter("all");
    setEquipmentData({
      items: mockEquipment,
      total: mockEquipment.length,
      page: 1,
      page_size: 10,
    });
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="设备管理"
        subtitle={`共 ${mockEquipment.length} 台设备`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增设备
          </Button>
        }
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          设备概览
        </Typography>
        <StatCardGroup stats={statCards} columns={4} />
      </Paper>

      {/* Tab切换 */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab
            value="equipment"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LayoutDashboard style={{ width: 18, height: 18 }} />
                设备台账
              </Box>
            }
          />
          <Tab
            value="inspections"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ClipboardCheck style={{ width: 18, height: 18 }} />
                点检记录
              </Box>
            }
          />
          <Tab
            value="maintenances"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Wrench style={{ width: 18, height: 18 }} />
                维护维修
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === "equipment" && (
            <>
              <FilterBar
                filters={filterConfigs}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                onSearch={handleSearch}
              />
              <ListPageTemplate
                columns={equipmentColumns}
                data={equipmentData.items}
                loading={loading}
                pagination={{
                  page: equipmentData.page - 1,
                  pageSize: equipmentData.page_size,
                  total: equipmentData.total,
                  onPageChange: (page) =>
                    setEquipmentData((prev) => ({ ...prev, page: page + 1 })),
                  onPageSizeChange: (pageSize) =>
                    setEquipmentData((prev) => ({ ...prev, page_size: pageSize })),
                }}
                emptyMessage="暂无设备数据"
              />
            </>
          )}

          {activeTab === "inspections" && (
            <ListPageTemplate
              columns={inspectionColumns}
              data={inspectionData.items}
              loading={loading}
              pagination={{
                page: inspectionData.page - 1,
                pageSize: inspectionData.page_size,
                total: inspectionData.total,
                onPageChange: (page) =>
                  setEquipmentData((prev) => ({ ...prev, page: page + 1 })),
                onPageSizeChange: (pageSize) =>
                  setEquipmentData((prev) => ({ ...prev, page_size: pageSize })),
              }}
              emptyMessage="暂无点检记录"
            />
          )}

          {activeTab === "maintenances" && (
            <ListPageTemplate
              columns={maintenanceColumns}
              data={maintenanceData.items}
              loading={loading}
              pagination={{
                page: maintenanceData.page - 1,
                pageSize: maintenanceData.page_size,
                total: maintenanceData.total,
                onPageChange: (page) =>
                  setEquipmentData((prev) => ({ ...prev, page: page + 1 })),
                onPageSizeChange: (pageSize) =>
                  setEquipmentData((prev) => ({ ...prev, page_size: pageSize })),
              }}
              emptyMessage="暂无维护记录"
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default EquipmentManagementPageRefactored;
