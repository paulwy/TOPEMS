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
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  trainingPlanApi,
  trainingCourseApi,
  trainingRecordApi,
  employeeApi,
  type TrainingPlan,
  type TrainingCourse,
  type TrainingRecord,
  type Employee,
} from "@/api/hrm";
import { useNotification } from "@/hooks/useNotification";
import { PageHeader } from "@/components/templates";

import {
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Avatar,
  Box,
  Tabs,
  Tab,
  IconButton,
  Typography,
  FormLabel,
} from "@mui/material";

const HrmTrainingPage: React.FC = () => {
  const { success, error } = useNotification();
  const navigate = useNavigate();

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
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "grey.100",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            animation: "spin 1s linear infinite",
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: 4,
            borderColor: "primary.main",
            borderTopColor: "transparent",
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <Box
        sx={{ maxWidth: 1536, mx: "auto", px: { xs: 2, sm: 3, md: 4 }, py: 3 }}
      >
        <PageHeader
          title="培训管理"
          subtitle="管理培训计划、课程和培训记录"
          breadcrumbs={[
            { label: "人力资源", href: "/hrm" },
            { label: "培训管理" },
          ]}
          backButton={{ onClick: () => navigate(-1) }}
          actions={
            activeTab !== "records"
              ? [
                  {
                    label: "新增",
                    icon: <Plus sx={{ width: 16, height: 16, mr: 1 }} />,
                    onClick: () => handleOpenModal(),
                    variant: "contained",
                  },
                ]
              : []
          }
        />
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as typeof activeTab)}
          >
            <Tab
              value="plans"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Calendar sx={{ width: 16, height: 16 }} />
                  培训计划
                </Box>
              }
            />
            <Tab
              value="courses"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <BookOpen sx={{ width: 16, height: 16 }} />
                  培训课程
                </Box>
              }
            />
            <Tab
              value="records"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Users sx={{ width: 16, height: 16 }} />
                  培训记录
                </Box>
              }
            />
          </Tabs>
        </Box>

        {activeTab === "plans" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ position: "relative", width: 256 }}>
                <Search
                  sx={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "grey.400",
                    width: 16,
                    height: 16,
                  }}
                  size={16}
                />
                <TextField
                  size="small"
                  type="text"
                  placeholder="搜索培训计划..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ width: "100%", "& .MuiOutlinedInput-root": { pl: 4 } }}
                />
              </Box>
            </Box>

            <Card>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ maxHeight: 600, overflow: "auto" }}>
                  <table style={{ width: "100%" }}>
                    <thead
                      style={{
                        backgroundColor: "rgb(249, 250, 251)",
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          计划名称
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          代码
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          时间安排
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          预算
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          状态
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      style={{
                        backgroundColor: "white",
                        borderTop: "1px solid rgb(229, 231, 235)",
                      }}
                    >
                      {filteredPlans.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              paddingLeft: 24,
                              paddingRight: 24,
                              paddingTop: 32,
                              paddingBottom: 32,
                              textAlign: "center",
                              color: "#6b7280",
                            }}
                          >
                            <Typography
                              sx={{
                                px: 6,
                                py: 8,
                                textAlign: "center",
                                color: "grey.500",
                              }}
                            >
                              暂无培训计划
                            </Typography>
                          </td>
                        </tr>
                      ) : (
                        filteredPlans.map((plan) => (
                          <React.Fragment key={plan.id}>
                            <tr
                              style={{
                                borderBottom: "1px solid rgb(229, 231, 235)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "16px 24px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Box
                                  sx={{ display: "flex", alignItems: "center" }}
                                >
                                  <Box
                                    component="button"
                                    onClick={() =>
                                      setExpandedPlan(
                                        expandedPlan === plan.id
                                          ? null
                                          : plan.id,
                                      )
                                    }
                                    sx={{
                                      mr: 1,
                                      p: 0.5,
                                      borderRadius: 1,
                                      "&:hover": { bgcolor: "grey.100" },
                                    }}
                                  >
                                    {expandedPlan === plan.id ? (
                                      <ChevronUp
                                        sx={{
                                          width: 16,
                                          height: 16,
                                          color: "grey.400",
                                        }}
                                      />
                                    ) : (
                                      <ChevronDown
                                        sx={{
                                          width: 16,
                                          height: 16,
                                          color: "grey.400",
                                        }}
                                      />
                                    )}
                                  </Box>
                                  <Typography
                                    sx={{ fontWeight: 500, color: "grey.900" }}
                                  >
                                    {plan.name}
                                  </Typography>
                                </Box>
                              </td>
                              <td
                                style={{
                                  padding: "16px 24px",
                                  whiteSpace: "nowrap",
                                  fontSize: "0.875rem",
                                  color: "grey.500",
                                }}
                              >
                                {plan.code || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "16px 24px",
                                  whiteSpace: "nowrap",
                                  fontSize: "0.875rem",
                                  color: "grey.500",
                                }}
                              >
                                {new Date(plan.start_date).toLocaleDateString()}{" "}
                                ~ {new Date(plan.end_date).toLocaleDateString()}
                              </td>
                              <td
                                style={{
                                  padding: "16px 24px",
                                  whiteSpace: "nowrap",
                                  fontSize: "0.875rem",
                                  color: "grey.500",
                                }}
                              >
                                {plan.budget
                                  ? `¥${plan.budget.toLocaleString()}`
                                  : "-"}
                              </td>
                              <td
                                style={{
                                  padding: "16px 24px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Chip
                                  size="small"
                                  label={
                                    plan.status === "active"
                                      ? "进行中"
                                      : "已结束"
                                  }
                                  color={
                                    plan.status === "active"
                                      ? "primary"
                                      : "default"
                                  }
                                />
                              </td>
                              <td
                                style={{
                                  padding: "16px 24px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Box sx={{ display: "flex", gap: 0.5 }}>
                                  <Tooltip title="编辑">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleOpenModal(plan)}
                                    >
                                      <Edit2 sx={{ width: 16, height: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="删除">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDelete(plan.id)}
                                      sx={{ color: "error.main" }}
                                    >
                                      <Trash2 sx={{ width: 16, height: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip
                                    title={
                                      plan.status === "active" ? "停用" : "启用"
                                    }
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleStatusChange(
                                          plan.id,
                                          plan.status !== "active",
                                        )
                                      }
                                    >
                                      {plan.status === "active" ? (
                                        <XCircle
                                          sx={{
                                            width: 16,
                                            height: 16,
                                            color: "orange.500",
                                          }}
                                        />
                                      ) : (
                                        <CheckCircle
                                          sx={{
                                            width: 16,
                                            height: 16,
                                            color: "green.500",
                                          }}
                                        />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </td>
                            </tr>
                            {expandedPlan === plan.id && (
                              <tr>
                                <td
                                  colSpan={6}
                                  style={{
                                    padding: "16px 24px",
                                    backgroundColor: "rgb(249, 250, 251)",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      ml: 4,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 1,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <FileText
                                        sx={{
                                          width: 16,
                                          height: 16,
                                          color: "grey.400",
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        sx={{ color: "grey.600" }}
                                      >
                                        <strong>描述:</strong>{" "}
                                        {plan.description || "-"}
                                      </Typography>
                                    </Box>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Clock
                                        sx={{
                                          width: 16,
                                          height: 16,
                                          color: "grey.400",
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        sx={{ color: "grey.500" }}
                                      >
                                        <strong>创建时间:</strong>{" "}
                                        {new Date(
                                          plan.created_at,
                                        ).toLocaleString()}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === "courses" && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ position: "relative", width: 256 }}>
                <Search
                  sx={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "grey.400",
                    width: 16,
                    height: 16,
                  }}
                  size={16}
                />
                <TextField
                  size="small"
                  type="text"
                  placeholder="搜索课程..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ width: "100%", "& .MuiOutlinedInput-root": { pl: 4 } }}
                />
              </Box>
            </Box>

            <Box sx={{ display: "grid", gap: 2 }}>
              {filteredCourses.length === 0 ? (
                <Card>
                  <CardContent sx={{ p: 8, textAlign: "center" }}>
                    <BookOpen
                      sx={{
                        width: 48,
                        height: 48,
                        color: "grey.400",
                        mx: "auto",
                        mb: 2,
                      }}
                    />
                    <Typography sx={{ color: "grey.500" }}>
                      暂无培训课程
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                filteredCourses.map((course) => (
                  <Card
                    key={course.id}
                    sx={{
                      "&:hover": { boxShadow: 3 },
                      transition: "box-shadow",
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              mb: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: "primary.light",
                                color: "primary.dark",
                              }}
                            >
                              {course.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600 }}
                              >
                                {course.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {course.code || "未设置代码"}
                              </Typography>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "repeat(4, 1fr)",
                              gap: 2,
                            }}
                          >
                            <Box>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ color: "grey.500" }}
                              >
                                分类:
                              </Typography>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ ml: 1, color: "grey.700" }}
                              >
                                {course.category}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ color: "grey.500" }}
                              >
                                级别:
                              </Typography>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ ml: 1, color: "grey.700" }}
                              >
                                {course.level}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ color: "grey.500" }}
                              >
                                时长:
                              </Typography>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ ml: 1, color: "grey.700" }}
                              >
                                {course.duration_hours
                                  ? `${course.duration_hours}小时`
                                  : "-"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ color: "grey.500" }}
                              >
                                讲师:
                              </Typography>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ ml: 1, color: "grey.700" }}
                              >
                                {course.instructor_name || "-"}
                              </Typography>
                            </Box>
                          </Box>
                          {course.description && (
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 2,
                                color: "grey.600",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {course.description}
                            </Typography>
                          )}
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 1,
                          }}
                        >
                          <Chip
                            size="small"
                            label={
                              course.status === "active" ? "开放报名" : "已关闭"
                            }
                            color={
                              course.status === "active" ? "success" : "default"
                            }
                          />
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="编辑">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenModal(course)}
                              >
                                <Edit2 sx={{ width: 16, height: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="删除">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(course.id)}
                                sx={{ color: "error.main" }}
                              >
                                <Trash2 sx={{ width: 16, height: 16 }} />
                              </IconButton>
                            </Tooltip>
                            {course.status === "active" && (
                              <Tooltip title="报名">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEnrollModal(course)}
                                  sx={{ color: "success.main" }}
                                >
                                  <UserPlus sx={{ width: 16, height: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </Box>
        )}

        {activeTab === "records" && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ position: "relative", width: 256 }}>
                <Search
                  sx={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "grey.400",
                    width: 16,
                    height: 16,
                  }}
                  size={16}
                />
                <TextField
                  size="small"
                  type="text"
                  placeholder="搜索员工..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ width: "100%", "& .MuiOutlinedInput-root": { pl: 4 } }}
                />
              </Box>
            </Box>

            <Card>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ maxHeight: 600, overflow: "auto" }}>
                  <table style={{ width: "100%" }}>
                    <thead
                      style={{
                        backgroundColor: "rgb(249, 250, 251)",
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          员工
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          课程
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          报名日期
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          出勤状态
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          完成状态
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          成绩
                        </th>
                        <th
                          style={{
                            padding: "12px 24px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "rgb(107, 114, 128)",
                          }}
                        >
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      style={{
                        backgroundColor: "white",
                        borderTop: "1px solid rgb(229, 231, 235)",
                      }}
                    >
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              padding: "32px 24px",
                              textAlign: "center",
                              color: "rgb(107, 114, 128)",
                            }}
                          >
                            <Typography
                              sx={{ textAlign: "center", color: "grey.500" }}
                            >
                              暂无培训记录
                            </Typography>
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((record) => (
                          <tr
                            key={record.id}
                            style={{
                              borderBottom: "1px solid rgb(229, 231, 235)",
                            }}
                          >
                            <td
                              style={{
                                padding: "16px 24px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: "primary.light",
                                    color: "primary.dark",
                                    fontSize: 14,
                                  }}
                                >
                                  {getEmployeeName(record.employee_id)
                                    .charAt(0)
                                    .toUpperCase()}
                                </Avatar>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500, color: "grey.900" }}
                                >
                                  {getEmployeeName(record.employee_id)}
                                </Typography>
                              </Box>
                            </td>
                            <td
                              style={{
                                padding: "16px 24px",
                                whiteSpace: "nowrap",
                                fontSize: "0.875rem",
                                color: "grey.500",
                              }}
                            >
                              {record.course_id.substring(0, 8)}...
                            </td>
                            <td
                              style={{
                                padding: "16px 24px",
                                whiteSpace: "nowrap",
                                fontSize: "0.875rem",
                                color: "grey.500",
                              }}
                            >
                              {new Date(
                                record.enrollment_date,
                              ).toLocaleDateString()}
                            </td>
                            <td
                              style={{
                                padding: "16px 24px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Chip
                                size="small"
                                label={
                                  record.attendance_status === "attended"
                                    ? "已出勤"
                                    : record.attendance_status === "absent"
                                      ? "缺勤"
                                      : "未考勤"
                                }
                                color={
                                  record.attendance_status === "attended"
                                    ? "success"
                                    : record.attendance_status === "absent"
                                      ? "error"
                                      : "default"
                                }
                                variant={
                                  record.attendance_status === "pending"
                                    ? "outlined"
                                    : "filled"
                                }
                              />
                            </td>
                            <td
                              style={{
                                padding: "16px 24px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Chip
                                size="small"
                                label={
                                  record.completion_status === "completed"
                                    ? "已完成"
                                    : "未完成"
                                }
                                color={
                                  record.completion_status === "completed"
                                    ? "success"
                                    : "default"
                                }
                                variant={
                                  record.completion_status === "completed"
                                    ? "filled"
                                    : "outlined"
                                }
                              />
                            </td>
                            <td
                              style={{
                                padding: "16px 24px",
                                whiteSpace: "nowrap",
                                fontSize: "0.875rem",
                              }}
                            >
                              {record.score ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Award
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      color: "yellow.500",
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {record.score}分
                                  </Typography>
                                </Box>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td
                              style={{
                                padding: "16px 24px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Box sx={{ display: "flex", gap: 0.5 }}>
                                <Tooltip title="查看详情">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewRecord(record)}
                                  >
                                    <Eye sx={{ width: 16, height: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="删除">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(record.id)}
                                    sx={{ color: "error.main" }}
                                  >
                                    <Trash2 sx={{ width: 16, height: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      {showModal && (
        <Dialog
          open={showModal}
          onClose={() => setShowModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editItem ? "编辑" : "新增"}
            {activeTab === "plans" ? "培训计划" : "培训课程"}
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              {activeTab === "plans" ? (
                <>
                  <Box>
                    <FormLabel htmlFor="plan-name">计划名称 *</FormLabel>
                    <TextField
                      id="plan-name"
                      size="small"
                      fullWidth
                      type="text"
                      value={(formData as TrainingPlan).name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="请输入计划名称"
                    />
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <FormLabel htmlFor="plan-code">计划代码</FormLabel>
                      <TextField
                        id="plan-code"
                        size="small"
                        fullWidth
                        type="text"
                        value={(formData as TrainingPlan).code || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value })
                        }
                        placeholder="自动生成"
                        disabled={!editItem}
                      />
                    </Box>
                    <Box>
                      <FormLabel htmlFor="plan-budget">预算</FormLabel>
                      <TextField
                        id="plan-budget"
                        size="small"
                        fullWidth
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
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <FormLabel htmlFor="plan-start">开始日期 *</FormLabel>
                      <TextField
                        id="plan-start"
                        size="small"
                        fullWidth
                        type="date"
                        value={(formData as TrainingPlan).start_date || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </Box>
                    <Box>
                      <FormLabel htmlFor="plan-end">结束日期 *</FormLabel>
                      <TextField
                        id="plan-end"
                        size="small"
                        fullWidth
                        type="date"
                        value={(formData as TrainingPlan).end_date || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                      />
                    </Box>
                  </Box>
                  <Box>
                    <FormLabel htmlFor="plan-description">描述</FormLabel>
                    <Box
                      component="textarea"
                      id="plan-description"
                      value={(formData as TrainingPlan).description || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      sx={{
                        width: "100%",
                        border: "1px solid rgb(209, 213, 219)",
                        borderRadius: 1,
                        px: 2,
                        py: 1.5,
                        fontFamily: "inherit",
                        fontSize: "0.875rem",
                        resize: "vertical",
                      }}
                      rows={3}
                      placeholder="请输入计划描述"
                    />
                  </Box>
                </>
              ) : (
                <>
                  <Box>
                    <FormLabel htmlFor="course-name">课程名称 *</FormLabel>
                    <TextField
                      id="course-name"
                      size="small"
                      fullWidth
                      type="text"
                      value={(formData as TrainingCourse).name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="请输入课程名称"
                    />
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <FormLabel htmlFor="course-category">分类 *</FormLabel>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={(formData as TrainingCourse).category || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            请选择分类
                          </MenuItem>
                          <MenuItem value="technical">技术培训</MenuItem>
                          <MenuItem value="management">管理培训</MenuItem>
                          <MenuItem value="soft_skill">软技能</MenuItem>
                          <MenuItem value="onboarding">入职培训</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box>
                      <FormLabel htmlFor="course-level">级别 *</FormLabel>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={(formData as TrainingCourse).level || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, level: e.target.value })
                          }
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            请选择级别
                          </MenuItem>
                          <MenuItem value="beginner">入门级</MenuItem>
                          <MenuItem value="intermediate">中级</MenuItem>
                          <MenuItem value="advanced">高级</MenuItem>
                          <MenuItem value="expert">专家级</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <FormLabel htmlFor="course-duration">
                        时长(小时)
                      </FormLabel>
                      <TextField
                        id="course-duration"
                        size="small"
                        fullWidth
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
                    </Box>
                    <Box>
                      <FormLabel htmlFor="course-participants">
                        最大人数
                      </FormLabel>
                      <TextField
                        id="course-participants"
                        size="small"
                        fullWidth
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
                    </Box>
                  </Box>
                  <Box>
                    <FormLabel htmlFor="course-instructor">讲师</FormLabel>
                    <TextField
                      id="course-instructor"
                      size="small"
                      fullWidth
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
                  </Box>
                  <Box>
                    <FormLabel htmlFor="course-description">描述</FormLabel>
                    <Box
                      component="textarea"
                      id="course-description"
                      value={(formData as TrainingCourse).description || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      sx={{
                        width: "100%",
                        border: "1px solid rgb(209, 213, 219)",
                        borderRadius: 1,
                        px: 2,
                        py: 1.5,
                        fontFamily: "inherit",
                        fontSize: "0.875rem",
                        resize: "vertical",
                      }}
                      rows={3}
                      placeholder="请输入课程描述"
                    />
                  </Box>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button variant="contained" onClick={handleSave}>
              {editItem ? "保存" : "创建"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {showRecordModal && selectedRecord && (
        <Dialog
          open={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>培训记录详情</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ bgcolor: "grey.100", borderRadius: 2, p: 2 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: "primary.light",
                      color: "primary.dark",
                    }}
                  >
                    {getEmployeeName(selectedRecord.employee_id)
                      .charAt(0)
                      .toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {getEmployeeName(selectedRecord.employee_id)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      员工ID: {selectedRecord.employee_id.substring(0, 8)}...
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    fontSize: "0.875rem",
                  }}
                >
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ color: "grey.500" }}
                    >
                      课程ID:
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ color: "grey.700" }}
                    >
                      {selectedRecord.course_id.substring(0, 8)}...
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ color: "grey.500" }}
                    >
                      报名日期:
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ color: "grey.700" }}
                    >
                      {new Date(
                        selectedRecord.enrollment_date,
                      ).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ color: "grey.500" }}
                    >
                      出勤状态:
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        selectedRecord.attendance_status === "attended"
                          ? "已出勤"
                          : selectedRecord.attendance_status === "absent"
                            ? "缺勤"
                            : "未考勤"
                      }
                      color={
                        selectedRecord.attendance_status === "attended"
                          ? "success"
                          : selectedRecord.attendance_status === "absent"
                            ? "error"
                            : "default"
                      }
                      variant={
                        selectedRecord.attendance_status === "pending"
                          ? "outlined"
                          : "filled"
                      }
                    />
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ color: "grey.500" }}
                    >
                      完成状态:
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        selectedRecord.completion_status === "completed"
                          ? "已完成"
                          : "未完成"
                      }
                      color={
                        selectedRecord.completion_status === "completed"
                          ? "success"
                          : "default"
                      }
                      variant={
                        selectedRecord.completion_status === "completed"
                          ? "filled"
                          : "outlined"
                      }
                    />
                  </Box>
                  {selectedRecord.score && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ color: "grey.500" }}
                      >
                        成绩:
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Award
                          sx={{ width: 16, height: 16, color: "yellow.500" }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {selectedRecord.score}分
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  {selectedRecord.certificate_no && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ color: "grey.500" }}
                      >
                        证书编号:
                      </Typography>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ color: "grey.700", fontFamily: "monospace" }}
                      >
                        {selectedRecord.certificate_no}
                      </Typography>
                    </Box>
                  )}
                  {selectedRecord.completed_at && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ color: "grey.500" }}
                      >
                        完成时间:
                      </Typography>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ color: "grey.700" }}
                      >
                        {new Date(selectedRecord.completed_at).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {selectedRecord.feedback && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ color: "grey.500", display: "block", mb: 0.5 }}
                      >
                        反馈:
                      </Typography>
                      <Box
                        sx={{
                          color: "grey.700",
                          bgcolor: "background.paper",
                          borderRadius: 1,
                          p: 1,
                        }}
                      >
                        {selectedRecord.feedback}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              onClick={() => setShowRecordModal(false)}
            >
              关闭
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {showEnrollModal && selectedCourse && (
        <Dialog
          open={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>报名课程: {selectedCourse.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ bgcolor: "grey.100", borderRadius: 2, p: 2 }}>
                <Typography variant="body2" sx={{ color: "grey.600" }}>
                  请选择要报名的员工:
                </Typography>
              </Box>
              <Box>
                <FormLabel htmlFor="enroll-employee">员工 *</FormLabel>
                <FormControl size="small" fullWidth>
                  <Select displayEmpty>
                    <MenuItem value="" disabled>
                      请选择员工
                    </MenuItem>
                    {employees.map((employee) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.employee_no})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => setShowEnrollModal(false)}
            >
              取消
            </Button>
            <Button variant="contained" onClick={() => handleEnroll("")}>
              确认报名
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default HrmTrainingPage;
