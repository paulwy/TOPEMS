/**
 * LimsSampleDetailPage 重构版本 (样品详情)
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 Card 组件重构信息展示区域
 * 3. 使用 ListPageTemplate 展示关联检验任务
 * 4. 简化样式，使用主题色
 */

import React, { useState, useCallback } from "react";
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
} from "@mui/material";
import {
  Edit,
  Trash2,
  Package,
  Calendar,
  User,
  MapPin,
  FileText,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "../../components/layout";
import { ListPageTemplate, type ColumnDef, type RowAction } from "../../components/templates";

interface SampleTask {
  id: string;
  task_no: string;
  task_name: string;
  status: string;
  inspector: string;
  created_at: string;
}

interface SampleRecord {
  id: string;
  step_name: string;
  inspector: string;
  result: string;
  conclusion: string;
  tested_at: string;
}

interface Sample {
  id: string;
  sample_no: string;
  name: string;
  description: string;
  status: string;
  location: string;
  responsible_person: string;
  received_date: string;
  tasks: SampleTask[];
  records: SampleRecord[];
}

const mockSample: Sample = {
  id: "1",
  sample_no: "S202401001",
  name: "水质样品A",
  description: "采集自A河流断面，用于常规水质监测",
  status: "检测中",
  location: "2号样品柜",
  responsible_person: "张工程师",
  received_date: "2024-01-15",
  tasks: [
    {
      id: "1",
      task_no: "T2024001",
      task_name: "pH值检测",
      status: "已完成",
      inspector: "李检测员",
      created_at: "2024-01-15",
    },
    {
      id: "2",
      task_no: "T2024002",
      task_name: "溶解氧检测",
      status: "进行中",
      inspector: "王检测员",
      created_at: "2024-01-16",
    },
    {
      id: "3",
      task_no: "T2024003",
      task_name: "COD检测",
      status: "待检测",
      inspector: "赵检测员",
      created_at: "2024-01-17",
    },
  ],
  records: [
    {
      id: "1",
      step_name: "样品接收",
      inspector: "张工程师",
      result: "样品完好",
      conclusion: "合格",
      tested_at: "2024-01-15",
    },
    {
      id: "2",
      step_name: "预处理",
      inspector: "李检测员",
      result: "过滤完成",
      conclusion: "合格",
      tested_at: "2024-01-15",
    },
  ],
};

// ============ 任务列定义 ============
const taskColumns: ColumnDef<SampleTask>[] = [
  { accessorKey: "task_no", header: "任务编号", width: 120 },
  { accessorKey: "task_name", header: "任务名称", width: 150 },
  {
    accessorKey: "status",
    header: "状态",
    render: (value) => {
      const statusColors: Record<string, { bg: string; color: string }> = {
        "已完成": { bg: "#dcfce7", color: "#16a34a" },
        "进行中": { bg: "#dbeafe", color: "#2563eb" },
        "待检测": { bg: "#fef9c3", color: "#ca8a04" },
      };
      const colors = statusColors[value] || { bg: "#f3f4f6", color: "#4b5563" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  { accessorKey: "inspector", header: "检验员" },
  { accessorKey: "created_at", header: "创建时间" },
];

// ============ 记录列定义 ============
const recordColumns: ColumnDef<SampleRecord>[] = [
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
  { accessorKey: "tested_at", header: "检验时间" },
];

// ============ 组件 ============
const LimsSampleDetailPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const [sample, setSample] = useState<Sample>(mockSample);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Sample>>({});

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; color: string }> = {
      "待检测": { bg: "#fef9c3", color: "#ca8a04" },
      "检测中": { bg: "#dbeafe", color: "#2563eb" },
      "已完成": { bg: "#dcfce7", color: "#16a34a" },
      "已取消": { bg: "#f3f4f6", color: "#4b5563" },
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

  const handleEdit = () => {
    setFormData({
      name: sample.name,
      description: sample.description,
      status: sample.status,
      location: sample.location,
      responsible_person: sample.responsible_person,
    });
    setShowEditModal(true);
  };

  const handleSave = () => {
    setSample((prev) => ({ ...prev, ...formData }));
    setShowEditModal(false);
  };

  const handleTaskClick = (task: SampleTask) => {
    navigate(`/lims/task/${task.id}`);
  };

  const stats = {
    total: sample.records.length,
    passed: sample.records.filter((r) => r.conclusion === "合格").length,
    failed: sample.records.filter((r) => r.conclusion === "不合格").length,
    pending: sample.records.filter((r) => r.conclusion === "待定" || !r.conclusion).length,
  };

  return (
    <>
      <PageHeader
        title="样品详情"
        subtitle={sample.sample_no}
        breadcrumbs={[
          { label: "LIMS", href: "/lims" },
          { label: "样品管理", href: "/lims/samples" },
          { label: "样品详情" },
        ]}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Edit style={{ width: 18, height: 18 }} />}
              onClick={handleEdit}
            >
              编辑
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 style={{ width: 18, height: 18 }} />}
            >
              删除
            </Button>
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
                <Package style={{ width: 20, height: 20, color: "#06b6d4" }} />
                <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                  基本信息
                </Typography>
              </CardHeader>
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        样品编号
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>{sample.sample_no}</Typography>
                    </Box>
                    {getStatusBadge(sample.status)}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      样品名称
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {sample.name}
                    </Typography>
                  </Box>
                  {sample.description && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        描述
                      </Typography>
                      <Typography>{sample.description}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Calendar style={{ width: 14, height: 14 }} />
                        接收日期
                      </Typography>
                      <Typography>{sample.received_date}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <User style={{ width: 14, height: 14 }} />
                        负责人
                      </Typography>
                      <Typography>{sample.responsible_person || "-"}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <MapPin style={{ width: 14, height: 14 }} />
                      存放位置
                    </Typography>
                    <Typography>{sample.location || "-"}</Typography>
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
                <BarChart3 style={{ width: 20, height: 20, color: "#06b6d4" }} />
                <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                  检验统计
                </Typography>
              </CardHeader>
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
                  <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#f0fdfa", borderRadius: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#06b6d4" }}>
                      {stats.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      检验总数
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#dcfce7", borderRadius: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#16a34a" }}>
                      {stats.passed}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      合格
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#fee2e2", borderRadius: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#dc2626" }}>
                      {stats.failed}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      不合格
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#fef9c3", borderRadius: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#ca8a04" }}>
                      {stats.pending}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      待定
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* 右侧列表 */}
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
                  关联检验任务
                </Typography>
              </CardHeader>
              <CardContent sx={{ pt: 0 }}>
                <ListPageTemplate
                  columns={taskColumns}
                  data={sample.tasks}
                  pagination={{
                    page: 1,
                    pageSize: 10,
                    total: sample.tasks.length,
                    onPageChange: () => {},
                    onPageSizeChange: () => {},
                  }}
                  onRowClick={handleTaskClick}
                  emptyMessage="暂无检验任务"
                />
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
                  检验记录
                </Typography>
              </CardHeader>
              <CardContent sx={{ pt: 0 }}>
                <ListPageTemplate
                  columns={recordColumns}
                  data={sample.records}
                  pagination={{
                    page: 1,
                    pageSize: 10,
                    total: sample.records.length,
                    onPageChange: () => {},
                    onPageSizeChange: () => {},
                  }}
                  emptyMessage="暂无检验记录"
                />
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* 编辑模态框 */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑样品信息</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="样品名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "待检测"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="待检测">待检测</option>
              <option value="检测中">检测中</option>
              <option value="已完成">已完成</option>
              <option value="已取消">已取消</option>
            </TextField>
            <TextField
              fullWidth
              label="存放位置"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <TextField
              fullWidth
              label="负责人"
              value={formData.responsible_person || ""}
              onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: "#06b6d4" }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LimsSampleDetailPageRefactored;
