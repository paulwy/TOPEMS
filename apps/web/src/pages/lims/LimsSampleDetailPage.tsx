import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import { DataTable } from "../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { limsApi } from "../../api/lims";
import type { Sample, InspectionTask, InspectionRecord } from "../../api/lims";
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
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#fef9c3', color: '#ca8a04', label: "待测试" },
      待测试: { bg: '#fef9c3', color: '#ca8a04', label: "待测试" },
      in_progress: { bg: '#dbeafe', color: '#2563eb', label: "测试中" },
      测试中: { bg: '#dbeafe', color: '#2563eb', label: "测试中" },
      completed: { bg: '#dcfce7', color: '#16a34a', label: "已完成" },
      已完成: { bg: '#dcfce7', color: '#16a34a', label: "已完成" },
      cancelled: { bg: '#fee2e2', color: '#dc2626', label: "已终止" },
      已终止: { bg: '#fee2e2', color: '#dc2626', label: "已终止" },
    };
    const item = statusMap[status] || {
      bg: '#f3f4f6',
      color: '#4b5563',
      label: status,
    };
    return <Chip label={item.label} size="small" sx={{ backgroundColor: item.bg, color: item.color }} />;
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
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"
          ></motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600"
          >
            加载中...
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  if (!sample) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">样品不存在或已被删除</p>
          <Button onClick={() => navigate("/lims")} className="mt-4">
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
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/lims")}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">样品详情</h1>
                <p className="text-xs text-slate-500">Sample Detail</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                编辑
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDelete}
                className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  基本信息
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-500">样品编号</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {sample.sample_no || sample.id}
                    </p>
                  </div>
                  {getStatusBadge(sample.status)}
                </div>
                <div>
                  <p className="text-sm text-slate-500">样品名称</p>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {sample.name}
                  </p>
                </div>
                {sample.description && (
                  <div>
                    <p className="text-sm text-slate-500">描述</p>
                    <p className="text-slate-700 mt-1">{sample.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      接收日期
                    </p>
                    <p className="text-slate-900 mt-1">
                      {sample.received_date
                        ? dayjs(sample.received_date).format("YYYY-MM-DD")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      负责人
                    </p>
                    <p className="text-slate-900 mt-1">
                      {sample.responsible_person || "-"}
                    </p>
                  </div>
                </div>
                {sample.location && (
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      存放位置
                    </p>
                    <p className="text-slate-900 mt-1">{sample.location}</p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  关联检验任务
                </h2>
              </div>
              <div className="p-4">
                {tasks.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                        whileHover={{ scale: 1.01, backgroundColor: "#f8fafc" }}
                        className="p-3 bg-slate-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => navigate(`/lims/task/${task.id}`)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-slate-900">
                              {task.task_no}
                            </p>
                            <p className="text-sm text-slate-500">
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
                                  ? '#dcfce7'
                                  : task.status === "in_progress" ||
                                      task.status === "进行中"
                                    ? '#dbeafe'
                                    : '#fef9c3',
                              color:
                                task.status === "completed" ||
                                task.status === "已完成"
                                  ? '#16a34a'
                                  : task.status === "in_progress" ||
                                      task.status === "进行中"
                                    ? '#2563eb'
                                    : '#ca8a04',
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.inspector || "-"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.created_at
                              ? dayjs(task.created_at).format("YYYY-MM-DD")
                              : "-"}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无检验任务</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/lims")}
                      className="mt-4 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-3 h-3" />
                      创建任务
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  检验统计
                </h2>
              </div>
              <div className="p-4">
                <div className="h-64">
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
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-slate-50 rounded-lg"
                  >
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.total}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">检验总数</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-green-50 rounded-lg"
                  >
                    <p className="text-2xl font-bold text-green-600">
                      {stats.passed}
                    </p>
                    <p className="text-xs text-green-600 mt-1">合格</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-red-50 rounded-lg"
                  >
                    <p className="text-2xl font-bold text-red-600">
                      {stats.failed}
                    </p>
                    <p className="text-xs text-red-600 mt-1">不合格</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-4 bg-yellow-50 rounded-lg"
                  >
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.pending}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">待定</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  检验记录
                </h2>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRecordModal(true)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  添加记录
                </motion.button>
              </div>
              <div className="p-4">
                {records.length > 0 ? (
                  <DataTable
                    columns={recordColumns}
                    data={records}
                    enablePagination={false}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无检验记录</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.main>

      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑样品信息</DialogTitle>
        <DialogContent>
          <Box className="space-y-4" sx={{ mt: 1 }}>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>样品名称 *</Box>
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
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>描述</Box>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请输入样品描述"
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none', height: '96px' }}
              />
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>状态</Box>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
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
          <Button variant="outlined" onClick={() => setShowEditModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleEdit}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRecordModal} onClose={() => setShowRecordModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加检验记录</DialogTitle>
        <DialogContent>
          <Box className="space-y-4" sx={{ mt: 1 }}>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>检验步骤</Box>
              <TextField size="small" fullWidth placeholder="请输入检验步骤名称" />
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>检验员</Box>
              <TextField size="small" fullWidth placeholder="请输入检验员姓名" />
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>检验结果</Box>
              <textarea
                placeholder="请输入检验结果"
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none', height: '96px' }}
              />
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>结论</Box>
              <select style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <option value="">请选择结论</option>
                <option value="合格">合格</option>
                <option value="不合格">不合格</option>
                <option value="待定">待定</option>
              </select>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowRecordModal(false)}>取消</Button>
          <Button variant="contained" onClick={() => setShowRecordModal(false)}>保存</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default LimsSampleDetailPage;
