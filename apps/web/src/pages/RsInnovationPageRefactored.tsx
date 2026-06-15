/**
 * RsInnovationPage 重构版本 (创新提案)
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
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
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Lightbulb,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 类型定义 ============
interface InnovationProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  department: string;
  status: "proposed" | "reviewing" | "approved" | "rejected" | "implemented";
  priority: "low" | "medium" | "high";
  expected_benefit?: string;
  implementation_plan?: string;
  created_at: string;
  updated_at: string;
}

// ============ 模拟数据 ============
const mockProposals: InnovationProposal[] = [
  {
    id: "1",
    title: "生产线自动化升级方案",
    description: "建议引入自动化设备提升生产效率",
    proposer: "张三",
    department: "生产部",
    status: "approved",
    priority: "high",
    expected_benefit: "效率提升30%",
    created_at: "2024-01-15",
    updated_at: "2024-01-20",
  },
  {
    id: "2",
    title: "节能减排优化措施",
    description: "通过工艺优化降低能耗",
    proposer: "李四",
    department: "技术部",
    status: "reviewing",
    priority: "medium",
    expected_benefit: "能耗降低15%",
    created_at: "2024-01-18",
    updated_at: "2024-01-19",
  },
  {
    id: "3",
    title: "质量检测智能化",
    description: "引入AI视觉检测系统",
    proposer: "王五",
    department: "质量部",
    status: "proposed",
    priority: "high",
    created_at: "2024-01-20",
    updated_at: "2024-01-20",
  },
];

// ============ 列定义 ============
const columns: ColumnDef<InnovationProposal>[] = [
  {
    id: "title",
    header: "提案标题",
    accessor: "title",
    sortable: true,
    width: 250,
  },
  {
    id: "proposer",
    header: "提案人",
    accessor: "proposer",
    sortable: true,
    width: 100,
  },
  {
    id: "department",
    header: "部门",
    accessor: "department",
    width: 120,
  },
  {
    id: "priority",
    header: "优先级",
    accessor: "priority",
    render: (value) => {
      const colors = {
        high: { bg: "error.light", color: "error.dark" },
        medium: { bg: "warning.light", color: "warning.dark" },
        low: { bg: "info.light", color: "info.dark" },
      };
      const color = colors[value] || { bg: "grey.200", color: "grey.700" };
      const labels = { high: "高", medium: "中", low: "低" };
      return (
        <Chip
          label={labels[value] || value}
          size="small"
          sx={{ bgcolor: color.bg, color: color.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        proposed: { label: "已提议", color: "info.dark", bg: "info.light" },
        reviewing: { label: "审核中", color: "warning.dark", bg: "warning.light" },
        approved: { label: "已批准", color: "success.dark", bg: "success.light" },
        rejected: { label: "已拒绝", color: "error.dark", bg: "error.light" },
        implemented: { label: "已实施", color: "primary.dark", bg: "primary.light" },
      };
      const config = statusConfig[value] || { label: value, color: "grey.700", bg: "grey.200" };
      return (
        <Chip
          label={config.label}
          size="small"
          sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "expected_benefit",
    header: "预期收益",
    accessor: "expected_benefit",
    render: (value) => value || "-",
  },
  {
    id: "created_at",
    header: "创建时间",
    accessor: "created_at",
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString("zh-CN");
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (proposal: InnovationProposal) => void,
  onEdit: (proposal: InnovationProposal) => void,
  onDelete: (proposal: InnovationProposal) => void,
): RowAction<InnovationProposal>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: onDelete,
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
    value: "",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "proposed", label: "已提议" },
      { value: "reviewing", label: "审核中" },
      { value: "approved", label: "已批准" },
      { value: "rejected", label: "已拒绝" },
      { value: "implemented", label: "已实施" },
    ],
    value: "all",
  },
  {
    id: "priority",
    label: "优先级",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "high", label: "高" },
      { value: "medium", label: "中" },
      { value: "low", label: "低" },
    ],
    value: "all",
  },
];

// ============ 批量操作 ============
const batchActions = [
  {
    label: "批量删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    color: "error" as const,
  },
  {
    label: "批量导出",
    icon: <CheckCircle style={{ width: 16, height: 16 }} />,
  },
];

// ============ 组件 ============
const RsInnovationPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: InnovationProposal[];
    total: number;
    page: number;
    page_size: number;
  }>({
    items: mockProposals,
    total: mockProposals.length,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<InnovationProposal | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<InnovationProposal>>({});

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
      if (filterId === "priority") setPriorityFilter(value);
    },
    [],
  );

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理行选择
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  // 处理查看
  const handleView = useCallback((proposal: InnovationProposal) => {
    setSelectedProposal(proposal);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((proposal: InnovationProposal) => {
    setSelectedProposal(proposal);
    setFormData(proposal);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (proposal: InnovationProposal) => {
      if (!window.confirm(`确定要删除提案"${proposal.title}"吗?`)) return;
      try {
        // API调用
        addNotification({
          type: "success",
          title: "删除成功",
          message: "提案已删除",
        });
        // 刷新数据
        setData((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item.id !== proposal.id),
          total: prev.total - 1,
        }));
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除提案",
        });
      }
    },
    [addNotification],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    try {
      // API调用
      addNotification({
        type: "success",
        title: "创建成功",
        message: "提案已创建",
      });
      setShowCreateModal(false);
      setFormData({});
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: error.message || "无法创建提案",
      });
    }
  }, [formData, addNotification]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedProposal) return;
    try {
      // API调用
      addNotification({
        type: "success",
        title: "更新成功",
        message: "提案已更新",
      });
      setShowEditModal(false);
      setFormData({});
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "更新失败",
        message: error.message || "无法更新提案",
      });
    }
  }, [selectedProposal, formData, addNotification]);

  return (
    <>
      <PageHeader
        title="创新提案"
        subtitle={`共 ${data.total} 个提案`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => setShowCreateModal(true)}
            >
              新建提案
            </Button>
          </>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={data.items}
        loading={loading}
        rowActions={getRowActions(handleView, handleEdit, handleDelete)}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page: data.page,
          pageSize: data.page_size,
          total: data.total,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无提案数据"
        selection={{
          selected: selectedIds,
          onChange: handleSelectionChange,
        }}
        batchActions={batchActions}
      />

      {/* 查看模态框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>提案详情</DialogTitle>
        <DialogContent>
          {selectedProposal && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  提案标题
                </Box>
                <Box>{selectedProposal.title}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  提案人
                </Box>
                <Box>{selectedProposal.proposer}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  部门
                </Box>
                <Box>{selectedProposal.department}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  优先级
                </Box>
                <Box>{selectedProposal.priority === "high" ? "高" : selectedProposal.priority === "medium" ? "中" : "低"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>{selectedProposal.status}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  描述
                </Box>
                <Box>{selectedProposal.description}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  预期收益
                </Box>
                <Box>{selectedProposal.expected_benefit || "-"}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowViewModal(false);
              handleEdit(selectedProposal!);
            }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建模态框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建提案</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="提案标题 *"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入提案标题"
            />
            <TextField
              fullWidth
              label="提案人 *"
              value={formData.proposer || ""}
              onChange={(e) => setFormData({ ...formData, proposer: e.target.value })}
              placeholder="请输入提案人"
            />
            <TextField
              fullWidth
              label="部门 *"
              value={formData.department || ""}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="请输入部门"
            />
            <TextField
              fullWidth
              select
              label="优先级"
              value={formData.priority || "medium"}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              SelectProps={{ native: true }}
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </TextField>
            <TextField
              fullWidth
              label="预期收益"
              value={formData.expected_benefit || ""}
              onChange={(e) => setFormData({ ...formData, expected_benefit: e.target.value })}
              placeholder="请输入预期收益"
            />
            <TextField
              fullWidth
              label="提案描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入提案描述"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑模态框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑提案</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="提案标题 *"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入提案标题"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "proposed"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              SelectProps={{ native: true }}
            >
              <option value="proposed">已提议</option>
              <option value="reviewing">审核中</option>
              <option value="approved">已批准</option>
              <option value="rejected">已拒绝</option>
              <option value="implemented">已实施</option>
            </TextField>
            <TextField
              fullWidth
              label="预期收益"
              value={formData.expected_benefit || ""}
              onChange={(e) => setFormData({ ...formData, expected_benefit: e.target.value })}
              placeholder="请输入预期收益"
            />
            <TextField
              fullWidth
              label="提案描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入提案描述"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleUpdate}>
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsInnovationPageRefactored;
