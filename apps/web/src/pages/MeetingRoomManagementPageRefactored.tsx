/**
 * MeetingRoomManagementPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 使用 mock 数据
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo, type ReactElement } from "react";
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
  Calendar,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Users,
  Clock,
  CheckCircle,
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
interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  facilities: string[];
  status: "available" | "occupied" | "maintenance";
}

interface MeetingBooking {
  id: string;
  room_id: string;
  room_name: string;
  title: string;
  organizer: string;
  start_time: string;
  end_time: string;
  participants: number;
  status: "confirmed" | "pending" | "cancelled";
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============ Mock 数据 ============
const mockRooms: MeetingRoom[] = [
  { id: "1", name: "第一会议室", capacity: 20, location: "A栋3层", facilities: ["投影仪", "麦克风", "白板", "视频会议"], status: "occupied" },
  { id: "2", name: "第二会议室", capacity: 10, location: "A栋3层", facilities: ["投影仪", "白板"], status: "available" },
  { id: "3", name: "第三会议室", capacity: 6, location: "B栋2层", facilities: ["电视", "白板"], status: "available" },
  { id: "4", name: "视频会议室", capacity: 8, location: "A栋4层", facilities: ["投影仪", "麦克风", "摄像头", "视频会议系统"], status: "occupied" },
  { id: "5", name: "董事会议室", capacity: 30, location: "A栋5层", facilities: ["投影仪", "麦克风", "音响系统", "视频会议", "茶水间"], status: "maintenance" },
  { id: "6", name: "培训室", capacity: 50, location: "B栋1层", facilities: ["投影仪", "麦克风", "音响系统", "白板", "电脑"], status: "available" },
];

const mockBookings: MeetingBooking[] = [
  { id: "1", room_id: "1", room_name: "第一会议室", title: "产品评审会", organizer: "张经理", start_time: "2024-01-15 14:00", end_time: "2024-01-15 16:00", participants: 8, status: "confirmed" },
  { id: "2", room_id: "4", room_name: "视频会议室", title: "远程面试", organizer: "HR李总", start_time: "2024-01-15 15:00", end_time: "2024-01-15 17:00", participants: 4, status: "confirmed" },
  { id: "3", room_id: "2", room_name: "第二会议室", title: "技术讨论", organizer: "王工", start_time: "2024-01-15 10:00", end_time: "2024-01-15 12:00", participants: 5, status: "confirmed" },
  { id: "4", room_id: "1", room_name: "第一会议室", title: "周例会", organizer: "刘总", start_time: "2024-01-16 09:00", end_time: "2024-01-16 11:00", participants: 12, status: "pending" },
];

// ============ 列定义 ============
const getRoomColumns = (
  getStatusBadge: (status: string) => ReactElement,
): ColumnDef<MeetingRoom>[] => [
  {
    id: "name",
    header: "会议室名称",
    accessor: "name",
    minWidth: 140,
    render: (row: MeetingRoom) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Calendar sx={{ width: 16, height: 16, color: "primary.main" }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {row.name}
        </Typography>
      </Box>
    ),
  },
  {
    id: "capacity",
    header: "容纳人数",
    accessor: "capacity",
    minWidth: 100,
    render: (row: MeetingRoom) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Users sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{row.capacity} 人</Typography>
      </Box>
    ),
  },
  {
    id: "location",
    header: "位置",
    accessor: "location",
    minWidth: 120,
    render: (row: MeetingRoom) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <MapPin sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{row.location}</Typography>
      </Box>
    ),
  },
  {
    id: "facilities",
    header: "设备配置",
    accessor: "facilities",
    minWidth: 200,
    render: (row: MeetingRoom) => (
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {row.facilities.slice(0, 3).map((f, i) => (
          <Chip key={i} label={f} size="small" variant="outlined" />
        ))}
        {row.facilities.length > 3 && (
          <Chip label={`+${row.facilities.length - 3}`} size="small" />
        )}
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 110,
    render: (row: MeetingRoom) => getStatusBadge(row.status),
  },
];

const getBookingColumns = (
  getStatusBadge: (status: string) => ReactElement,
): ColumnDef<MeetingBooking>[] => [
  {
    id: "room_name",
    header: "会议室",
    accessor: "room_name",
    minWidth: 120,
    render: (row: MeetingBooking) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {row.room_name}
      </Typography>
    ),
  },
  {
    id: "title",
    header: "会议主题",
    accessor: "title",
    minWidth: 150,
    render: (row: MeetingBooking) => (
      <Typography variant="body2">{row.title}</Typography>
    ),
  },
  {
    id: "organizer",
    header: "组织者",
    accessor: "organizer",
    minWidth: 100,
    render: (row: MeetingBooking) => (
      <Typography variant="body2">{row.organizer}</Typography>
    ),
  },
  {
    id: "time",
    header: "会议时间",
    accessor: "start_time",
    minWidth: 200,
    render: (row: MeetingBooking) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Clock sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">
          {row.start_time} - {row.end_time.split(" ")[1]}
        </Typography>
      </Box>
    ),
  },
  {
    id: "participants",
    header: "参与人数",
    accessor: "participants",
    minWidth: 90,
    render: (row: MeetingBooking) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Users sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{row.participants}</Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: MeetingBooking) => getStatusBadge(row.status),
  },
];

// ============ 筛选配置 ============
const getRoomFilters = (): FilterConfig[] => [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索会议室名称...",
    width: 250,
  },
  {
    id: "capacity",
    label: "容纳人数",
    type: "select",
    options: [
      { label: "不限", value: "all" },
      { label: "10人以下", value: "small" },
      { label: "10-20人", value: "medium" },
      { label: "20人以上", value: "large" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部状态", value: "all" },
      { label: "可用", value: "available" },
      { label: "占用中", value: "occupied" },
      { label: "维护中", value: "maintenance" },
    ],
  },
];

// ============ 组件 ============
const MeetingRoomManagementPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // Tab状态
  const [activeTab, setActiveTab] = useState("rooms");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [roomData, setRoomData] = useState<PaginatedResult<MeetingRoom>>({
    items: mockRooms,
    total: mockRooms.length,
    page: 1,
    page_size: 10,
  });
  const [bookingData] = useState<PaginatedResult<MeetingBooking>>({
    items: mockBookings,
    total: mockBookings.length,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, "success" | "warning" | "error"> = {
      available: "success",
      occupied: "warning",
      maintenance: "error",
      confirmed: "success",
      pending: "warning",
      cancelled: "error",
    };
    const labels: Record<string, string> = {
      available: "可用",
      occupied: "占用中",
      maintenance: "维护中",
      confirmed: "已确认",
      pending: "待确认",
      cancelled: "已取消",
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
        title: "会议室总数",
        value: mockRooms.length,
        icon: <Calendar style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "available",
        title: "可用",
        value: mockRooms.filter((r) => r.status === "available").length,
        icon: <CheckCircle style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "occupied",
        title: "占用中",
        value: mockRooms.filter((r) => r.status === "occupied").length,
        icon: <Calendar style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        id: "maintenance",
        title: "维护中",
        value: mockRooms.filter((r) => r.status === "maintenance").length,
        icon: <Calendar style={{ width: 24, height: 24 }} />,
        color: "error" as const,
      },
    ],
    [],
  );

  const roomColumns = useMemo(() => getRoomColumns(getStatusBadge), [getStatusBadge]);
  const bookingColumns = useMemo(() => getBookingColumns(getStatusBadge), [getStatusBadge]);
  const filterConfigs = useMemo(() => getRoomFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.capacity !== undefined) setCapacityFilter(filters.capacity);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  // 搜索处理
  const handleSearch = useCallback(() => {
    let filtered = [...mockRooms];
    if (searchText) {
      filtered = filtered.filter((r) => r.name.includes(searchText));
    }
    if (capacityFilter && capacityFilter !== "all") {
      filtered = filtered.filter((r) => {
        if (capacityFilter === "small") return r.capacity < 10;
        if (capacityFilter === "medium") return r.capacity >= 10 && r.capacity <= 20;
        if (capacityFilter === "large") return r.capacity > 20;
        return true;
      });
    }
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    setRoomData({
      items: filtered,
      total: filtered.length,
      page: 1,
      page_size: 10,
    });
  }, [searchText, capacityFilter, statusFilter]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setCapacityFilter("all");
    setStatusFilter("all");
    setRoomData({
      items: mockRooms,
      total: mockRooms.length,
      page: 1,
      page_size: 10,
    });
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="会议室管理"
        subtitle={`共 ${mockRooms.length} 间会议室`}
        showBack
        onBack={() => navigate(-1)}
        rightContent={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增会议室
          </Button>
        }
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          会议室概览
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
            value="rooms"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar style={{ width: 18, height: 18 }} />
                会议室列表
              </Box>
            }
          />
          <Tab
            value="bookings"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Clock style={{ width: 18, height: 18 }} />
                预约记录
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === "rooms" && (
            <>
              <FilterBar
                filters={filterConfigs}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                onSearch={handleSearch}
              />
              <ListPageTemplate
                title="会议室列表"
                columns={roomColumns}
                data={roomData.items}
                loading={loading}
                pagination={{
                  page: roomData.page - 1,
                  pageSize: roomData.page_size,
                  total: roomData.total,
                  onPageChange: (page) =>
                    setRoomData((prev) => ({ ...prev, page: page + 1 })),
                  onPageSizeChange: (pageSize) =>
                    setRoomData((prev) => ({ ...prev, page_size: pageSize })),
                }}
                emptyMessage="暂无会议室数据"
              />
            </>
          )}

          {activeTab === "bookings" && (
            <ListPageTemplate
              title="预约记录"
              columns={bookingColumns}
              data={bookingData.items}
              loading={loading}
              pagination={{
                page: bookingData.page - 1,
                pageSize: bookingData.page_size,
                total: bookingData.total,
                onPageChange: (page) =>
                  setRoomData((prev) => ({ ...prev, page: page + 1 })),
                onPageSizeChange: (pageSize) =>
                  setRoomData((prev) => ({ ...prev, page_size: pageSize })),
              }}
              emptyMessage="暂无预约记录"
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MeetingRoomManagementPageRefactored;
