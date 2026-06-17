import { Grid } from "@/components/Grid";
import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Divider,
  InputAdornment,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Checkbox,
} from "@mui/material";
import {
  Package2 as Package,
  Calendar,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  ShoppingCart,
  Users,
  XCircle,
  Clock,
  Filter,
  Download,
  Car,
  Briefcase,
  Bell,
  DollarSign as AttachMoney,
  CheckSquare,
  UserCheck,
  Send,
  CalendarDays as EventNote,
  Clock as AccessTime,
  X,
  ChevronRight,
  MoreHorizontal as MoreVert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import {
  officeSupplyApi,
  meetingRoomApi,
  meetingBookingApi,
  vehicleApi,
  announcementApi,
  type OfficeSupply,
  type MeetingRoom,
  type MeetingBooking,
  type Vehicle,
  type Announcement,
} from "@/api/erp";
import {
  leaveApi,
  attendanceApi,
  type LeaveRequest,
  type AttendanceRecord,
  employeeApi,
  type Employee,
} from "@/api/hrm";

interface ExpenseClaim {
  id: string;
  title: string;
  amount: number;
  category: string;
  employee: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

type TabType =
  | "overview"
  | "supplies"
  | "meetings"
  | "vehicles"
  | "attendance"
  | "leave"
  | "announcements"
  | "expenses";

type ModalType = "create" | "edit" | "view";

const STATUS_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  in_stock: { bg: "success.light", color: "success.dark", label: "库存充足" },
  low_stock: { bg: "warning.light", color: "warning.dark", label: "库存不足" },
  out_of_stock: { bg: "error.light", color: "error.dark", label: "已售罄" },
  available: { bg: "success.light", color: "success.dark", label: "可用" },
  occupied: { bg: "error.light", color: "error.dark", label: "使用中" },
  confirmed: { bg: "success.light", color: "success.dark", label: "已确认" },
  cancelled: { bg: "grey.200", color: "grey.700", label: "已取消" },
  in_use: { bg: "info.light", color: "info.dark", label: "使用中" },
  maintenance: { bg: "warning.light", color: "warning.dark", label: "维护中" },
  active: { bg: "success.light", color: "success.dark", label: "活跃" },
  inactive: { bg: "grey.200", color: "grey.700", label: "停用" },
  pending: { bg: "warning.light", color: "warning.dark", label: "待审批" },
  approved: { bg: "success.light", color: "success.dark", label: "已批准" },
  rejected: { bg: "error.light", color: "error.dark", label: "已拒绝" },
  published: { bg: "info.light", color: "info.dark", label: "已发布" },
  draft: { bg: "grey.200", color: "grey.700", label: "草稿" },
  checked_in: { bg: "success.light", color: "success.dark", label: "已签到" },
  checked_out: { bg: "info.light", color: "info.dark", label: "已签退" },
  absent: { bg: "error.light", color: "error.dark", label: "缺勤" },
  late: { bg: "warning.light", color: "warning.dark", label: "迟到" },
  normal: { bg: "info.light", color: "info.dark", label: "普通" },
  high: { bg: "error.light", color: "error.dark", label: "高" },
  urgent: { bg: "error.light", color: "error.dark", label: "紧急" },
};

const AdministrationPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [officeSupplies, setOfficeSupplies] = useState<OfficeSupply[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [meetingBookings, setMeetingBookings] = useState<MeetingBooking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [currentModalType, setCurrentModalType] = useState<ModalType>("create");
  const [formData, setFormData] = useState<any>({});

  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const expenseClaims: ExpenseClaim[] = useMemo(
    () => [
      {
        id: "1",
        title: "差旅费报销",
        amount: 2580,
        category: "差旅费",
        employee: "张三",
        status: "approved",
        created_at: "2026-05-20",
      },
      {
        id: "2",
        title: "办公用品采购",
        amount: 850,
        category: "办公费",
        employee: "李四",
        status: "pending",
        created_at: "2026-05-25",
      },
      {
        id: "3",
        title: "业务招待费",
        amount: 1200,
        category: "招待费",
        employee: "王五",
        status: "rejected",
        created_at: "2026-05-24",
      },
      {
        id: "4",
        title: "培训费用",
        amount: 3500,
        category: "培训费",
        employee: "赵六",
        status: "pending",
        created_at: "2026-05-26",
      },
    ],
    [],
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises = [
        employeeApi.list(),
        leaveApi.list(),
        attendanceApi.list(),
        officeSupplyApi.list(),
        meetingRoomApi.list(),
        meetingBookingApi.list(),
        vehicleApi.list(),
        announcementApi.list(),
      ];

      const results = await Promise.allSettled(promises);

      const setIfFulfilled = (idx: number, setter: (data: any[]) => void) => {
        if (
          results[idx].status === "fulfilled" &&
          (results[idx] as any).value.code === 200 &&
          (results[idx] as any).value.data
        ) {
          const data = (results[idx] as any).value.data;
          setter(data.items || []);
        }
      };

      setIfFulfilled(0, setEmployees);
      setIfFulfilled(1, setLeaveRequests);
      setIfFulfilled(2, setAttendanceRecords);
      setIfFulfilled(3, setOfficeSupplies);
      setIfFulfilled(4, setMeetingRooms);
      setIfFulfilled(5, setMeetingBookings);
      setIfFulfilled(6, setVehicles);
      setIfFulfilled(7, setAnnouncements);
    } catch (err: any) {
      console.error("加载数据失败:", err);
      if (err.response?.status === 401) {
        addNotification({
          title: "认证失败",
          message: "请先登录后再访问行政管理系统",
          type: "error",
        });
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBatchDelete = () => {
    addNotification({
      title: "删除成功",
      message: `已删除 ${selectedIds.length} 条记录`,
      type: "success",
    });
    setSelectedIds([]);
  };

  const handleExport = (data: any[], type: string) => {
    addNotification({
      title: "导出成功",
      message: `已导出 ${data.length} 条${type}数据`,
      type: "success",
    });
  };

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = STATUS_STYLES[status] || {
      bg: "grey.200",
      color: "grey.700",
      label: status,
    };
    return (
      <Chip
        size="small"
        label={config.label}
        sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
      />
    );
  };

  const handleOpenModal = (type: ModalType, item?: any) => {
    setCurrentModalType(type);
    setFormData(item ? { ...item } : {});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({});
  };

  const handleSave = () => {
    addNotification({
      title: "操作成功",
      message: `${currentModalType === "create" ? "创建" : "更新"}成功`,
      type: "success",
    });
    handleCloseModal();
  };

  const stats = useMemo(() => {
    const pendingLeaves = leaveRequests.filter(
      (l) => l.status === "pending",
    ).length;
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = attendanceRecords.filter((a) =>
      a.check_in_time?.includes(today),
    ).length;
    const pendingExpenses = expenseClaims.filter(
      (e) => e.status === "pending",
    ).length;

    return {
      employees: employees.length,
      vehicles: vehicles.length,
      meetingRooms: meetingRooms.length,
      officeSupplies: officeSupplies.length,
      pendingLeaves,
      todayAttendance,
      pendingExpenses,
    };
  }, [employees, leaveRequests, attendanceRecords, expenseClaims]);

  const renderOverview = () => (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        {[
          {
            label: "员工数量",
            value: stats.employees,
            color: "purple",
            icon: <Users />,
            bg: "#f3e8ff",
          },
          {
            label: "待审批请假",
            value: stats.pendingLeaves,
            color: "orange",
            icon: <EventNote />,
            bg: "#ffedd5",
          },
          {
            label: "今日考勤",
            value: stats.todayAttendance,
            color: "teal",
            icon: <UserCheck />,
            bg: "#ccfbf1",
          },
          {
            label: "待审批报销",
            value: stats.pendingExpenses,
            color: "indigo",
            icon: <AttachMoney />,
            bg: "#e0e7ff",
          },
          {
            label: "会议室",
            value: stats.meetingRooms,
            color: "blue",
            icon: <Calendar />,
            bg: "#dbeafe",
          },
          {
            label: "车辆",
            value: stats.vehicles,
            color: "red",
            icon: <Car />,
            bg: "#fee2e2",
          },
        ].map((stat) => (
          <Grid item xs={6} sm={4} md={2} key={stat.label}>
            <Card
              sx={{
                boxShadow: 1,
                p: 2.5,
                borderRadius: 2,
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
                    {stat.value}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: stat.bg,
                    color: `${stat.color}.600`,
                    width: 48,
                    height: 48,
                  }}
                >
                  {stat.icon}
                </Avatar>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
                  近期公告
                </Typography>
                <Button
                  size="small"
                  endIcon={<ChevronRight fontSize="small" />}
                  sx={{ color: "primary.main" }}
                >
                  查看全部
                </Button>
              </Box>
              <Stack spacing={1.5}>
                {announcements.slice(0, 3).map((announcement) => (
                  <Box
                    key={announcement.id}
                    sx={{
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 2,
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      "&:hover": { bgcolor: "grey.100" },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          component="div"
                          sx={{ mb: 0.5, fontWeight: "medium" }}
                        >
                          {announcement.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {announcement.content}
                        </Typography>
                        <Stack
                          component="div"
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: "center", mt: 1 }}
                        >
                          <UserCheck
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {announcement.author}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ·
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {announcement.created_at}
                          </Typography>
                        </Stack>
                      </Box>
                      <StatusBadge status={announcement.status} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
                  今日会议
                </Typography>
                <Button
                  size="small"
                  endIcon={<ChevronRight fontSize="small" />}
                  sx={{ color: "primary.main" }}
                >
                  查看全部
                </Button>
              </Box>
              <Stack spacing={1.5}>
                {meetingBookings
                  .filter((b) =>
                    b.start_time.includes(
                      new Date().toISOString().split("T")[0],
                    ),
                  )
                  .map((booking) => (
                    <Box
                      key={booking.id}
                      sx={{
                        p: 2,
                        bgcolor: "grey.50",
                        borderRadius: 2,
                        cursor: "pointer",
                        transition: "background-color 0.2s",
                        "&:hover": { bgcolor: "grey.100" },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            component="div"
                            sx={{ mb: 0.5, fontWeight: "medium" }}
                          >
                            {booking.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {booking.room_name} · {booking.organizer}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" component="div" sx={{ fontWeight: "medium" }}>
                            {booking.start_time.split(" ")[1]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            至 {booking.end_time.split(" ")[1]}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );

  const renderSupplies = () => {
    const filteredData = officeSupplies.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      return true;
    });
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginatedData = filteredData.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    );

    return (
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} component="div" sx={{ alignItems: "center" }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
              办公用品管理
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="all">全部状态</MenuItem>
                <MenuItem value="in_stock">库存充足</MenuItem>
                <MenuItem value="low_stock">库存不足</MenuItem>
                <MenuItem value="out_of_stock">已售罄</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExport(filteredData, "supplies")}
            >
              导出
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus />}
              onClick={() => handleOpenModal("create")}
            >
              新增用品
            </Button>
          </Stack>
        </Box>

        {selectedIds.length > 0 && (
          <Box
            sx={{
              bgcolor: "primary.50",
              border: 1,
              borderColor: "primary.200",
              borderRadius: 1,
              p: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography color="primary.dark">
              已选择 {selectedIds.length} 条记录
            </Typography>
            <Button
              color="error"
              size="small"
              startIcon={<Trash2 />}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
          </Box>
        )}

        <Grid container spacing={2}>
          {paginatedData.length > 0 ? (
            paginatedData.map((supply) => (
              <Grid item xs={12} md={6} lg={4} key={supply.id}>
                <Card
                  sx={{
                    p: 2.5,
                    boxShadow: 1,
                    borderRadius: 2,
                    transition: "all 0.2s",
                    "&:hover": { boxShadow: 3 },
                    ...(selectedIds.includes(supply.id) && {
                      boxShadow: "0 0 0 2px",
                      boxShadowColor: "primary.main",
                    }),
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Stack direction="row" spacing={1} component="div" sx={{ alignItems: "center" }}>
                      <Checkbox
                        checked={selectedIds.includes(supply.id)}
                        onChange={() => handleSelectItem(supply.id)}
                        size="small"
                      />
                      <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
                        {supply.name}
                      </Typography>
                    </Stack>
                    <StatusBadge status={supply.status} />
                  </Box>
                  <Stack spacing={1}>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        分类:
                      </Typography>
                      <Typography variant="body2" component="div" sx={{ fontWeight: "medium" }}>
                        {supply.category}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        库存:
                      </Typography>
                      <Typography
                        variant="body2"
                        component="div"
                        sx={{
                          fontWeight: "bold",
                          color:
                            supply.status === "low_stock"
                              ? "warning.main"
                              : supply.status === "out_of_stock"
                                ? "error.main"
                                : "primary.main",
                        }}
                      >
                        {supply.quantity} {supply.unit}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        单价:
                      </Typography>
                      <Typography variant="body2">¥{supply.price}</Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        位置:
                      </Typography>
                      <Typography variant="body2">{supply.location}</Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}
                  >
                    <Tooltip title="编辑">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenModal("edit", supply)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" color="error">
                        <Trash2 fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: "grey.100",
                    color: "grey.400",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <ShoppingCart sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography color="text.secondary">暂无办公用品数据</Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {totalPages > 1 && (
          <Card sx={{ p: 1.5, boxShadow: 1, borderRadius: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                显示 {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filteredData.length)} 条，共{" "}
                {filteredData.length} 条
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  上一页
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      size="small"
                      variant={currentPage === page ? "contained" : "outlined"}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  size="small"
                  variant="outlined"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  下一页
                </Button>
              </Stack>
            </Box>
          </Card>
        )}
      </Stack>
    );
  };

  const renderMeetings = () => (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} component="div" sx={{ alignItems: "center" }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
            会议室管理
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <Filter />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => handleOpenModal("create")}
        >
          预约会议室
        </Button>
      </Box>

      <Grid container spacing={2}>
        {meetingRooms.map((room) => (
          <Grid item xs={12} sm={6} md={3} key={room.id}>
            <Card
              sx={{
                p: 2.5,
                boxShadow: 1,
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": { boxShadow: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
                  {room.name}
                </Typography>
                <StatusBadge status={room.status} />
              </Box>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    容量:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ fontWeight: "medium" }}>
                    {room.capacity}人
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    位置:
                  </Typography>
                  <Typography variant="body2">{room.location}</Typography>
                </Box>
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}
                >
                  {room.facilities?.map((facility, idx) => (
                    <Chip
                      key={idx}
                      label={facility}
                      size="small"
                      sx={{
                        bgcolor: "grey.100",
                        color: "text.primary",
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Box>
              </Stack>
              {room.status === "available" && (
                <Button variant="contained" fullWidth sx={{ mt: 2 }}>
                  立即预约
                </Button>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
              今日会议预约
            </Typography>
            <Button
              size="small"
              endIcon={<ChevronRight fontSize="small" />}
              sx={{ color: "primary.main" }}
            >
              查看全部
            </Button>
          </Box>
          <Stack spacing={1.5}>
            {meetingBookings
              .filter((b) =>
                b.start_time.includes(new Date().toISOString().split("T")[0]),
              )
              .map((booking) => (
                <Box
                  key={booking.id}
                  sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: "grey.100" },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" component="div" sx={{ fontWeight: "medium" }}>
                        {booking.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.room_name} · {booking.organizer}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right", mr: 2 }}>
                      <Typography variant="body2" component="div" sx={{ fontWeight: "medium" }}>
                        {booking.start_time.split(" ")[1]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        至 {booking.end_time.split(" ")[1]}
                      </Typography>
                    </Box>
                    <StatusBadge status={booking.status} />
                  </Box>
                </Box>
              ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderVehicles = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} component="div" sx={{ alignItems: "center" }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
            车辆管理
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <Filter />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => handleOpenModal("create")}
        >
          新增车辆
        </Button>
      </Box>
      <Grid container spacing={2}>
        {vehicles.map((vehicle) => (
          <Grid item xs={12} md={6} lg={4} key={vehicle.id}>
            <Card
              sx={{
                p: 2.5,
                boxShadow: 1,
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": { boxShadow: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
                  {vehicle.plate_number}
                </Typography>
                <StatusBadge status={vehicle.status} />
              </Box>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    品牌型号:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ fontWeight: "medium" }}>
                    {vehicle.brand} {vehicle.model}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    类型:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ fontWeight: "medium" }}>
                    {vehicle.vehicle_type}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    驾驶员:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ fontWeight: "medium" }}>
                    {vehicle.driver}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    上次保养:
                  </Typography>
                  <Typography variant="body2">
                    {vehicle.last_service}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Tooltip title="编辑">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenModal("edit", vehicle)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                {vehicle.status === "available" && (
                  <Button variant="contained" color="success" size="small">
                    申请用车
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );

  const renderAttendance = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Stack component="div" direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
            考勤管理
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <Filter />
          </IconButton>
        </Stack>
        <Button variant="contained" color="success" startIcon={<AccessTime />}>
          打卡
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ boxShadow: 1, borderRadius: 2, overflow: "hidden" }}>
            <TableContainer component={Box} sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead sx={{ bgcolor: "grey.50" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      员工
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      日期
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      签到时间
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      签退时间
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      状态
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.slice(0, 10).map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          {record.employee_name || "未知员工"}
                        </TableCell>
                        <TableCell>
                          {record.check_in_time?.split("T")[0] || "-"}
                        </TableCell>
                        <TableCell>
                          {record.check_in_time?.split("T")[1]?.slice(0, 8) ||
                            "-"}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time?.split("T")[1]?.slice(0, 8) ||
                            "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={record.attendance_status || "checked_in"}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ textAlign: "center", py: 8 }}
                      >
                        <Avatar
                          sx={{
                            width: 64,
                            height: 64,
                            bgcolor: "grey.100",
                            color: "grey.400",
                            mx: "auto",
                            mb: 2,
                          }}
                        >
                          <Clock sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Typography color="text.secondary">
                          暂无考勤记录
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={2}>
            <Card sx={{ p: 2.5, boxShadow: 1, borderRadius: 2 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: "bold", mb: 2 }}>
                今日统计
              </Typography>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">应到人数</Typography>
                  <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
                    {employees.length}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">已签到</Typography>
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ fontWeight: "bold" }}
                    color="success.main"
                  >
                    {stats.todayAttendance}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">出勤率</Typography>
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ fontWeight: "bold" }}
                    color="primary.main"
                  >
                    {employees.length > 0
                      ? Math.round(
                          (stats.todayAttendance / employees.length) * 100,
                        )
                      : 0}
                    %
                  </Typography>
                </Box>
              </Stack>
            </Card>
            <Card sx={{ p: 2.5, boxShadow: 1, borderRadius: 2 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: "bold", mb: 2 }}>
                本月考勤趋势
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  height: 128,
                  gap: 0.5,
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      flex: 1,
                      height: `${Math.random() * 80 + 20}%`,
                      background: "linear-gradient(to top, #3b82f6, #93c5fd)",
                      borderRadius: "4px 4px 0 0",
                      transition: "background 0.2s",
                      "&:hover": {
                        background: "linear-gradient(to top, #2563eb, #60a5fa)",
                      },
                    }}
                  />
                ))}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, textAlign: "center" }}
              >
                近7天出勤情况
              </Typography>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );

  const renderLeave = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} component="div" sx={{ alignItems: "center" }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
            请假管理
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <Filter />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => handleOpenModal("create")}
        >
          申请请假
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ boxShadow: 1, borderRadius: 2, overflow: "hidden" }}>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead sx={{ bgcolor: "grey.50" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      申请人
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      类型
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      开始日期
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      结束日期
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      天数
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveRequests.length > 0 ? (
                    leaveRequests.map((leave) => (
                      <TableRow key={leave.id} hover>
                        <TableCell>
                          {leave.employee_name || "未知员工"}
                        </TableCell>
                        <TableCell>{leave.leave_type || "-"}</TableCell>
                        <TableCell>{leave.start_date || "-"}</TableCell>
                        <TableCell>{leave.end_date || "-"}</TableCell>
                        <TableCell>{leave.days || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={leave.status || "pending"} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {leave.status === "pending" && (
                              <>
                                <Tooltip title="批准">
                                  <IconButton size="small" color="success">
                                    <CheckSquare fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="拒绝">
                                  <IconButton size="small" color="error">
                                    <XCircle fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {leave.status !== "pending" && (
                              <Tooltip title="查看">
                                <IconButton
                                  size="small"
                                  sx={{ color: "text.secondary" }}
                                  onClick={() => handleOpenModal("view", leave)}
                                >
                                  <Eye fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", py: 8 }}
                      >
                        <Avatar
                          sx={{
                            width: 64,
                            height: 64,
                            bgcolor: "grey.100",
                            color: "grey.400",
                            mx: "auto",
                            mb: 2,
                          }}
                        >
                          <Calendar sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Typography color="text.secondary">
                          暂无请假申请
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={2}>
            <Card sx={{ p: 2.5, boxShadow: 1, borderRadius: 2 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: "bold", mb: 2 }}>
                统计概览
              </Typography>
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">待审批</Typography>
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ fontWeight: "bold" }}
                    color="warning.main"
                  >
                    {leaveRequests.filter((l) => l.status === "pending").length}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">已批准</Typography>
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ fontWeight: "bold" }}
                    color="success.main"
                  >
                    {
                      leaveRequests.filter((l) => l.status === "approved")
                        .length
                    }
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">已拒绝</Typography>
                  <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }} color="error.main">
                    {
                      leaveRequests.filter((l) => l.status === "rejected")
                        .length
                    }
                  </Typography>
                </Box>
              </Stack>
            </Card>
            <Card sx={{ p: 2.5, boxShadow: 1, borderRadius: 2 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: "bold", mb: 2 }}>
                请假类型分布
              </Typography>
              <Stack spacing={1.5}>
                {["事假", "病假", "年假", "调休"].map((type, idx) => (
                  <Box
                    key={type}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {type}
                    </Typography>
                    <Stack direction="row" spacing={1} component="div" sx={{ alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 96,
                          bgcolor: "grey.200",
                          borderRadius: 5,
                          height: 10,
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            borderRadius: 5,
                            width: `${Math.random() * 60 + 20}%`,
                            bgcolor: [
                              "primary.main",
                              "success.main",
                              "warning.main",
                              "secondary.main",
                            ][idx],
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ width: 32, textAlign: "right" }}
                      >
                        {Math.floor(Math.random() * 10 + 1)}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );

  const renderAnnouncements = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Stack component="div" direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
            公告管理
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <Filter />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => handleOpenModal("create")}
        >
          发布公告
        </Button>
      </Box>
      <Grid container spacing={2}>
        {announcements.map((announcement) => (
          <Grid item xs={12} md={6} lg={4} key={announcement.id}>
            <Card
              sx={{
                p: 2.5,
                boxShadow: 1,
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": { boxShadow: 3 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    fontWeight: "bold",
                    transition: "color 0.2s",
                    "&:hover": { color: "primary.main" },
                  }}
                >
                  {announcement.title}
                </Typography>
                <StatusBadge status={announcement.status} />
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {announcement.content}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Stack component="div" direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <UserCheck sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">
                    {announcement.author}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ·
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {announcement.created_at}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {announcement.status === "draft" && (
                    <Tooltip title="发布">
                      <IconButton size="small" color="primary">
                        <Send fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="编辑">
                    <IconButton
                      size="small"
                      sx={{ color: "text.secondary" }}
                      onClick={() => handleOpenModal("edit", announcement)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error">
                      <Trash2 fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );

  const renderExpenses = () => (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Stack component="div" direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Typography component="div" variant="h5" sx={{ fontWeight: "bold" }}>
            费用报销
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <Filter />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => handleOpenModal("create")}
        >
          提交报销
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ boxShadow: 1, borderRadius: 2, overflow: "hidden" }}>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead sx={{ bgcolor: "grey.50" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      报销标题
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      申请人
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      类别
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      金额
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenseClaims.map((claim) => (
                    <TableRow key={claim.id} hover>
                      <TableCell>
                        <Typography component="div" sx={{ fontWeight: "medium" }}>
                          {claim.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{claim.employee}</TableCell>
                      <TableCell>{claim.category}</TableCell>
                      <TableCell>
                        <Typography>
                          ¥{claim.amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={claim.status} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {claim.status === "pending" && (
                            <>
                              <Tooltip title="批准">
                                <IconButton size="small" color="success">
                                  <CheckSquare fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="拒绝">
                                <IconButton size="small" color="error">
                                  <XCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {claim.status !== "pending" && (
                            <Tooltip title="查看">
                              <IconButton
                                size="small"
                                sx={{ color: "text.secondary" }}
                                onClick={() => handleOpenModal("view", claim)}
                              >
                                <Eye fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={2}>
            <Card sx={{ p: 2.5, boxShadow: 1, borderRadius: 2 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: "bold", mb: 2 }}>
                报销统计
              </Typography>
              <Stack spacing={1.5}>
                {[
                  { label: "待审批", status: "pending", color: "warning.main" },
                  {
                    label: "已批准",
                    status: "approved",
                    color: "success.main",
                  },
                  { label: "已拒绝", status: "rejected", color: "error.main" },
                ].map((item) => (
                  <Box
                    key={item.status}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography color="text.secondary">{item.label}</Typography>
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ fontWeight: "bold" }}
                      color={item.color}
                    >
                      ¥
                      {expenseClaims
                        .filter((e) => e.status === item.status)
                        .reduce((sum, e) => sum + e.amount, 0)
                        .toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Card>
            <Card sx={{ p: 2.5, boxShadow: 1, borderRadius: 2 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: "bold", mb: 2 }}>
                类别分布
              </Typography>
              <Stack spacing={1.5}>
                {["差旅费", "办公费", "招待费", "培训费"].map((cat, idx) => (
                  <Box
                    key={cat}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {cat}
                    </Typography>
                    <Stack direction="row" spacing={1} component="div" sx={{ alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 96,
                          bgcolor: "grey.200",
                          borderRadius: 5,
                          height: 10,
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            borderRadius: 5,
                            width: `${Math.random() * 60 + 20}%`,
                            bgcolor: [
                              "primary.main",
                              "success.main",
                              "warning.main",
                              "secondary.main",
                            ][idx],
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ width: 64, textAlign: "right" }}
                      >
                        ¥
                        {Math.floor(
                          Math.random() * 5000 + 500,
                        ).toLocaleString()}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );

  const tabs = [
    { key: "overview", label: "概览", icon: <Briefcase /> },
    { key: "supplies", label: "办公用品", icon: <Package /> },
    { key: "meetings", label: "会议室", icon: <Calendar /> },
    { key: "vehicles", label: "车辆", icon: <Car /> },
    { key: "attendance", label: "考勤", icon: <UserCheck /> },
    { key: "leave", label: "请假", icon: <EventNote /> },
    { key: "announcements", label: "公告", icon: <Bell /> },
    { key: "expenses", label: "报销", icon: <AttachMoney /> },
  ] as const;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6">行政管理</Typography>
        <IconButton onClick={() => setMobileMenuOpen(true)}>
          <MoreVert />
        </IconButton>
      </Box>

      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <Box sx={{ width: 280, p: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Typography variant="h6">菜单</Typography>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <X />
            </IconButton>
          </Box>
          <List>
            {tabs.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton
                  selected={activeTab === item.key}
                  onClick={() => {
                    setActiveTab(item.key);
                    setMobileMenuOpen(false);
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Stack component="div" direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <IconButton onClick={() => navigate(-1)}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h4" component="div" sx={{ fontWeight: "bold" }}>
              行政管理
            </Typography>
          </Stack>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        >
          {tabs.map((item) => (
            <Tab
              key={item.key}
              value={item.key}
              label={item.label}
              icon={item.icon}
              iconPosition="start"
              sx={{ minHeight: 48, fontWeight: 500 }}
            />
          ))}
        </Tabs>

        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={400} />
          </Stack>
        ) : (
          <>
            {activeTab === "overview" && renderOverview()}
            {activeTab === "supplies" && renderSupplies()}
            {activeTab === "meetings" && renderMeetings()}
            {activeTab === "vehicles" && renderVehicles()}
            {activeTab === "attendance" && renderAttendance()}
            {activeTab === "leave" && renderLeave()}
            {activeTab === "announcements" && renderAnnouncements()}
            {activeTab === "expenses" && renderExpenses()}
          </>
        )}
      </Box>

      <Dialog
        open={showModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6">
              {currentModalType === "create"
                ? "创建"
                : currentModalType === "edit"
                  ? "编辑"
                  : "查看"}
            </Typography>
            <IconButton onClick={handleCloseModal}>
              <X />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="名称"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={currentModalType === "view"}
              placeholder="请输入名称"
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={currentModalType === "view"}
              multiline
              rows={3}
              placeholder="请输入描述"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          {currentModalType !== "view" && (
            <>
              <Button onClick={handleCloseModal}>取消</Button>
              <Button variant="contained" onClick={handleSave}>
                保存
              </Button>
            </>
          )}
          {currentModalType === "view" && (
            <Button variant="contained" onClick={handleCloseModal}>
              关闭
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdministrationPage;
