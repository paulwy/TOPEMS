/**
 * VehicleManagementPage 重构后
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
  Car,
  Plus,
  Eye,
  Edit,
  Trash2,
  User,
  Calendar,
  Fuel,
  Settings,
  CheckCircle,
  Clock,
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
interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_type: "sedan" | "suv" | "van" | "truck" | "bus";
  fuel_type: "gasoline" | "diesel" | "electric" | "hybrid";
  driver?: string;
  mileage: number;
  status: "available" | "in_use" | "maintenance" | "out_of_service";
  insurance_expire?: string;
  last_service?: string;
}

interface VehicleRequest {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  requester: string;
  purpose: string;
  start_time: string;
  end_time: string;
  driver_required: boolean;
  status: "pending" | "approved" | "rejected" | "completed";
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============ Mock 数据 ============
const mockVehicles: Vehicle[] = [
  { id: "1", plate_number: "京A12345", brand: "大众", model: "帕萨特", vehicle_type: "sedan", fuel_type: "gasoline", driver: "张师傅", mileage: 56000, status: "in_use", insurance_expire: "2024-06-15", last_service: "2024-01-05" },
  { id: "2", plate_number: "京B67890", brand: "丰田", model: "凯美瑞", vehicle_type: "sedan", fuel_type: "hybrid", driver: "李师傅", mileage: 42000, status: "available", insurance_expire: "2024-05-20", last_service: "2024-01-10" },
  { id: "3", plate_number: "京C11111", brand: "别克", model: "GL8", vehicle_type: "van", fuel_type: "gasoline", driver: "王师傅", mileage: 78000, status: "maintenance", insurance_expire: "2024-04-30", last_service: "2024-01-12" },
  { id: "4", plate_number: "京D22222", brand: "宝马", model: "5系", vehicle_type: "sedan", fuel_type: "gasoline", driver: "赵师傅", mileage: 35000, status: "in_use", insurance_expire: "2024-07-01", last_service: "2023-12-20" },
  { id: "5", plate_number: "京E33333", brand: "比亚迪", model: "秦EV", vehicle_type: "sedan", fuel_type: "electric", driver: "钱师傅", mileage: 28000, status: "available", insurance_expire: "2024-08-15", last_service: "2024-01-08" },
  { id: "6", plate_number: "京F44444", brand: "金龙", model: "大巴", vehicle_type: "bus", fuel_type: "diesel", mileage: 120000, status: "available", insurance_expire: "2024-03-10", last_service: "2023-11-15" },
];

const mockRequests: VehicleRequest[] = [
  { id: "1", vehicle_id: "1", vehicle_plate: "京A12345", requester: "张经理", purpose: "客户拜访", start_time: "2024-01-15 09:00", end_time: "2024-01-15 12:00", driver_required: true, status: "approved" },
  { id: "2", vehicle_id: "4", vehicle_plate: "京D22222", requester: "刘总", purpose: "商务接待", start_time: "2024-01-15 14:00", end_time: "2024-01-15 18:00", driver_required: true, status: "pending" },
  { id: "3", vehicle_id: "2", vehicle_plate: "京B67890", requester: "王工", purpose: "现场勘查", start_time: "2024-01-16 08:00", end_time: "2024-01-16 17:00", driver_required: false, status: "approved" },
  { id: "4", vehicle_id: "1", vehicle_plate: "京A12345", requester: "李总", purpose: "机场接送", start_time: "2024-01-14 16:00", end_time: "2024-01-14 19:00", driver_required: true, status: "completed" },
];

// ============ 列定义 ============
const getVehicleColumns = (
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<Vehicle>[] => [
  {
    id: "plate_number",
    header: "车牌号",
    accessor: "plate_number",
    minWidth: 110,
    render: (row: Vehicle) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Car sx={{ width: 16, height: 16, color: "primary.main" }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {row.plate_number}
        </Typography>
      </Box>
    ),
  },
  {
    id: "brand",
    header: "品牌型号",
    accessor: "brand",
    minWidth: 150,
    render: (row: Vehicle) => (
      <Typography variant="body2">
        {row.brand} {row.model}
      </Typography>
    ),
  },
  {
    id: "vehicle_type",
    header: "车辆类型",
    accessor: "vehicle_type",
    minWidth: 100,
    render: (row: Vehicle) => {
      const typeLabels: Record<string, string> = {
        sedan: "轿车",
        suv: "SUV",
        van: "面包车",
        truck: "货车",
        bus: "客车",
      };
      return <Typography variant="body2">{typeLabels[row.vehicle_type]}</Typography>;
    },
  },
  {
    id: "driver",
    header: "司机",
    accessor: "driver",
    minWidth: 80,
    render: (row: Vehicle) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <User sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{row.driver || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "mileage",
    header: "里程(km)",
    accessor: "mileage",
    minWidth: 100,
    render: (row: Vehicle) => (
      <Typography variant="body2">{row.mileage?.toLocaleString() || "-"}</Typography>
    ),
  },
  {
    id: "insurance_expire",
    header: "保险到期",
    accessor: "insurance_expire",
    minWidth: 110,
    render: (row: Vehicle) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Calendar sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{row.insurance_expire || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: Vehicle) => getStatusBadge(row.status),
  },
];

const getRequestColumns = (
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<VehicleRequest>[] => [
  {
    id: "vehicle_plate",
    header: "车牌号",
    accessor: "vehicle_plate",
    minWidth: 110,
    render: (row: VehicleRequest) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {row.vehicle_plate}
      </Typography>
    ),
  },
  {
    id: "requester",
    header: "申请人",
    accessor: "requester",
    minWidth: 100,
    render: (row: VehicleRequest) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <User sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{row.requester}</Typography>
      </Box>
    ),
  },
  {
    id: "purpose",
    header: "用途",
    accessor: "purpose",
    minWidth: 120,
    render: (row: VehicleRequest) => (
      <Typography variant="body2">{row.purpose}</Typography>
    ),
  },
  {
    id: "time",
    header: "用车时间",
    accessor: "start_time",
    minWidth: 200,
    render: (row: VehicleRequest) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Clock sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">
          {row.start_time} - {row.end_time.split(" ")[1]}
        </Typography>
      </Box>
    ),
  },
  {
    id: "driver_required",
    header: "需要司机",
    accessor: "driver_required",
    minWidth: 90,
    render: (row: VehicleRequest) => (
      <Typography variant="body2">{row.driver_required ? "是" : "否"}</Typography>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: VehicleRequest) => getStatusBadge(row.status),
  },
];

// ============ 筛选配置 ============
const getVehicleFilters = (): FilterConfig[] => [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索车牌号、品牌...",
    width: 250,
  },
  {
    id: "vehicle_type",
    label: "车辆类型",
    type: "select",
    options: [
      { label: "全部类型", value: "all" },
      { label: "轿车", value: "sedan" },
      { label: "SUV", value: "suv" },
      { label: "面包车", value: "van" },
      { label: "货车", value: "truck" },
      { label: "客车", value: "bus" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部状态", value: "all" },
      { label: "可用", value: "available" },
      { label: "使用中", value: "in_use" },
      { label: "维护中", value: "maintenance" },
      { label: "停用", value: "out_of_service" },
    ],
  },
];

// ============ 组件 ============
const VehicleManagementPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // Tab状态
  const [activeTab, setActiveTab] = useState("vehicles");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<PaginatedResult<Vehicle>>({
    items: mockVehicles,
    total: mockVehicles.length,
    page: 1,
    page_size: 10,
  });
  const [requestData] = useState<PaginatedResult<VehicleRequest>>({
    items: mockRequests,
    total: mockRequests.length,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, "success" | "info" | "warning" | "error"> = {
      available: "success",
      in_use: "info",
      maintenance: "warning",
      out_of_service: "error",
      pending: "warning",
      approved: "success",
      rejected: "error",
      completed: "default",
    };
    const labels: Record<string, string> = {
      available: "可用",
      in_use: "使用中",
      maintenance: "维护中",
      out_of_service: "停用",
      pending: "待审批",
      approved: "已批准",
      rejected: "已拒绝",
      completed: "已完成",
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
        title: "车辆总数",
        value: mockVehicles.length,
        icon: <Car style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "available",
        title: "可用",
        value: mockVehicles.filter((v) => v.status === "available").length,
        icon: <CheckCircle style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "in_use",
        title: "使用中",
        value: mockVehicles.filter((v) => v.status === "in_use").length,
        icon: <Car style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
      {
        id: "maintenance",
        title: "维护中",
        value: mockVehicles.filter((v) => v.status === "maintenance").length,
        icon: <Settings style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
    ],
    [],
  );

  const vehicleColumns = useMemo(() => getVehicleColumns(getStatusBadge), [getStatusBadge]);
  const requestColumns = useMemo(() => getRequestColumns(getStatusBadge), [getStatusBadge]);
  const filterConfigs = useMemo(() => getVehicleFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.vehicle_type !== undefined) setVehicleTypeFilter(filters.vehicle_type);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  // 搜索处理
  const handleSearch = useCallback(() => {
    let filtered = [...mockVehicles];
    if (searchText) {
      filtered = filtered.filter(
        (v) =>
          v.plate_number.includes(searchText) ||
          v.brand.includes(searchText) ||
          v.model.includes(searchText)
      );
    }
    if (vehicleTypeFilter && vehicleTypeFilter !== "all") {
      filtered = filtered.filter((v) => v.vehicle_type === vehicleTypeFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }
    setVehicleData({
      items: filtered,
      total: filtered.length,
      page: 1,
      page_size: 10,
    });
  }, [searchText, vehicleTypeFilter, statusFilter]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setVehicleTypeFilter("all");
    setStatusFilter("all");
    setVehicleData({
      items: mockVehicles,
      total: mockVehicles.length,
      page: 1,
      page_size: 10,
    });
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="车辆管理"
        subtitle={`共 ${mockVehicles.length} 辆车`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            sx={{ bgcolor: "#3b82f6" }}
          >
            添加车辆
          </Button>
        }
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          车辆概览
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
            value="vehicles"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Car style={{ width: 18, height: 18 }} />
                车辆列表
              </Box>
            }
          />
          <Tab
            value="requests"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Clock style={{ width: 18, height: 18 }} />
                用车申请
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === "vehicles" && (
            <>
              <FilterBar
                filters={filterConfigs}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                onSearch={handleSearch}
              />
              <ListPageTemplate
                columns={vehicleColumns}
                data={vehicleData.items}
                loading={loading}
                pagination={{
                  page: vehicleData.page - 1,
                  pageSize: vehicleData.page_size,
                  total: vehicleData.total,
                  onPageChange: (page) =>
                    setVehicleData((prev) => ({ ...prev, page: page + 1 })),
                  onPageSizeChange: (pageSize) =>
                    setVehicleData((prev) => ({ ...prev, page_size: pageSize })),
                }}
                emptyMessage="暂无车辆数据"
              />
            </>
          )}

          {activeTab === "requests" && (
            <ListPageTemplate
              columns={requestColumns}
              data={requestData.items}
              loading={loading}
              pagination={{
                page: requestData.page - 1,
                pageSize: requestData.page_size,
                total: requestData.total,
                onPageChange: (page) =>
                  setVehicleData((prev) => ({ ...prev, page: page + 1 })),
                onPageSizeChange: (pageSize) =>
                  setVehicleData((prev) => ({ ...prev, page_size: pageSize })),
              }}
              emptyMessage="暂无用车申请"
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default VehicleManagementPageRefactored;
