/**
 * QmsNonconformancePage 重构版本 (不合格品)
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
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import {
  qmsApi,
  type QualityIssue,
  type CreateQualityIssueRequest,
} from "../api/qms";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ Mock 数据类型 ============
interface QualityIssue {
  id: string;
  issue_no: string;
  product_name: string;
  issue_type: string;
  quantity: number;
  severity: string;
  status: string;
  handler?: string;
  created_at: string;
}

// ============ 列定义 ============
const columns: ColumnDef<QualityIssue>[] = [
  {
    id: "issue_no",
    header: "异常编号",
    accessor: "issue_no",
    sortable: true,
    width: 120,
  },
  {
    id: "product_name",
    header: "产品名称",
    accessor: "product_name",
    sortable: true,
    width: 200,
  },
  {
    id: "issue_type",
    header: "异常类型",
    accessor: "issue_type",
    render: (value) => {
      const typeMap: Record<string, string> = {
        quality: "质量问题",
        delivery: "交期问题",
        cost: "成本问题",
        other: "其他",
      };
      return typeMap[value] || value;
    },
  },
  {
    id: "quantity",
    header: "异常数量",
    accessor: "quantity",
    width: 100,
  },
  {
    id: "severity",
    header: "严重程度",
    accessor: "severity",
    render: (value) => {
      const severityMap: Record<string, { label: string; color: "success" | "warning" | "error" | "default" }> = {
        low: { label: "轻微", color: "success" },
        medium: { label: "中等", color: "warning" },
        high: { label: "严重", color: "error" },
        critical: { label: "致命", color: "error" },
      };
      const severity = severityMap[value] || { label: value, color: "default" as const };
      return <Chip label={severity.label} color={severity.color} size="small" />;
    },
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "info" | "warning" | "success" | "default" }> = {
        pending: { label: "待处理", color: "info" },
        processing: { label: "处理中", color: "warning" },
        resolved: { label: "已解决", color: "success" },
        closed: { label: "已关闭", color: "default" },
      };
      const status = statusMap[value] || { label: value, color: "default" as const };
      return <Chip label={status.label} color={status.color} size="small" />;
    },
  },
  {
    id: "handler",
    header: "处理人",
    accessor: "handler",
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
  onView: (issue: QualityIssue) => void,
  onEdit: (issue: QualityIssue) => void,
  onDelete: (issue: QualityIssue) => void,
): RowAction<QualityIssue>[] => [
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
    type: "search",
    placeholder: "搜索异常编号/产品名称...",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部状态" },
      { value: "pending", label: "待处理" },
      { value: "processing", label: "处理中" },
      { value: "resolved", label: "已解决" },
      { value: "closed", label: "已关闭" },
    ],
  },
  {
    id: "severity",
    label: "严重程度",
    type: "select",
    options: [
      { value: "all", label: "全部程度" },
      { value: "low", label: "轻微" },
      { value: "medium", label: "中等" },
      { value: "high", label: "严重" },
      { value: "critical", label: "致命" },
    ],
  },
];

// ============ Mock 数据 ============
const mockData: QualityIssue[] = [
  {
    id: "1",
    issue_no: "QI-2024-001",
    product_name: "产品A",
    issue_type: "quality",
    quantity: 100,
    severity: "high",
    status: "processing",
    handler: "张三",
    created_at: "2024-01-15",
  },
  {
    id: "2",
    issue_no: "QI-2024-002",
    product_name: "产品B",
    issue_type: "delivery",
    quantity: 50,
    severity: "medium",
    status: "pending",
    handler: "李四",
    created_at: "2024-01-16",
  },
  {
    id: "3",
    issue_no: "QI-2024-003",
    product_name: "产品C",
    issue_type: "cost",
    quantity: 200,
    severity: "low",
    status: "resolved",
    handler: "王五",
    created_at: "2024-01-17",
  },
];

// ============ 组件 ============
const QmsNonconformancePageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QualityIssue[]>(mockData);
  const [total, setTotal] = useState(mockData.length);

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<CreateQualityIssueRequest>>({});

  // 分页状态
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: string) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
      if (filterId === "severity") setSeverityFilter(value);
      setPage(1);
    },
    [],
  );

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 处理查看
  const handleView = useCallback((issue: QualityIssue) => {
    setSelectedIssue(issue);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((issue: QualityIssue) => {
    setSelectedIssue(issue);
    setFormData(issue);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (issue: QualityIssue) => {
      if (!window.confirm(`确定要删除异常单"${issue.issue_no}"吗?`)) return;
      try {
        // API call would go here
        setData((prev) => prev.filter((item) => item.id !== issue.id));
        setTotal((prev) => prev - 1);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "异常单已删除",
        });
      } catch (error) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: "无法删除异常单",
        });
      }
    },
    [addNotification],
  );

  return (
    <>
      <PageHeader
        title="不合格品管理"
        subtitle={`共 ${total} 条异常记录`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={() => setShowCreateModal(true)}
          >
            新建异常单
          </Button>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={data}
        loading={loading}
        rowActions={getRowActions(handleView, handleEdit, handleDelete)}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无异常记录"
      />

      {/* 查看模态框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>异常详情</DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  异常编号
                </Box>
                <Box>{selectedIssue.issue_no}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  产品名称
                </Box>
                <Box>{selectedIssue.product_name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  异常类型
                </Box>
                <Box>{selectedIssue.issue_type}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  异常数量
                </Box>
                <Box>{selectedIssue.quantity}</Box>
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
              if (selectedIssue) handleEdit(selectedIssue);
            }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QmsNonconformancePageRefactored;
