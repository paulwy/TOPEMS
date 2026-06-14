import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Package,
  User,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Play,
  Edit3,
  Plus,
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
import type {
  InspectionTask,
  InspectionRecord,
  InspectionProcess,
} from "../../api/lims";

interface TaskRecord extends InspectionRecord {
  step_name: string;
}

const LimsTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<InspectionTask | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);
  const [process, setProcess] = useState<InspectionProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState({
    step_name: "",
    result: "",
    conclusion: "",
    inspector: "",
  });

  useEffect(() => {
    if (id) {
      loadTaskDetail(id);
    }
  }, [id]);

  const loadTaskDetail = async (taskId: string) => {
    try {
      setLoading(true);
      const [taskRes, recordRes, processRes] = await Promise.all([
        limsApi.getTask(taskId),
        limsApi.listRecordsByTask(taskId),
        limsApi.listProcesses(),
      ]);

      if (taskRes.success && taskRes.data) {
        setTask(taskRes.data as InspectionTask);
      }

      if (recordRes.success && recordRes.data) {
        const recordData = recordRes.data as any;
        const recordArray = Array.isArray(recordData)
          ? recordData
          : recordData.records || [];
        const formattedRecords = recordArray.map((r: any) => ({
          ...r,
          step_name: r.step_name || r.step_id || `步骤 ${r.step_index}`,
        }));
        setRecords(formattedRecords);
      }

      if (processRes.success && processRes.data && task) {
        const processData = processRes.data as any;
        const processArray = Array.isArray(processData)
          ? processData
          : processData.processes || [];
        const matchedProcess = processArray.find(
          (p: any) => p.id === task.process_id,
        );
        if (matchedProcess) {
          setProcess(matchedProcess);
        }
      }
    } catch (error) {
      console.error("加载任务详情失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#fef9c3', color: '#ca8a04', label: "待测试" },
      待测试: { bg: '#fef9c3', color: '#ca8a04', label: "待测试" },
      in_progress: { bg: '#dbeafe', color: '#2563eb', label: "进行中" },
      进行中: { bg: '#dbeafe', color: '#2563eb', label: "进行中" },
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

  const handleCompleteStep = async () => {
    if (!task) return;
    try {
      const response = await limsApi.completeStep(task.id, {
        step_id: "",
        step_name: recordForm.step_name,
        result: recordForm.result,
        conclusion: recordForm.conclusion,
        inspector: recordForm.inspector,
      });
      if (response.success) {
        setShowRecordModal(false);
        loadTaskDetail(task.id);
      }
    } catch (error) {
      console.error("完成步骤失败:", error);
    }
  };

  const recordColumns: ColumnDef<TaskRecord>[] = [
    { accessorKey: "step_name", header: "检验步骤" },
    { accessorKey: "inspector", header: "检验员" },
    { accessorKey: "result", header: "检验结果" },
    { accessorKey: "conclusion", header: "结论" },
    {
      accessorKey: "created_at",
      header: "检验时间",
      cell: ({ row }) => (
        <span>
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleString("zh-CN")
            : "-"}
        </span>
      ),
    },
  ];

  const totalSteps = process?.steps?.length || 0;
  const completedSteps = records.length;
  const progressPercent =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">检验任务不存在或已被删除</p>
          <Button onClick={() => navigate("/lims")} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="text"
                onClick={() => navigate("/lims")}
                sx={{ minWidth: 32, height: 32 }}
              >
                <Box component={ArrowLeft} sx={{ fontSize: 20 }} />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  检验任务详情
                </h1>
                <p className="text-xs text-slate-500">Inspection Task Detail</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {task.status !== "completed" && task.status !== "已完成" && (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => setShowRecordModal(true)}
                    startIcon={<Box component={Plus} sx={{ fontSize: 16 }} />}
                  >
                    添加记录
                  </Button>
                  <Button variant="contained" onClick={() => setShowCompleteModal(true)} startIcon={<Box component={Play} sx={{ fontSize: 16 }} />}>
                    完成任务
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component={ClipboardCheck} sx={{ fontSize: 20, color: '#7c3aed' }} />
                  任务信息
                </Typography>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-500">任务编号</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {task.task_no || task.id}
                    </p>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600">关联样品</p>
                    <p className="font-medium text-purple-900">
                      {task.sample_name || "未关联"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    检验流程
                  </p>
                  <p className="text-slate-900 mt-1">{process?.name || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      检验员
                    </p>
                    <p className="text-slate-900 mt-1">
                      {task.inspector || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      创建时间
                    </p>
                    <p className="text-slate-900 mt-1">
                      {task.created_at
                        ? new Date(task.created_at).toLocaleDateString("zh-CN")
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component={CheckCircle} sx={{ fontSize: 20, color: '#16a34a' }} />
                  检验进度
                </Typography>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">完成进度</span>
                    <span className="font-medium text-slate-900">
                      {completedSteps} / {totalSteps} 步骤
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-purple-600">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  {process?.steps && (
                    <div className="space-y-2 mt-4">
                      {process.steps.map((step, index) => {
                        const isCompleted = index < completedSteps;
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-3 p-2 rounded-lg ${
                              isCompleted ? "bg-green-50" : "bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCompleted
                                  ? "bg-green-500 text-white"
                                  : "bg-slate-300 text-slate-600"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span
                              className={
                                isCompleted
                                  ? "text-green-700"
                                  : "text-slate-600"
                              }
                            >
                              {step.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component={FileText} sx={{ fontSize: 20, color: '#2563eb' }} />
                  检验记录列表
                </Typography>
              </CardHeader>
              <CardContent>
                {records.length > 0 ? (
                  <DataTable
                    columns={recordColumns}
                    data={records}
                    enablePagination={false}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无检验记录</p>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => setShowRecordModal(true)}
                      startIcon={<Box component={Plus} sx={{ fontSize: 12 }} />}
                    >
                      添加第一条记录
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showRecordModal} onClose={() => setShowRecordModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加检验记录</DialogTitle>
        <DialogContent>
          <Box className="space-y-4" sx={{ mt: 1 }}>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>检验步骤 *</Box>
              <TextField
                size="small"
                fullWidth
                value={recordForm.step_name}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    step_name: e.target.value,
                  }))
                }
                placeholder="请输入检验步骤名称"
              />
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>检验员 *</Box>
              <TextField
                size="small"
                fullWidth
                value={recordForm.inspector}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    inspector: e.target.value,
                  }))
                }
                placeholder="请输入检验员姓名"
              />
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>检验结果 *</Box>
              <textarea
                value={recordForm.result}
                onChange={(e) =>
                  setRecordForm((prev) => ({ ...prev, result: e.target.value }))
                }
                placeholder="请详细描述检验结果..."
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none', height: '128px' }}
              />
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>结论</Box>
              <select
                value={recordForm.conclusion}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    conclusion: e.target.value,
                  }))
                }
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
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
          <Button variant="outlined" onClick={() => setShowRecordModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCompleteStep}>保存记录</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showCompleteModal} onClose={() => setShowCompleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>完成检验任务</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography sx={{ color: 'text.secondary' }}>
              确定要完成此检验任务吗？这将标记所有未完成的步骤为已完成状态。
            </Typography>
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#fefce8', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1, color: '#854d0e' }}>
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">
                任务编号: {task.task_no || task.id}
              </span>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCompleteModal(false)}>取消</Button>
          <Button variant="contained" onClick={() => setShowCompleteModal(false)} sx={{ backgroundColor: '#16a34a', '&:hover': { backgroundColor: '#15803d' } }}>确认完成</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LimsTaskDetailPage;
