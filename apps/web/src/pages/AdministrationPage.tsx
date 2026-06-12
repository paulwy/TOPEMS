import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Calendar,
  FileText,
  Settings,
  ChevronLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Grid,
  List,
  ShoppingCart,
  ClipboardList,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Upload,
  Users2,
  Car,
  BriefcaseBusiness,
  HardHat,
  Bell,
  CircleDollarSign,
  CreditCard,
  CheckSquare,
  UserCheck,
  FileCheck,
  Send,
  CalendarDays,
  Clock12,
  AlertCircle,
  X,
  Save,
  ChevronRight,
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
} from "../api/erp";
import {
  leaveApi,
  attendanceApi,
  type LeaveRequest,
  type AttendanceRecord,
  employeeApi,
  type Employee,
} from "../api/hrm";
import MobileHeader from "../components/MobileHeader";
import MobileNav from "../components/MobileNav";

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

const AdministrationPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
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
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filterAndSortData = (
    data: Array<{ id: string; status?: string; name?: string }>,
  ) => {
    let filtered = data;
    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  };

  const paginateData = (data: any[]) => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  };

  const getTotalPages = (data: any[]) => {
    return Math.ceil(data.length / pageSize);
  };

  const handleSelectAll = (
    data: Array<{ id: string; status?: string; name?: string }>,
  ) => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item.id));
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

  const expenseClaims: ExpenseClaim[] = [
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
  ];

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

      if (
        results[0].status === "fulfilled" &&
        results[0].value.code === 200 &&
        results[0].value.data
      ) {
        const data = results[0].value.data as any;
        setEmployees(data.items || []);
      }

      if (
        results[1].status === "fulfilled" &&
        results[1].value.code === 200 &&
        results[1].value.data
      ) {
        const data = results[1].value.data as any;
        setLeaveRequests(data.items || []);
      }

      if (
        results[2].status === "fulfilled" &&
        results[2].value.code === 200 &&
        results[2].value.data
      ) {
        const data = results[2].value.data as any;
        setAttendanceRecords(data.items || []);
      }

      if (
        results[3].status === "fulfilled" &&
        results[3].value.code === 200 &&
        results[3].value.data
      ) {
        const data = results[3].value.data as any;
        setOfficeSupplies(data.items || []);
      }

      if (
        results[4].status === "fulfilled" &&
        results[4].value.code === 200 &&
        results[4].value.data
      ) {
        const data = results[4].value.data as any;
        setMeetingRooms(data.items || []);
      }

      if (
        results[5].status === "fulfilled" &&
        results[5].value.code === 200 &&
        results[5].value.data
      ) {
        const data = results[5].value.data as any;
        setMeetingBookings(data.items || []);
      }

      if (
        results[6].status === "fulfilled" &&
        results[6].value.code === 200 &&
        results[6].value.data
      ) {
        const data = results[6].value.data as any;
        setVehicles(data.items || []);
      }

      if (
        results[7].status === "fulfilled" &&
        results[7].value.code === 200 &&
        results[7].value.data
      ) {
        const data = results[7].value.data as any;
        setAnnouncements(data.items || []);
      }
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      in_stock: { variant: "bg-green-100 text-green-700", label: "库存充足" },
      low_stock: { variant: "bg-amber-100 text-amber-700", label: "库存不足" },
      out_of_stock: { variant: "bg-red-100 text-red-700", label: "已售罄" },
      available: { variant: "bg-green-100 text-green-700", label: "可用" },
      occupied: { variant: "bg-red-100 text-red-700", label: "使用中" },
      confirmed: { variant: "bg-green-100 text-green-700", label: "已确认" },
      cancelled: { variant: "bg-gray-100 text-gray-700", label: "已取消" },
      in_use: { variant: "bg-blue-100 text-blue-700", label: "使用中" },
      maintenance: {
        variant: "bg-orange-100 text-orange-700",
        label: "维护中",
      },
      active: { variant: "bg-green-100 text-green-700", label: "活跃" },
      inactive: { variant: "bg-gray-100 text-gray-700", label: "停用" },
      pending: { variant: "bg-amber-100 text-amber-700", label: "待审批" },
      approved: { variant: "bg-green-100 text-green-700", label: "已批准" },
      rejected: { variant: "bg-red-100 text-red-700", label: "已拒绝" },
      published: { variant: "bg-blue-100 text-blue-700", label: "已发布" },
      draft: { variant: "bg-gray-100 text-gray-700", label: "草稿" },
      checked_in: { variant: "bg-green-100 text-green-700", label: "已签到" },
      checked_out: { variant: "bg-blue-100 text-blue-700", label: "已签退" },
      absent: { variant: "bg-red-100 text-red-700", label: "缺勤" },
      late: { variant: "bg-orange-100 text-orange-700", label: "迟到" },
      normal: { variant: "bg-blue-100 text-blue-700", label: "普通" },
      high: { variant: "bg-red-100 text-red-700", label: "高" },
      urgent: { variant: "bg-red-100 text-red-700", label: "紧急" },
    };
    const config = badges[status] || {
      variant: "bg-gray-100 text-gray-700",
      label: status,
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.variant} transition-colors`}
      >
        {config.label}
      </span>
    );
  };

  const handleOpenModal = (type: ModalType, item?: any) => {
    setCurrentModalType(type);
    setSelectedItem(item);
    setFormData(item ? { ...item } : {});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
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
    const todayAttendance = attendanceRecords.filter((a) =>
      a.check_in_time?.includes(new Date().toISOString().split("T")[0]),
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
  }, [employees, leaveRequests, attendanceRecords]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">员工数量</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.employees}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">待审批请假</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.pendingLeaves}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">今日考勤</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.todayAttendance}
              </p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">待审批报销</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.pendingExpenses}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <CircleDollarSign className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">会议室</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.meetingRooms}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">车辆</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.vehicles}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">近期公告</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
              查看全部 <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((announcement) => (
              <div
                key={announcement.id}
                className="flex items-start justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 mb-1">
                    {announcement.title}
                  </h4>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {announcement.content}
                  </p>
                  <div className="flex items-center space-x-2 mt-2 text-xs text-slate-500">
                    <UserCheck className="w-3 h-3" />
                    <span>{announcement.author}</span>
                    <span>·</span>
                    <span>{announcement.created_at}</span>
                  </div>
                </div>
                {getStatusBadge(announcement.status)}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">今日会议</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
              查看全部 <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {meetingBookings
              .filter((b) =>
                b.start_time.includes(new Date().toISOString().split("T")[0]),
              )
              .map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-1">
                      {booking.title}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {booking.room_name} · {booking.organizer}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {booking.start_time.split(" ")[1]}
                    </p>
                    <p className="text-xs text-slate-500">
                      至 {booking.end_time.split(" ")[1]}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSupplies = () => {
    const filteredData = filterAndSortData(officeSupplies);
    const paginatedData = paginateData(filteredData);
    const totalPages = getTotalPages(filteredData);

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-slate-900">办公用品管理</h2>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="in_stock">库存充足</option>
                <option value="low_stock">库存不足</option>
                <option value="out_of_stock">已售罄</option>
              </select>
              <ChevronRight className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleExport(filteredData, "supplies")}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>
            <button
              onClick={() => handleOpenModal("create")}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">新增用品</span>
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-blue-800">
              已选择 {selectedIds.length} 条记录
            </span>
            <button
              onClick={handleBatchDelete}
              className="flex items-center space-x-1 text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>批量删除</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedData.length > 0 ? (
            paginatedData.map((supply) => (
              <div
                key={supply.id}
                className={`bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200 group ${selectedIds.includes(supply.id) ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(supply.id)}
                      onChange={() => handleSelectItem(supply.id)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <h3 className="text-lg font-semibold text-slate-900">
                      {supply.name}
                    </h3>
                  </div>
                  {getStatusBadge(supply.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">分类:</span>
                    <span className="font-medium text-slate-900">
                      {supply.category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">库存:</span>
                    <span
                      className={`font-bold ${supply.status === "low_stock" ? "text-amber-600" : supply.status === "out_of_stock" ? "text-red-600" : "text-blue-600"}`}
                    >
                      {supply.quantity} {supply.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">单价:</span>
                    <span className="text-slate-900">¥{supply.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">位置:</span>
                    <span className="text-slate-900">{supply.location}</span>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenModal("edit", supply)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-500">暂无办公用品数据</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm">
            <span className="text-sm text-slate-500">
              显示 {(currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, filteredData.length)} 条，共{" "}
              {filteredData.length} 条
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPage === page ? "bg-blue-600 text-white" : "border hover:bg-slate-50"}`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMeetings = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-slate-900">会议室管理</h2>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => handleOpenModal("create")}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">预约会议室</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {meetingRooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {room.name}
              </h3>
              {getStatusBadge(room.status)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">容量:</span>
                <span className="font-medium text-slate-900">
                  {room.capacity}人
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">位置:</span>
                <span className="text-slate-900">{room.location}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {room.facilities.map((facility, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    {facility}
                  </span>
                ))}
              </div>
            </div>
            {room.status === "available" && (
              <button className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                立即预约
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">今日会议预约</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
            查看全部 <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="space-y-3">
          {meetingBookings
            .filter((b) =>
              b.start_time.includes(new Date().toISOString().split("T")[0]),
            )
            .map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{booking.title}</p>
                  <p className="text-sm text-slate-600">
                    {booking.room_name} · {booking.organizer}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {booking.start_time.split(" ")[1]}
                  </p>
                  <p className="text-xs text-slate-500">
                    至 {booking.end_time.split(" ")[1]}
                  </p>
                </div>
                {getStatusBadge(booking.status)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderVehicles = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-slate-900">车辆管理</h2>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => handleOpenModal("create")}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">新增车辆</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {vehicle.plate_number}
              </h3>
              {getStatusBadge(vehicle.status)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">品牌型号:</span>
                <span className="font-medium text-slate-900">
                  {vehicle.brand} {vehicle.model}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">类型:</span>
                <span className="font-medium text-slate-900">
                  {vehicle.vehicle_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">驾驶员:</span>
                <span className="font-medium text-slate-900">
                  {vehicle.driver}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">上次保养:</span>
                <span className="text-slate-900">{vehicle.last_service}</span>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleOpenModal("edit", vehicle)}
                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              {vehicle.status === "available" && (
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  申请用车
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-slate-900">考勤管理</h2>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm">
          <Clock12 className="w-5 h-5" />
          <span className="font-medium">打卡</span>
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    员工
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    签到时间
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    签退时间
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.length > 0 ? (
                  attendanceRecords.slice(0, 10).map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {record.employee_name || "未知员工"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.check_in_time?.split("T")[0] || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.check_in_time?.split("T")[1]?.slice(0, 8) ||
                          "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {record.check_out_time?.split("T")[1]?.slice(0, 8) ||
                          "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(
                          record.attendance_status || "checked_in",
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">暂无考勤记录</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              今日统计
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">应到人数</span>
                <span className="text-2xl font-bold text-slate-900">
                  {employees.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">已签到</span>
                <span className="text-2xl font-bold text-green-600">
                  {stats.todayAttendance}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">出勤率</span>
                <span className="text-2xl font-bold text-blue-600">
                  {employees.length > 0
                    ? Math.round(
                        (stats.todayAttendance / employees.length) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              本月考勤趋势
            </h3>
            <div className="flex items-end justify-between h-32 space-x-1">
              {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-md hover:from-blue-600 hover:to-blue-400 transition-colors"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                ></div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              近7天出勤情况
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLeave = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-slate-900">请假管理</h2>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => handleOpenModal("create")}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">申请请假</span>
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    申请人
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    开始日期
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    结束日期
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    天数
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((leave) => (
                    <tr
                      key={leave.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {leave.employee_name || "未知员工"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.leave_type || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.start_date || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.end_date || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {leave.days || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(leave.status || "pending")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {leave.status === "pending" && (
                            <>
                              <button
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                title="批准"
                              >
                                <CheckSquare className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="拒绝"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {leave.status !== "pending" && (
                            <button
                              onClick={() => handleOpenModal("view", leave)}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="查看"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">暂无请假申请</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              统计概览
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">待审批</span>
                <span className="text-2xl font-bold text-amber-600">
                  {leaveRequests.filter((l) => l.status === "pending").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">已批准</span>
                <span className="text-2xl font-bold text-green-600">
                  {leaveRequests.filter((l) => l.status === "approved").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">已拒绝</span>
                <span className="text-2xl font-bold text-red-600">
                  {leaveRequests.filter((l) => l.status === "rejected").length}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              请假类型分布
            </h3>
            <div className="space-y-3">
              {["事假", "病假", "年假", "调休"].map((type, idx) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-slate-600">{type}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500"][idx]}`}
                        style={{ width: `${Math.random() * 60 + 20}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">
                      {Math.floor(Math.random() * 10 + 1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-slate-900">公告管理</h2>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => handleOpenModal("create")}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">发布公告</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {announcement.title}
              </h3>
              {getStatusBadge(announcement.status)}
            </div>
            <p className="text-slate-600 mb-4 line-clamp-3">
              {announcement.content}
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <UserCheck className="w-4 h-4" />
                <span>{announcement.author}</span>
                <span>·</span>
                <span>{announcement.created_at}</span>
              </div>
              <div className="flex items-center space-x-1">
                {announcement.status === "draft" && (
                  <button
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="发布"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleOpenModal("edit", announcement)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-slate-900">费用报销</h2>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => handleOpenModal("create")}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">提交报销</span>
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    报销标题
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    申请人
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    类别
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    金额
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenseClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900">
                        {claim.title}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {claim.employee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {claim.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      ¥{claim.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(claim.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {claim.status === "pending" && (
                          <>
                            <button
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="批准"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="拒绝"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {claim.status !== "pending" && (
                          <button
                            onClick={() => handleOpenModal("view", claim)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="查看"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              报销统计
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">待审批</span>
                <span className="text-2xl font-bold text-amber-600">
                  ¥
                  {expenseClaims
                    .filter((e) => e.status === "pending")
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">已批准</span>
                <span className="text-2xl font-bold text-green-600">
                  ¥
                  {expenseClaims
                    .filter((e) => e.status === "approved")
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">已拒绝</span>
                <span className="text-2xl font-bold text-red-600">
                  ¥
                  {expenseClaims
                    .filter((e) => e.status === "rejected")
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              类别分布
            </h3>
            <div className="space-y-3">
              {["差旅费", "办公费", "招待费", "培训费"].map((cat, idx) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-slate-600">{cat}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500"][idx]}`}
                        style={{ width: `${Math.random() * 60 + 20}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-500 w-16 text-right">
                      ¥{Math.floor(Math.random() * 5000 + 500).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { key: "overview", label: "概览", icon: BriefcaseBusiness },
    { key: "supplies", label: "办公用品", icon: Package },
    { key: "meetings", label: "会议室", icon: Calendar },
    { key: "vehicles", label: "车辆", icon: Car },
    { key: "attendance", label: "考勤", icon: UserCheck },
    { key: "leave", label: "请假", icon: CalendarDays },
    { key: "announcements", label: "公告", icon: Bell },
    { key: "expenses", label: "报销", icon: CircleDollarSign },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <MobileHeader
        title="行政管理"
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 mobile-only"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-14 left-0 right-0 bg-white max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">菜单</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {tabs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveTab(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        activeTab === item.key
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-slate-600" />
              </button>
              <h1 className="text-2xl font-bold text-slate-900">行政管理</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    activeTab === item.key
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
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
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {currentModalType === "create"
                  ? "创建"
                  : currentModalType === "edit"
                    ? "编辑"
                    : "查看"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    名称
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={currentModalType === "view"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="请输入名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    disabled={currentModalType === "view"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    rows={3}
                    placeholder="请输入描述"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 p-4 border-t">
              {currentModalType !== "view" && (
                <>
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    保存
                  </button>
                </>
              )}
              {currentModalType === "view" && (
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdministrationPage;
