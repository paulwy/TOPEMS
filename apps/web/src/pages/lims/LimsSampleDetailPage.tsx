import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Calendar,
  User,
  MapPin,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit3,
  Trash2,
  Plus,
  BarChart3,
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { limsApi } from "@/api/lims";
import type { Sample, InspectionTask, InspectionRecord } from "@/api/lims";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import dayjs from "dayjs";

interface SampleTestRecord {
  id: string;
  step_name: string;
  inspector: string;
  result: string;
  conclusion: string;
  tested_at: string;
}

const LimsSampleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sample, setSample] = useState<Sample | null>(null);
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [records, setRecords] = useState<SampleTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "",
  });

  useEffect(() => {
    if (id) {
      loadSampleDetail(id);
    }
  }, [id]);

  const loadSampleDetail = async (sampleId: string) => {
    try {
      setLoading(true);
      const [sampleRes, tasksRes] = await Promise.all([
        limsApi.getSample(sampleId),
        limsApi.listTasksBySample(sampleId),
      ]);

      if (sampleRes.success && sampleRes.data) {
        setSample(sampleRes.data as Sample);
        setFormData({
          name: (sampleRes.data as Sample).name,
          description: (sampleRes.data as Sample).description || "",
          status: (sampleRes.data as Sample).status,
        });
      }

      if (tasksRes.success && tasksRes.data) {
        const tasksData = tasksRes.data as any;
        const tasksArray = Array.isArray(tasksData)
          ? tasksData
          : tasksData.items || tasksData.tasks || [];
        setTasks(tasksArray);

        for (const task of tasksArray) {
          const recordRes = await limsApi.listRecordsByTask(task.id);
          if (recordRes.success && recordRes.data) {
            const recordData = recordRes.data as any;
            const recordArray = Array.isArray(recordData)
              ? recordData
              : recordData.records || [];
            const formattedRecords = recordArray.map((r: any) => ({
              id: r.id,
              step_name: r.step_name || r.step_id,
              inspector: r.inspector || "-",
              result: r.result || "-",
              conclusion: r.conclusion || "-",
              tested_at: r.created_at
                ? new Date(r.created_at).toLocaleDateString("zh-CN")
                : "-",
            }));
            setRecords((prev) => [...prev, ...formattedRecords]);
          }
        }
      }
    } catch (error) {
      console.error("加载样品详情失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { bg: string; color: string; label: string }
    > = {
      pending: { bg: "#fef9c3", color: "#ca8a04", label: "待测试" },
      待测试: { bg: "#fef9c3", color: "#ca8a04", label: "待测试" },
      in_progress: { bg: "#dbeafe", color: "#2563eb", label: "测试中" },
      测试中: { bg: "#dbeafe", color: "#2563eb", label: "测试中" },
      completed: { bg: "#dcfce7", color: "#16a34a", label: "已完成" },
      已完成: { bg: "#dcfce7", color: "#16a34a", label: "已完成" },
      cancelled: { bg: "#fee2e2", color: "#dc2626", label: "已终止" },
      已终止: { bg: "#fee2e2", color: "#dc2626", label: "已终止" },
    };
    const item = statusMap[status] || {
      bg: "#f3f4f6",
      color: "#4b5563",
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size="small"
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const handleEdit = async () => {
    if (!sample) return;
    if (!formData.name.trim()) {
      toast.error("请输入样品名称");
      return;
    }
    try {
      const response = await limsApi.updateSample(sample.id, formData);
      if (response.success) {
        toast.success("样品信息更新成功");
        setShowEditModal(false);
        loadSampleDetail(sample.id);
      } else {
        toast.error("更新失败，请稍后重试");
      }
    } catch (error) {
      console.error("更新样品失败:", error);
      toast.error("更新失败，请稍后重试");
    }
  };

  const handleDelete = async () => {
    if (!sample) return;
    if (!confirm(`确定要删除样品 "${sample.name}" 吗？`)) return;
    try {
      const response = await limsApi.deleteSample(sample.id);
      if (response.success) {
        toast.success("样品删除成功");
        navigate("/lims");
      } else {
        toast.error("删除失败，请稍后重试");
      }
    } catch (error) {
      console.error("删除样品失败:", error);
      toast.error("删除失败，请稍后重试");
    }
  };

  const getTestStatistics = () => {
    const stats = {
      total: records.length,
      passed: records.filter((r) => r.conclusion === "合格").length,
      failed: records.filter((r) => r.conclusion === "不合格").length,
      pending: records.filter(
        (r) => r.conclusion === "待定" || r.conclusion === "-",
      ).length,
    };
    return stats;
  };

  const chartData = [
    { name: "已完成", value: records.length, fill: "#10b981" },
    {
      name: "合格",
      value: records.filter((r) => r.conclusion === "合格").length,
      fill: "#22c55e",
    },
    {
      name: "不合格",
      value: records.filter((r) => r.conclusion === "不合格").length,
      fill: "#ef4444",
    },
    {
      name: "待定",
      value: records.filter(
        (r) => r.conclusion === "待定" || r.conclusion === "-",
      ).length,
      fill: "#f59e0b",
    },
  ];

  const recordColumns: ColumnDef<SampleTestRecord>[] = [
    { accessorKey: "step_name", header: "检验步骤" },
    { accessorKey: "inspector", header: "检验员" },
    { accessorKey: "result", header: "检验结果" },
    { accessorKey: "conclusion", header: "结论" },
    { accessorKey: "tested_at", header: "检验时间" },
  ];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center" }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ width: 48, height: 48, border: "4px solid #e9d5ff", borderTop: "4px solid #9333ea", borderRadius: "50%", margin: "0 auto 16px auto" }}
          ></motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ color: "#475569" }}
          >
            加载中...
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  if (!sample) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle sx={{ width: 64, height: 64, color: "#ef4444", margin: "0 auto 16px auto" }} />
          <p style={{ color: "#475569" }}>样品不存在或已被删除</p>
          <Button onClick={() => navigate("/lims")} sx={{ mt: 2 }}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const stats = getTestStatistics();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ backgroundColor: "background.paper", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", borderBottom: 1, borderColor: "divider", position: "sticky", top: 0, zIndex: 10 }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/lims")}
                style={{ height: 32, width: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}
              >
                <ArrowLeft sx={{ width: 16, height: 16 }} />
              </motion.button>
              <div>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>样品详情</h1>
                <p style={{ fontSize: "0.75rem", color: "#64748b" }}>Sample Detail</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowEditModal(true)}
                style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Edit3 sx={{ width: 16, height: 16 }} />
                编辑
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDelete}
                style={{ padding: "8px 16px", border: "1px solid #fecaca", borderRadius: 8, backgroundColor: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}
              >
                <Trash2 sx={{ width: 16, height: 16 }} />
                删除
              </motion.button>
            </div>
          </div>
        </Box>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 16px" }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: { lg: "span 1" } }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              style={{ backgroundColor: "#ffffff", borderRadius: 12, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}
            >
              <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                  <Package sx={{ width: 20, height: 20, color: "#9333ea" }} />
                  基本信息
                </h2>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>样品编号</p>
                    <p style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", marginTop: 4 }}>
                      {sample.sample_no || sample.id}
                    </p>
                  </div>
                  {getStatusBadge(sample.status)}
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>样品名称</p>
                  <p style={{ fontSize: "1.125rem", fontWeight: 500, color: "#0f172a", marginTop: 4 }}>
                    {sample.name}
                  </p>
                </div>
                {sample.description && (
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>描述</p>
                    <p style={{ fontSize: "0.875rem", color: "#334155", marginTop: 4 }}>{sample.description}</p>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar sx={{ width: 12, height: 12 }} />
                      接收日期
                    </p>
                    <p style={{ color: "#0f172a", marginTop: 4 }}>
                      {sample.received_date
                        ? dayjs(sample.received_date).format("YYYY-MM-DD")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                      <User sx={{ width: 12, height: 12 }} />
                      负责人
                    </p>
                    <p style={{ color: "#0f172a", marginTop: 4 }}>
                      {sample.responsible_person || "-"}
                    </p>
                  </div>
                </div>
                {sample.location && (
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin sx={{ width: 12, height: 12 }} />
                      存放位置
                    </p>
                    <p style={{ color: "#0f172a", marginTop: 4 }}>{sample.location}</p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ backgroundColor: "#ffffff", borderRadius: 12, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}
            >
              <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText sx={{ width: 20, height: 20, color: "#2563eb" }} />
                  关联检验任务
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                {tasks.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                        whileHover={{ scale: 1.01, backgroundColor: "#f8fafc" }}
                        style={{ padding: 12, backgroundColor: "#f8fafc", borderRadius: 8, cursor: "pointer" }}
                        onClick={() => navigate(`/lims/task/${task.id}`)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <p style={{ fontWeight: 500, color: "#0f172a" }}>
                              {task.task_no}
                            </p>
                            <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                              {task.sample_name || "样品检验"}
                            </p>
                          </div>
                          <Chip
                            label={
                              task.status === "completed" ||
                              task.status === "已完成"
                                ? "已完成"
                                : task.status === "in_progress" ||
                                    task.status === "进行中"
                                  ? "进行中"
                                  : "待处理"
                            }
                            size="small"
                            sx={{
                              backgroundColor:
                                task.status === "completed" ||
                                task.status === "已完成"
                                  ? "#dcfce7"
                                  : task.status === "in_progress" ||
                                      task.status === "进行中"
                                    ? "#dbeafe"
                                    : "#fef9c3",
                              color:
                                task.status === "completed" ||
                                task.status === "已完成"
                                  ? "#16a34a"
                                  : task.status === "in_progress" ||
                                      task.status === "进行中"
                                    ? "#2563eb"
                                    : "#ca8a04",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, fontSize: "0.875rem", color: "#64748b" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <User sx={{ width: 12, height: 12 }} />
                            {task.inspector || "-"}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock sx={{ width: 12, height: 12 }} />
                            {task.created_at
                              ? dayjs(task.created_at).format("YYYY-MM-DD")
                              : "-"}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>
                    <FileText sx={{ width: 48, height: 48, margin: "0 auto 8px auto", opacity: 0.5 }} />
                    <p>暂无检验任务</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/lims")}
                      style={{ marginTop: 16, padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, margin: "16px auto 0" }}
                    >
                      <Plus sx={{ width: 12, height: 12 }} />
                      创建任务
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: { lg: "span 2" } }}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ backgroundColor: "#ffffff", borderRadius: 12, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}
            >
              <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart3 sx={{ width: 20, height: 20, color: "#9333ea" }} />
                  检验统计
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ height: 256 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={60} />
                      <Tooltip
                        formatter={(value: unknown) => [`${value} 条`, "数量"]}
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 16 }}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    style={{ textAlign: "center", padding: 16, backgroundColor: "#f8fafc", borderRadius: 8 }}
                  >
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
                      {stats.total}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>检验总数</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    style={{ textAlign: "center", padding: 16, backgroundColor: "#f0fdf4", borderRadius: 8 }}
                  >
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16a34a" }}>
                      {stats.passed}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: 4 }}>合格</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    style={{ textAlign: "center", padding: 16, backgroundColor: "#fef2f2", borderRadius: 8 }}
                  >
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#dc2626" }}>
                      {stats.failed}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>不合格</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    style={{ textAlign: "center", padding: 16, backgroundColor: "#fefce8", borderRadius: 8 }}
                  >
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ca8a04" }}>
                      {stats.pending}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#ca8a04", marginTop: 4 }}>待定</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ backgroundColor: "#ffffff", borderRadius: 12, boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}
            >
              <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle sx={{ width: 20, height: 20, color: "#16a34a" }} />
                  检验记录
                </h2>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRecordModal(true)}
                  style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Plus sx={{ width: 12, height: 12 }} />
                  添加记录
                </motion.button>
              </div>
              <div style={{ padding: 16 }}>
                {records.length > 0 ? (
                  <DataTable
                    columns={recordColumns}
                    data={records}
                    enablePagination={false}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
                    <CheckCircle sx={{ width: 64, height: 64, margin: "0 auto 16px auto", opacity: 0.5 }} />
                    <p>暂无检验记录</p>
                  </div>
                )}
              </div>
            </motion.div>
          </Box>
        </Box>
      </motion.main>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑样品信息</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                样品名称 *
              </Box>
              <TextField
                size="small"
                fullWidth
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="请输入样品名称"
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                描述
              </Box>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请输入样品描述"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "96px",
                }}
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                状态
              </Box>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <option value="待测试">待测试</option>
                <option value="测试中">测试中</option>
                <option value="已完成">已完成</option>
                <option value="已终止">已终止</option>
              </select>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowEditModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加检验记录</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                检验步骤
              </Box>
              <TextField
                size="small"
                fullWidth
                placeholder="请输入检验步骤名称"
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                检验员
              </Box>
              <TextField
                size="small"
                fullWidth
                placeholder="请输入检验员姓名"
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                检验结果
              </Box>
              <textarea
                placeholder="请输入检验结果"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "96px",
                }}
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                结论
              </Box>
              <select
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <option value="">请选择结论</option>
                <option value="合格">合格</option>
                <option value="不合格">不合格</option>
                <option value="待定">待定</option>
              </select>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowRecordModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={() => setShowRecordModal(false)}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default LimsSampleDetailPage;
