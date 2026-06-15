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

// ============ 列定义 ============
const columns: ColumnDef<QualityIssue>[] = [
  {
    id: "issue_no",
    header: "异常编号",
    accessor: "issue_no",
    sortable: true,
    width: 150,
  },
  {
    id: "title",
    header: "标题",
    accessor: "title",
    sortable: true,
    width: 250,
  },
  {
    id: "severity",
    header: "严重程度",
    accessor: "severity",
    render: (value) => {
      const severityColors: Record<string, { bg: string; color: string }> = {
        "严重": { bg: "error.light", color: "error.dark" },
        "一般": { bg: "warning.light", color: "warning.dark" },
        "轻微": { bg: "info.light", color: "info.dark" },
      };
      const colors = severityColors[value] || { bg: "grey.200", color: "grey.700" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "category",
    header: "类别",
    accessor: "category",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusColors: Record<string, { bg: string; color: string }> = {
        "待处理": { bg: "warning.light", color: "warning.dark" },
        "处理中": { bg: "info.light", color: "info.dark" },
        "已关闭": { bg: "success.light", color: "success.dark" },
      };
      const colors = statusColors[value] || { bg: "grey.200", color: "grey.700" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "assignee",
    header: "负责人",
    accessor: "assignee",
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
): RowAction<QualityIssue>[] = [
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
      { value: "待处理", label: "待处理" },
      { value: "处理中", label: "处理中" },
      { value: "已关闭", label: "已关闭" },
    ],
    value: "all",
  },
  {
    id: "severity",
    label: "严重程度",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "严重", label: "严重" },
      { value: "一般", label: "一般" },
      { value: "轻微", label: "轻微" },
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
    icon: <Download style={{ width: 16, height: 16 }} />,
  },
];

// ============ 组件 ============
const QmsNonconformancePageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: QualityIssue[];
    total: number;
    page: number;
    page_size: number;
  }>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<QualityIssue>>({});

  // 获取不合格品列表
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await qmsApi.listIssues();
      if (response.success && response.data) {
        const items = response.data || [];
        setData({
          items: items,
          total: items.length,
          page: 1,
          page_size: 10,
        });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取不合格品数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
      if (filterId === "severity") setSeverityFilter(value);
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
      if (!window.confirm(`确定要删除不合格品记录"${issue.title}"吗?`)) return;
      try {
        await qmsApi.deleteIssue(issue.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "不合格品记录已删除",
        });
        fetchIssues();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除不合格品记录",
        });
      }
    },
    [addNotification, fetchIssues],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    try {
      const createData: CreateQualityIssueRequest = {
        issue_no: formData.issue_no || "",
        title: formData.title || "",
        description: formData.description || "",
        severity: formData.severity || "一般",
        category: formData.category || "",
        status: formData.status || "待处理",
        assignee: formData.assignee || "",
      };
      await qmsApi.createIssue(createData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "不合格品记录已创建",
      });
      setShowCreateModal(false);
      setFormData({});
      fetchIssues();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: error.message || "无法创建不合格品记录",
      });
    }
  }, [formData, addNotification, fetchIssues]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedIssue) return;
    try {
      await qmsApi.updateIssue(selectedIssue.id, formData as CreateQualityIssueRequest);
      addNotification({
        type: "success",
        title: "更新成功",
        message: "不合格品记录已更新",
      });
      setShowEditModal(false);
      setFormData({});
      fetchIssues();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "更新失败",
        message: error.message || "无法更新不合格品记录",
      });
    }
  }, [selectedIssue, formData, addNotification, fetchIssues]);

  // 初始加载
  React.useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return (
    <>
      <PageHeader
        title="不合格品"
        subtitle={`共 ${data.total} 条记录`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Upload style={{ width: 18, height: 18 }} />}
              onClick={() => {
                // TODO: 导入功能
              }}
            >
              导入
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download style={{ width: 18, height: 18 }} />}
              onClick={() => {
                // TODO: 导出功能
              }}
            >
              导出
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => setShowCreateModal(true)}
            >
              新建记录
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
        emptyMessage="暂无不合格品数据"
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
        <DialogTitle>不合格品详情</DialogTitle>
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
                  严重程度
                </Box>
                <Box>{selectedIssue.severity}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  类别
                </Box>
                <Box>{selectedIssue.category || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>{selectedIssue.status}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  负责人
                </Box>
                <Box>{selectedIssue.assignee || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  创建时间
                </Box>
                <Box>
                  {selectedIssue.created_at
                    ? new Date(selectedIssue.created_at).toLocaleDateString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  标题
                </Box>
                <Box>{selectedIssue.title}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  描述
                </Box>
                <Box>{selectedIssue.description || "-"}</Box>
              </Box>
              {selectedIssue.resolution && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    解决方案
                  </Box>
                  <Box>{selectedIssue.resolution}</Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowViewModal(false);
              handleEdit(selectedIssue!);
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
        <DialogTitle>新建不合格品记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="标题 *"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入标题"
            />
            <TextField
              fullWidth
              label="异常编号 *"
              value={formData.issue_no || ""}
              onChange={(e) => setFormData({ ...formData, issue_no: e.target.value })}
              placeholder="请输入异常编号"
            />
            <TextField
              fullWidth
              select
              label="严重程度"
              value={formData.severity || "一般"}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="严重">严重</option>
              <option value="一般">一般</option>
              <option value="轻微">轻微</option>
            </TextField>
            <TextField
              fullWidth
              label="类别"
              value={formData.category || ""}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="请输入类别"
            />
            <TextField
              fullWidth
              label="负责人"
              value={formData.assignee || ""}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              placeholder="请输入负责人"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "待处理"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="待处理">待处理</option>
              <option value="处理中">处理中</option>
              <option value="已关闭">已关闭</option>
            </TextField>
            <TextField
              fullWidth
              label="描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入描述"
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
        <DialogTitle>编辑不合格品记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="标题 *"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入标题"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "待处理"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="待处理">待处理</option>
              <option value="处理中">处理中</option>
              <option value="已关闭">已关闭</option>
            </TextField>
            <TextField
              fullWidth
              label="负责人"
              value={formData.assignee || ""}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              placeholder="请输入负责人"
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入描述"
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

export default QmsNonconformancePageRefactored;
