import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Award,
  Clock,
  UserPlus,
  FileText,
  Star,
  Target,
  Users2,
  Building2,
  Search,
} from "lucide-react";
import {
  trainingPlanApi,
  trainingCourseApi,
  trainingRecordApi,
  employeeApi,
  type TrainingPlan,
  type TrainingCourse,
  type TrainingRecord,
  type Employee,
} from "../api/hrm";
import { useNotification } from "../hooks/useNotification";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HrmTrainingPage: React.FC = () => {
  const { success, error } = useNotification();

  const [activeTab, setActiveTab] = useState<"plans" | "courses" | "records">(
    "plans",
  );
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(
    null,
  );
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(
    null,
  );
  const [formData, setFormData] = useState<
    Partial<TrainingPlan | TrainingCourse>
  >({});
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "plans": {
          const planRes = await trainingPlanApi.list({ page_size: 100 });
          if (planRes.code === 200) {
            setPlans(planRes.data?.items || []);
          }
          break;
        }
        case "courses": {
          const courseRes = await trainingCourseApi.list({ page_size: 100 });
          if (courseRes.code === 200) {
            setCourses(courseRes.data?.items || []);
          }
          break;
        }
        case "records": {
          const recordRes = await trainingRecordApi.list({ page_size: 100 });
          if (recordRes.code === 200) {
            setRecords(recordRes.data?.items || []);
          }
          break;
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeeApi.list({ page_size: 200 });
      if (res.code === 200) {
        setEmployees(res.data?.items || []);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  const getEmployeeName = (id?: string) => {
    if (!id) return "-";
    return employees.find((e) => e.id === id)?.name || "-";
  };

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditItem(item);
      setFormData({ ...item });
    } else {
      setEditItem(null);
      setFormData({});
    }
    setShowModal(true);
  };

  const handleViewRecord = (record: TrainingRecord) => {
    setSelectedRecord(record);
    setShowRecordModal(true);
  };

  const handleOpenEnrollModal = (course: TrainingCourse) => {
    setSelectedCourse(course);
    setShowEnrollModal(true);
  };

  const handleSave = async () => {
    try {
      let response;
      if (editItem) {
        if (activeTab === "plans") {
          response = await trainingPlanApi.update(editItem.id, formData);
        } else {
          response = await trainingCourseApi.update(editItem.id, formData);
        }
      } else {
        if (activeTab === "plans") {
          response = await trainingPlanApi.create(formData);
        } else {
          response = await trainingCourseApi.create(formData);
        }
      }

      if (response.code === 200) {
        success(editItem ? "更新成功" : "创建成功");
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      console.error("Failed to save:", err);
      error("保存失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除吗？")) return;

    try {
      let response;
      if (activeTab === "plans") {
        response = await trainingPlanApi.delete(id);
      } else if (activeTab === "courses") {
        response = await trainingCourseApi.delete(id);
      } else {
        response = await trainingRecordApi.delete(id);
      }

      if (response.code === 200) {
        success("删除成功");
        loadData();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      error("删除失败");
    }
  };

  const handleStatusChange = async (id: string, activate: boolean) => {
    try {
      const response = await (activate
        ? trainingPlanApi.activate(id)
        : trainingPlanApi.deactivate(id));
      if (response.code === 200) {
        success(activate ? "已启用" : "已停用");
        loadData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      error("操作失败");
    }
  };

  const handleEnroll = async (employeeId: string) => {
    if (!selectedCourse) return;

    try {
      const response = await trainingRecordApi.enroll(
        selectedCourse.id,
        employeeId,
      );
      if (response.code === 200) {
        success("报名成功");
        setShowEnrollModal(false);
        setSelectedCourse(null);
        loadData();
      }
    } catch (err) {
      console.error("Failed to enroll:", err);
      error("报名失败");
    }
  };

  const filteredPlans = plans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredRecords = records.filter((record) =>
    getEmployeeName(record.employee_id)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">培训管理</h1>
              <p className="text-sm text-gray-500">
                管理培训计划、课程和培训记录
              </p>
            </div>
            {activeTab !== "records" && (
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-2" />
                新增
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="space-y-6"
        >
          <TabsList className="grid w-[400px] grid-cols-3">
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              培训计划
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              培训课程
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              培训记录
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <Input
                  type="text"
                  placeholder="搜索培训计划..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[600px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          计划名称
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          代码
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          时间安排
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          预算
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPlans.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            暂无培训计划
                          </td>
                        </tr>
                      ) : (
                        filteredPlans.map((plan) => (
                          <React.Fragment key={plan.id}>
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <button
                                    onClick={() =>
                                      setExpandedPlan(
                                        expandedPlan === plan.id
                                          ? null
                                          : plan.id,
                                      )
                                    }
                                    className="mr-2 p-1 hover:bg-gray-100 rounded"
                                  >
                                    {expandedPlan === plan.id ? (
                                      <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                  </button>
                                  <span className="font-medium text-gray-900">
                                    {plan.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {plan.code || "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(plan.start_date).toLocaleDateString()}{" "}
                                ~ {new Date(plan.end_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {plan.budget
                                  ? `¥${plan.budget.toLocaleString()}`
                                  : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant={
                                    plan.status === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {plan.status === "active"
                                    ? "进行中"
                                    : "已结束"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenModal(plan)}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>编辑</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(plan.id)}
                                          className="text-red-500 hover:text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>删除</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleStatusChange(
                                              plan.id,
                                              plan.status !== "active",
                                            )
                                          }
                                        >
                                          {plan.status === "active" ? (
                                            <XCircle className="w-4 h-4 text-orange-500" />
                                          ) : (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {plan.status === "active"
                                          ? "停用"
                                          : "启用"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </td>
                            </tr>
                            {expandedPlan === plan.id && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="px-6 py-4 bg-gray-50"
                                >
                                  <div className="ml-8 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">
                                        <strong>描述:</strong>{" "}
                                        {plan.description || "-"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm text-gray-500">
                                        <strong>创建时间:</strong>{" "}
                                        {new Date(
                                          plan.created_at,
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <Input
                  type="text"
                  placeholder="搜索课程..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredCourses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">暂无培训课程</p>
                  </CardContent>
                </Card>
              ) : (
                filteredCourses.map((course) => (
                  <Card
                    key={course.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {course.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {course.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {course.code || "未设置代码"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">分类:</span>
                              <span className="ml-1 text-gray-700">
                                {course.category}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">级别:</span>
                              <span className="ml-1 text-gray-700">
                                {course.level}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">时长:</span>
                              <span className="ml-1 text-gray-700">
                                {course.duration_hours
                                  ? `${course.duration_hours}小时`
                                  : "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">讲师:</span>
                              <span className="ml-1 text-gray-700">
                                {course.instructor_name || "-"}
                              </span>
                            </div>
                          </div>
                          {course.description && (
                            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                              {course.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={
                              course.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {course.status === "active" ? "开放报名" : "已关闭"}
                          </Badge>
                          <div className="flex space-x-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenModal(course)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>编辑</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(course.id)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>删除</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {course.status === "active" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleOpenEnrollModal(course)
                                      }
                                      className="text-green-500 hover:text-green-600"
                                    >
                                      <UserPlus className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>报名</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <Input
                  type="text"
                  placeholder="搜索员工..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[600px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          员工
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          课程
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          报名日期
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          出勤状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          完成状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          成绩
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            暂无培训记录
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                                    {getEmployeeName(record.employee_id)
                                      .charAt(0)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-gray-900">
                                  {getEmployeeName(record.employee_id)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.course_id.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(
                                record.enrollment_date,
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  record.attendance_status === "attended"
                                    ? "default"
                                    : record.attendance_status === "absent"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {record.attendance_status === "attended"
                                  ? "已出勤"
                                  : record.attendance_status === "absent"
                                    ? "缺勤"
                                    : "未考勤"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  record.completion_status === "completed"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {record.completion_status === "completed"
                                  ? "已完成"
                                  : "未完成"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {record.score ? (
                                <div className="flex items-center gap-1">
                                  <Award className="w-4 h-4 text-yellow-500" />
                                  <span className="font-medium">
                                    {record.score}分
                                  </span>
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewRecord(record)}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>查看详情</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(record.id)}
                                        className="text-red-500 hover:text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>删除</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editItem ? "编辑" : "新增"}
                {activeTab === "plans" ? "培训计划" : "培训课程"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {activeTab === "plans" ? (
                <>
                  <div>
                    <Label htmlFor="plan-name">计划名称 *</Label>
                    <Input
                      id="plan-name"
                      type="text"
                      value={(formData as TrainingPlan).name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="请输入计划名称"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="plan-code">计划代码</Label>
                      <Input
                        id="plan-code"
                        type="text"
                        value={(formData as TrainingPlan).code || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value })
                        }
                        placeholder="自动生成"
                        disabled={!editItem}
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-budget">预算</Label>
                      <Input
                        id="plan-budget"
                        type="number"
                        value={
                          (formData as TrainingPlan).budget?.toString() || ""
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            budget: parseFloat(e.target.value) || undefined,
                          })
                        }
                        placeholder="请输入预算金额"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="plan-start">开始日期 *</Label>
                      <Input
                        id="plan-start"
                        type="date"
                        value={(formData as TrainingPlan).start_date || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-end">结束日期 *</Label>
                      <Input
                        id="plan-end"
                        type="date"
                        value={(formData as TrainingPlan).end_date || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="plan-description">描述</Label>
                    <textarea
                      id="plan-description"
                      value={(formData as TrainingPlan).description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      placeholder="请输入计划描述"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="course-name">课程名称 *</Label>
                    <Input
                      id="course-name"
                      type="text"
                      value={(formData as TrainingCourse).name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="请输入课程名称"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="course-category">分类 *</Label>
                      <Select
                        value={(formData as TrainingCourse).category || ""}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">技术培训</SelectItem>
                          <SelectItem value="management">管理培训</SelectItem>
                          <SelectItem value="soft_skill">软技能</SelectItem>
                          <SelectItem value="onboarding">入职培训</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="course-level">级别 *</Label>
                      <Select
                        value={(formData as TrainingCourse).level || ""}
                        onValueChange={(value) =>
                          setFormData({ ...formData, level: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择级别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">入门级</SelectItem>
                          <SelectItem value="intermediate">中级</SelectItem>
                          <SelectItem value="advanced">高级</SelectItem>
                          <SelectItem value="expert">专家级</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="course-duration">时长(小时)</Label>
                      <Input
                        id="course-duration"
                        type="number"
                        value={
                          (
                            formData as TrainingCourse
                          ).duration_hours?.toString() || ""
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration_hours:
                              parseFloat(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="course-participants">最大人数</Label>
                      <Input
                        id="course-participants"
                        type="number"
                        value={
                          (
                            formData as TrainingCourse
                          ).max_participants?.toString() || ""
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_participants:
                              parseInt(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="course-instructor">讲师</Label>
                    <Input
                      id="course-instructor"
                      type="text"
                      value={(formData as TrainingCourse).instructor_name || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          instructor_name: e.target.value,
                        })
                      }
                      placeholder="请输入讲师姓名"
                    />
                  </div>
                  <div>
                    <Label htmlFor="course-description">描述</Label>
                    <textarea
                      id="course-description"
                      value={(formData as TrainingCourse).description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      placeholder="请输入课程描述"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>{editItem ? "保存" : "创建"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showRecordModal && selectedRecord && (
        <Dialog open={showRecordModal} onOpenChange={setShowRecordModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>培训记录详情</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {getEmployeeName(selectedRecord.employee_id)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {getEmployeeName(selectedRecord.employee_id)}
                    </p>
                    <p className="text-sm text-gray-500">
                      员工ID: {selectedRecord.employee_id.substring(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">课程ID:</span>
                    <span className="text-gray-700">
                      {selectedRecord.course_id.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">报名日期:</span>
                    <span className="text-gray-700">
                      {new Date(
                        selectedRecord.enrollment_date,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">出勤状态:</span>
                    <Badge
                      variant={
                        selectedRecord.attendance_status === "attended"
                          ? "default"
                          : selectedRecord.attendance_status === "absent"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {selectedRecord.attendance_status === "attended"
                        ? "已出勤"
                        : selectedRecord.attendance_status === "absent"
                          ? "缺勤"
                          : "未考勤"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">完成状态:</span>
                    <Badge
                      variant={
                        selectedRecord.completion_status === "completed"
                          ? "default"
                          : "outline"
                      }
                    >
                      {selectedRecord.completion_status === "completed"
                        ? "已完成"
                        : "未完成"}
                    </Badge>
                  </div>
                  {selectedRecord.score && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">成绩:</span>
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">
                          {selectedRecord.score}分
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedRecord.certificate_no && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">证书编号:</span>
                      <span className="text-gray-700 font-mono">
                        {selectedRecord.certificate_no}
                      </span>
                    </div>
                  )}
                  {selectedRecord.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">完成时间:</span>
                      <span className="text-gray-700">
                        {new Date(selectedRecord.completed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedRecord.feedback && (
                    <div className="mt-3">
                      <span className="text-gray-500 block mb-1">反馈:</span>
                      <p className="text-gray-700 bg-white rounded p-2">
                        {selectedRecord.feedback}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={() => setShowRecordModal(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showEnrollModal && selectedCourse && (
        <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>报名课程: {selectedCourse.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">请选择要报名的员工:</p>
              </div>
              <div>
                <Label htmlFor="enroll-employee">员工 *</Label>
                <Select required>
                  <SelectTrigger id="enroll-employee">
                    <SelectValue placeholder="请选择员工" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.employee_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowEnrollModal(false)}
              >
                取消
              </Button>
              <Button onClick={() => handleEnroll("")}>确认报名</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default HrmTrainingPage;
