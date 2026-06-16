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
    const statusMap: Record<
      string,
      { bg: string; color: string; label: string }
    > = {
      pending: { bg: "#fef9c3", color: "#ca8a04", label: "待测试" },
      待测试: { bg: "#fef9c3", color: "#ca8a04", label: "待测试" },
      in_progress: { bg: "#dbeafe", color: "#2563eb", label: "进行中" },
      进行中: { bg: "#dbeafe", color: "#2563eb", label: "进行中" },
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #e9d5ff", borderTop: "4px solid #9333ea", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px auto" }}></div>
          <p style={{ color: "#475569" }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle sx={{ width: 64, height: 64, color: "#ef4444", margin: "0 auto 16px auto" }} />
          <p style={{ color: "#475569" }}>检验任务不存在或已被删除</p>
          <Button onClick={() => navigate("/lims")} sx={{ mt: 2 }}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
      <Box component="header" sx={{ bgcolor: "background.paper", boxShadow: 1, borderBottom: 1, borderColor: "divider", position: "sticky", top: 0, zIndex: 10 }}>
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Button
                variant="text"
                onClick={() => navigate("/lims")}
                sx={{ minWidth: 32, height: 32 }}
              >
                <Box component={ArrowLeft} sx={{ fontSize: 20 }} />
              </Button>
              <div>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                  检验任务详情
                </h1>
                <p style={{ fontSize: "0.75rem", color: "#64748b" }}>Inspection Task Detail</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {task.status !== "completed" && task.status !== "已完成" && (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => setShowRecordModal(true)}
                    startIcon={<Box component={Plus} sx={{ fontSize: 16 }} />}
                  >
                    添加记录
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setShowCompleteModal(true)}
                    startIcon={<Box component={Play} sx={{ fontSize: 16 }} />}
                  >
                    完成任务
                  </Button>
                </>
              )}
            </div>
          </div>
        </Box>
      </Box>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 16px" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: { lg: "span 1" } }}>
            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    component={ClipboardCheck}
                    sx={{ fontSize: 20, color: "#7c3aed" }}
                  />
                  任务信息
                </Typography>
              </CardHeader>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>任务编号</p>
                    <p style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a", marginTop: 4 }}>
                      {task.task_no || task.id}
                    </p>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#faf5ff", borderRadius: 8 }}>
                  <Package sx={{ width: 20, height: 20, color: "#9333ea" }} />
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#9333ea" }}>关联样品</p>
                    <p style={{ color: "#581c87", fontWeight: 500 }}>
                      {task.sample_name || "未关联"}
                    </p>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <FileText sx={{ width: 12, height: 12 }} />
                    检验流程
                  </p>
                  <p style={{ color: "#0f172a", marginTop: 4 }}>{process?.name || "-"}</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                      <User sx={{ width: 12, height: 12 }} />
                      检验员
                    </p>
                    <p style={{ color: "#0f172a", marginTop: 4 }}>
                      {task.inspector || "-"}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock sx={{ width: 12, height: 12 }} />
                      创建时间
                    </p>
                    <p style={{ color: "#0f172a", marginTop: 4 }}>
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
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    component={CheckCircle}
                    sx={{ fontSize: 20, color: "#16a34a" }}
                  />
                  检验进度
                </Typography>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                    <span style={{ color: "#475569" }}>完成进度</span>
                    <span style={{ fontWeight: 500, color: "#0f172a" }}>
                      {completedSteps} / {totalSteps} 步骤
                    </span>
                  </div>
                  <div style={{ height: 12, backgroundColor: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{ height: "100%", background: "linear-gradient(to right, #a855f7, #ec4899)", width: `${progressPercent}%`, transition: "all 0.3s" }}
                    ></div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: "1.875rem", fontWeight: 700, color: "#9333ea" }}>
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  {process?.steps && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                      {process.steps.map((step, index) => {
                        const isCompleted = index < completedSteps;
                        return (
                          <div
                            key={index}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 8, backgroundColor: isCompleted ? "#f0fdf4" : "#f8fafc" }}
                          >
                            <div
                              style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", fontWeight: 500, backgroundColor: isCompleted ? "#22c55e" : "#cbd5e1", color: isCompleted ? "#ffffff" : "#475569" }}
                            >
                              {isCompleted ? (
                                <CheckCircle sx={{ width: 16, height: 16 }} />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span
                              style={{ color: isCompleted ? "#15803d" : "#475569" }}
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
          </Box>

          <Box sx={{ gridColumn: { lg: "span 2" } }}>
            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 1,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    component={FileText}
                    sx={{ fontSize: 20, color: "#2563eb" }}
                  />
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
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
                    <FileText sx={{ width: 64, height: 64, margin: "0 auto 16px auto", opacity: 0.5 }} />
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
          </Box>
        </Box>
      </main>

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
                检验步骤 *
              </Box>
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
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                检验员 *
              </Box>
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
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                检验结果 *
              </Box>
              <textarea
                value={recordForm.result}
                onChange={(e) =>
                  setRecordForm((prev) => ({ ...prev, result: e.target.value }))
                }
                placeholder="请详细描述检验结果..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "128px",
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
                value={recordForm.conclusion}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    conclusion: e.target.value,
                  }))
                }
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
          <Button variant="contained" onClick={handleCompleteStep}>
            保存记录
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>完成检验任务</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography sx={{ color: "text.secondary" }}>
              确定要完成此检验任务吗？这将标记所有未完成的步骤为已完成状态。
            </Typography>
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: "#fefce8",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "#854d0e",
              }}
            >
              <AlertCircle sx={{ width: 20, height: 20 }} />
              <span style={{ fontSize: "0.875rem" }}>
                任务编号: {task.task_no || task.id}
              </span>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setShowCompleteModal(false)}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={() => setShowCompleteModal(false)}
            sx={{
              backgroundColor: "#16a34a",
              "&:hover": { backgroundColor: "#15803d" },
            }}
          >
            确认完成
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LimsTaskDetailPage;
