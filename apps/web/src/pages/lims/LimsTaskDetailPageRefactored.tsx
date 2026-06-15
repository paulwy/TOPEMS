/**
 * LimsTaskDetailPage 重构版本 (任务详情)
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 Card 组件重构信息展示区域
 * 3. 使用 ListPageTemplate 展示检验记录
 * 4. 简化样式，使用主题色
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
} from "@mui/material";
import {
  Edit,
  Package,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  Play,
  Clock,
} from "lucide-react";
import { PageHeader } from "../../components/layout";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";

interface TaskRecord {
  id: string;
  step_name: string;
  inspector: string;
  result: string;
  conclusion: string;
  created_at: string;
}

interface TaskStep {
  id: string;
  name: string;
  status: string;
}

interface Task {
  id: string;
  task_no: string;
  sample_name: string;
  process_name: string;
  inspector: string;
  status: string;
  created_at: string;
  steps: TaskStep[];
  records: TaskRecord[];
}

const mockTask: Task = {
  id: "1",
  task_no: "T2024001",
  sample_name: "水质样品A",
  process_name: "水质检测流程",
  inspector: "李检测员",
  status: "进行中",
  created_at: "2024-01-15",
  steps: [
    { id: "1", name: "样品接收", status: "已完成" },
    { id: "2", name: "预处理", status: "已完成" },
    { id: "3", name: "pH值测定", status: "已完成" },
    { id: "4", name: "溶解氧测定", status: "进行中" },
    { id: "5", name: "COD测定", status: "待检测" },
    { id: "6", name: "报告生成", status: "待检测" },
  ],
  records: [
    {
      id: "1",
      step_name: "样品接收",
      inspector: "张工程师",
      result: "样品完好，符合检测要求",
      conclusion: "合格",
      created_at: "2024-01-15 09:00",
    },
    {
      id: "2",
      step_name: "预处理",
      inspector: "李检测员",
      result: "过滤、稀释完成",
      conclusion: "合格",
      created_at: "2024-01-15 10:30",
    },
    {
      id: "3",
      step_name: "pH值测定",
      inspector: "李检测员",
      result: "pH值：7.2，符合标准",
      conclusion: "合格",
      created_at: "2024-01-15 14:00",
    },
  ],
};

const recordColumns: ColumnDef<TaskRecord>[] = [
  { accessorKey: "step_name", header: "检验步骤", width: 120 },
  { accessorKey: "inspector", header: "检验员" },
  { accessorKey: "result", header: "检验结果" },
  {
    accessorKey: "conclusion",
    header: "结论",
    render: (value) => {
      const colors: Record<string, { bg: string; color: string }> = {
        "合格": { bg: "#dcfce7", color: "#16a34a" },
        "不合格": { bg: "#fee2e2", color: "#dc2626" },
        "待定": { bg: "#fef9c3", color: "#ca8a04" },
      };
      const c = colors[value] || { bg: "#f3f4f6", color: "#4b5563" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ backgroundColor: c.bg, color: c.color, fontWeight: 500 }}
        />
      );
    },
  },
  { accessorKey: "created_at", header: "检验时间" },
];

const LimsTaskDetailPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const [task] = useState<Task>(mockTask);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [formData, setFormData] = useState({
    step_name: "",
    inspector: "",
    result: "",
    conclusion: "",
  });

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; color: string }> = {
      "待检测": { bg: "#fef9c3", color: "#ca8a04" },
      "进行中": { bg: "#dbeafe", color: "#2563eb" },
      "已完成": { bg: "#dcfce7", color: "#16a34a" },
      "已终止": { bg: "#fee2e2", color: "#dc2626" },
    };
    const colors = statusColors[status] || { bg: "#f3f4f6", color: "#4b5563" };
    return (
      <Chip
        label={status}
        size="small"
        sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const completedSteps = task.steps.filter((s) => s.status === "已完成").length;
  const totalSteps = task.steps.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleAddRecord = () => {
    setFormData({ step_name: "", inspector: task.inspector, result: "", conclusion: "" });
    setShowRecordModal(true);
  };

  const handleSaveRecord = () => {
    const newRecord: TaskRecord = {
      id: String(Date.now()),
      step_name: formData.step_name,
      inspector: formData.inspector,
      result: formData.result,
      conclusion: formData.conclusion,
      created_at: new Date().toLocaleString("zh-CN"),
    };
    console.log("New record:", newRecord);
    setShowRecordModal(false);
  };

  const handleCompleteTask = () => {
    console.log("Complete task");
    setShowCompleteModal(false);
  };

  return (
    <>
      <PageHeader
        title="检验任务详情"
        subtitle={task.task_no}
        breadcrumbs={[
          { label: "LIMS", href: "/lims" },
          { label: "任务管理", href: "/lims/tasks" },
          { label: "任务详情" },
        ]}
        actions={
          <>
            {task.status !== "已完成" && task.status !== "已终止" && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Plus style={{ width: 18, height: 18 }} />}
                  onClick={handleAddRecord}
                >
                  添加记录
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Play style={{ width: 18, height: 18 }} />}
                  onClick={() => setShowCompleteModal(true)}
                  sx={{ bgcolor: "#06b6d4" }}
                >
                  完成任务
                </Button>
              </>
            )}
          </>
        }
      />

      <Box sx={{ px: 3, pb: 4 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, lg: "320px 1fr" },
            gap: 3,
          }}
        >
          {/* 左侧信息卡片 */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  pb: 1,
                  "& .MuiCardHeader-content": { overflow: "hidden" },
                }}
              >
                <FileText style={{ width: 20, height: 20, color: "#06b6d4" }} />
                <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                  任务信息
                </Typography>
              </CardHeader>
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography variant="body2" color="text.secondary">
                      任务编号
                    </Typography>
                    {getStatusBadge(task.status)}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Package style={{ width: 14, height: 14 }} />
                      关联样品
                    </Typography>
                    <Typography sx={{ fontWeight: 500 }}>{task.sample_name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      检验流程
                    </Typography>
                    <Typography>{task.process_name}</Typography>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <User style={{ width: 14, height: 14 }} />
                        检验员
                      </Typography>
                      <Typography>{task.inspector}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Clock style={{ width: 14, height: 14 }} />
                        创建时间
                      </Typography>
                      <Typography>{task.created_at}</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  pb: 1,
                  "& .MuiCardHeader-content": { overflow: "hidden" },
                }}
              >
                <CheckCircle style={{ width: 20, height: 20, color: "#06b6d4" }} />
                <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                  检验进度
                </Typography>
              </CardHeader>
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      完成进度
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {completedSteps} / {totalSteps} 步骤
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progressPercent}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "#e2e8f0",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "#06b6d4",
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: "#06b6d4" }}>
                      {Math.round(progressPercent)}%
                    </Typography>
                  </Box>

                  {task.steps.length > 0 && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
                      {task.steps.map((step, index) => {
                        const isCompleted = step.status === "已完成";
                        const isInProgress = step.status === "进行中";
                        return (
                          <Box
                            key={step.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              p: 1,
                              borderRadius: 1,
                              bgcolor: isCompleted
                                ? "#dcfce7"
                                : isInProgress
                                  ? "#dbeafe"
                                  : "#f8fafc",
                            }}
                          >
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: isCompleted ? "#16a34a" : isInProgress ? "#2563eb" : "#cbd5e1",
                                color: "white",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                              }}
                            >
                              {isCompleted ? "✓" : index + 1}
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: isCompleted ? "#166534" : isInProgress ? "#1e40af" : "#64748b",
                                fontWeight: isInProgress ? 500 : 400,
                              }}
                            >
                              {step.name}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* 右侧列表 */}
          <Card>
            <CardHeader
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                pb: 1,
                "& .MuiCardHeader-content": { overflow: "hidden" },
              }}
            >
              <FileText style={{ width: 20, height: 20, color: "#06b6d4" }} />
              <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                检验记录列表
              </Typography>
            </CardHeader>
            <CardContent sx={{ pt: 0 }}>
              <ListPageTemplate
                columns={recordColumns}
                data={task.records}
                pagination={{
                  page: 1,
                  pageSize: 10,
                  total: task.records.length,
                  onPageChange: () => {},
                  onPageSizeChange: () => {},
                }}
                emptyMessage="暂无检验记录"
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 添加记录模态框 */}
      <Dialog open={showRecordModal} onClose={() => setShowRecordModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加检验记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="检验步骤 *"
              value={formData.step_name}
              onChange={(e) => setFormData({ ...formData, step_name: e.target.value })}
              placeholder="请输入检验步骤"
            />
            <TextField
              fullWidth
              label="检验员"
              value={formData.inspector}
              onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
            />
            <TextField
              fullWidth
              label="检验结果"
              value={formData.result}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              placeholder="请输入检验结果"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              select
              label="结论"
              value={formData.conclusion}
              onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
            >
              <option value="">请选择</option>
              <option value="合格">合格</option>
              <option value="不合格">不合格</option>
              <option value="待定">待定</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRecordModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveRecord} sx={{ bgcolor: "#06b6d4" }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 完成任务模态框 */}
      <Dialog open={showCompleteModal} onClose={() => setShowCompleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>完成检验任务</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Box
              sx={{
                p: 2,
                bgcolor: "#fef9c3",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "#854d0e",
                mb: 2,
              }}
            >
              <AlertCircle style={{ width: 20, height: 20 }} />
              <Typography variant="body2">
                确定要完成此检验任务吗？这将标记所有未完成的步骤为已完成状态。
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              任务编号: {task.task_no}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompleteModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCompleteTask} sx={{ bgcolor: "#16a34a" }}>
            确认完成
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LimsTaskDetailPageRefactored;
