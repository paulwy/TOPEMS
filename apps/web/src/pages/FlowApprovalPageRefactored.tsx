/**
 * FlowApprovalPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代 Card + Table 布局
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
  Stack,
  Tabs,
  Tab,
  FormLabel,
  IconButton,
} from "@mui/material";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  List,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { Approval } from "../api/flow";
import { flowApi } from "../api/flow";
import { useAppStore } from "../store";
import { ListPageTemplate, type ColumnDef } from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 类型定义 ============
interface FilterValues {
  search: string;
  status: string;
}

interface ApprovalData {
  items: Approval[];
  total: number;
  page: number;
  page_size: number;
}

// ============ 列定义 ============
const columns: ColumnDef<Approval>[] = [
  {
    id: "task_name",
    header: "任务名称",
    accessor: "task_name",
    sortable: true,
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "success" | "error" | "warning" | "default" }> = {
        approved: { label: "已通过", color: "success" },
        rejected: { label: "已拒绝", color: "error" },
        pending: { label: "待审批", color: "warning" },
      };
      const config = statusMap[value] || { label: value, color: "default" as const };
      return <Chip size="small" label={config.label} color={config.color} />;
    },
  },
  {
    id: "node_id",
    header: "节点",
    accessor: "node_id",
    render: (value) => value || "-",
  },
  {
    id: "approval_type",
    header: "审批类型",
    accessor: "approval_type",
    render: (value) => {
      const typeMap: Record<string, string> = {
        single: "单人审批",
        counter: "会签审批",
        or: "或签审批",
      };
      return typeMap[value] || value || "-";
    },
  },
  {
    id: "created_at",
    header: "创建时间",
    accessor: "created_at",
    render: (value) => new Date(value as string).toLocaleString(),
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索审批任务...",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "pending", label: "待审批" },
    ],
  },
];

// ============ 组件 ============
const FlowApprovalPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApprovalData>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    status: "pending",
  });

  // Tab 状态
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  // 模态框状态
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // 获取审批列表
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (activeTab === "pending") params.status = "pending";
      if (filtersValue.search) params.search = filtersValue.search;

      const response = await flowApi.listApprovals(params);
      if (response.success && response.data) {
        const responseData = response.data as any;
        const items = Array.isArray(responseData) ? responseData : responseData.items || [];
        setData({
          items,
          total: items.length,
          page: data.page,
          page_size: data.page_size,
        });
      } else {
        setData({ items: [], total: 0, page: 1, page_size: 10 });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取审批数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, activeTab, filtersValue, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFiltersValue((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理查看
  const handleView = useCallback(
    (approval: Approval) => {
      navigate(`/flow/approvals/${approval.id}`);
    },
    [navigate],
  );

  // 处理审批（通过/拒绝）
  const handleApproval = useCallback((approval: Approval, action: "approve" | "reject") => {
    setSelectedApproval(approval);
    setApprovalAction(action);
    setComment("");
    setShowApprovalModal(true);
  }, []);

  // 处理审批提交
  const handleProcessApproval = useCallback(async () => {
    if (!selectedApproval) return;
    if (!comment.trim() && approvalAction === "reject") {
      addNotification({
        title: "提示",
        message: "请输入拒绝原因",
        type: "info",
      });
      return;
    }

    try {
      setProcessing(true);
      const response = await flowApi.processApproval(selectedApproval.id, {
        action: approvalAction,
        comment: comment || undefined,
        actor_id: "system-user-id",
        actor_name: "Current User",
      });

      if (response.success) {
        addNotification({
          title: "成功",
          message: `审批${approvalAction === "approve" ? "通过" : "拒绝"}成功`,
          type: "success",
        });
        setShowApprovalModal(false);
        setSelectedApproval(null);
        setComment("");
        fetchApprovals();
      } else {
        addNotification({
          title: "失败",
          message: response.message || "操作失败",
          type: "error",
        });
      }
    } catch (error: any) {
      addNotification({
        title: "错误",
        message: "处理审批失败",
        type: "error",
      });
    } finally {
      setProcessing(false);
    }
  }, [selectedApproval, approvalAction, comment, addNotification, fetchApprovals]);

  // 统计待审批数量
  const pendingCount = data.items.filter((a) => a.status === "pending").length;

  // 初始加载
  React.useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  return (
    <>
      <PageHeader
        title="审批管理"
        subtitle={
          pendingCount > 0 ? (
            <Box component="span" sx={{ color: "primary.main", fontWeight: 500 }}>
              {pendingCount} 项待审批
            </Box>
          ) : (
            "暂无待审批项"
          )
        }
        showBack
        onBack={() => navigate(-1)}
      />

      <Box sx={{ bgcolor: "white", borderRadius: 1, boxShadow: 1, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 3 }}
        >
          <Tab
            value="pending"
            label={
              <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                <Clock size={20} />
                <span>待我审批 ({pendingCount})</span>
              </Stack>
            }
          />
          <Tab
            value="history"
            label={
              <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                <List size={20} />
                <span>审批历史</span>
              </Stack>
            }
          />
        </Tabs>
      </Box>

      <ListPageTemplate
        columns={columns}
        data={data.items}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page: data.page,
          pageSize: data.page_size,
          total: data.total,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage={activeTab === "pending" ? "暂无待审批项" : "暂无审批记录"}
        customActions={
          <IconButton onClick={fetchApprovals} title="刷新">
            <Loader2
              size={20}
              sx={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
          </IconButton>
        }
        renderRowActions={(approval) =>
          approval.status === "pending" ? (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproval(approval, "approve");
                }}
                startIcon={<CheckCircle size={16} />}
              >
                通过
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproval(approval, "reject");
                }}
                startIcon={<XCircle size={16} />}
              >
                拒绝
              </Button>
            </Stack>
          ) : (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleView(approval);
              }}
              title="查看详情"
            >
              <Eye size={20} />
            </IconButton>
          )
        }
      />

      {/* 审批确认对话框 */}
      <Dialog
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {approvalAction === "approve" ? "通过审批" : "拒绝审批"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedApproval && (
              <>
                <Box>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    任务
                  </Box>
                  <Box>{selectedApproval.task_name}</Box>
                </Box>
                {selectedApproval.node_id && (
                  <Box>
                    <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                      节点
                    </Box>
                    <Box>{selectedApproval.node_id}</Box>
                  </Box>
                )}
              </>
            )}
            <Box>
              <FormLabel>
                {approvalAction === "reject" ? "拒绝原因 *" : "备注"}
              </FormLabel>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  approvalAction === "reject" ? "请输入拒绝原因" : "可选备注"
                }
                sx={{ mt: 1 }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setShowApprovalModal(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleProcessApproval}
            disabled={processing || (approvalAction === "reject" && !comment.trim())}
            color={approvalAction === "approve" ? "success" : "error"}
            startIcon={
              processing ? (
                <Loader2
                  size={16}
                  sx={{ animation: "spin 1s linear infinite" }}
                />
              ) : undefined
            }
          >
            {approvalAction === "approve" ? "确认通过" : "确认拒绝"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FlowApprovalPageRefactored;
