/**
 * QmsInspectionPage 重构版本 (质量检验)
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
  Shield,
} from "lucide-react";
import {
  qmsApi,
  type QualityCheck,
  type CreateQualityCheckRequest,
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
const columns: ColumnDef<QualityCheck>[] = [
  {
    id: "check_no",
    header: "检验单号",
    accessor: "check_no",
    sortable: true,
    width: 150,
  },
  {
    id: "check_type",
    header: "检验类型",
    accessor: "check_type",
    width: 120,
  },
  {
    id: "inspector",
    header: "检验员",
    accessor: "inspector",
    render: (value) => value || "-",
  },
  {
    id: "location",
    header: "检验地点",
    accessor: "location",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusColors: Record<string, { bg: string; color: string }> = {
        "待处理": { bg: "warning.light", color: "warning.dark" },
        "进行中": { bg: "info.light", color: "info.dark" },
        "已完成": { bg: "success.light", color: "success.dark" },
        "已关闭": { bg: "grey.200", color: "grey.700" },
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
    id: "check_date",
    header: "检验日期",
    accessor: "check_date",
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString("zh-CN");
    },
  },
  {
    id: "result",
    header: "检验结果",
    accessor: "result",
    render: (value) => value || "-",
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (check: QualityCheck) => void,
  onEdit: (check: QualityCheck) => void,
  onDelete: (check: QualityCheck) => void,
): RowAction<QualityCheck>[] => [
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
      { value: "进行中", label: "进行中" },
      { value: "已完成", label: "已完成" },
      { value: "已关闭", label: "已关闭" },
    ],
    value: "all",
  },
  {
    id: "check_type",
    label: "检验类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "原材料检验", label: "原材料检验" },
      { value: "过程检验", label: "过程检验" },
      { value: "成品检验", label: "成品检验" },
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
const QmsInspectionPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: QualityCheck[];
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
  const [typeFilter, setTypeFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<QualityCheck>>({});

  // 获取检验列表
  const fetchChecks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await qmsApi.listChecks();
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
        message: error.message || "获取检验数据失败",
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
      if (filterId === "check_type") setTypeFilter(value);
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
  const handleView = useCallback((check: QualityCheck) => {
    setSelectedCheck(check);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((check: QualityCheck) => {
    setSelectedCheck(check);
    setFormData(check);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (check: QualityCheck) => {
      if (!window.confirm(`确定要删除检验记录"${check.check_no}"吗?`)) return;
      try {
        await qmsApi.deleteCheck(check.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "检验记录已删除",
        });
        fetchChecks();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除检验记录",
        });
      }
    },
    [addNotification, fetchChecks],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    try {
      const createData: CreateQualityCheckRequest = {
        check_no: formData.check_no || "",
        check_type: formData.check_type || "原材料检验",
        inspector: formData.inspector || "",
        check_date: new Date().toISOString(),
        location: formData.location || "",
        result: formData.result || "",
        conclusion: formData.conclusion || "",
        status: formData.status || "进行中",
      };
      await qmsApi.createCheck(createData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "检验记录已创建",
      });
      setShowCreateModal(false);
      setFormData({});
      fetchChecks();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: error.message || "无法创建检验记录",
      });
    }
  }, [formData, addNotification, fetchChecks]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedCheck) return;
    try {
      await qmsApi.updateCheck(selectedCheck.id, formData as CreateQualityCheckRequest);
      addNotification({
        type: "success",
        title: "更新成功",
        message: "检验记录已更新",
      });
      setShowEditModal(false);
      setFormData({});
      fetchChecks();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "更新失败",
        message: error.message || "无法更新检验记录",
      });
    }
  }, [selectedCheck, formData, addNotification, fetchChecks]);

  // 初始加载
  React.useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  return (
    <>
      <PageHeader
        title="质量检验"
        subtitle={`共 ${data.total} 条检验记录`}
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
              新建检验
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
        emptyMessage="暂无检验数据"
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
        <DialogTitle>检验详情</DialogTitle>
        <DialogContent>
          {selectedCheck && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  检验单号
                </Box>
                <Box>{selectedCheck.check_no}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  检验类型
                </Box>
                <Box>{selectedCheck.check_type}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  检验员
                </Box>
                <Box>{selectedCheck.inspector || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  检验地点
                </Box>
                <Box>{selectedCheck.location || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>{selectedCheck.status}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  检验日期
                </Box>
                <Box>
                  {selectedCheck.check_date
                    ? new Date(selectedCheck.check_date).toLocaleDateString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  检验结果
                </Box>
                <Box>{selectedCheck.result || "-"}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  结论
                </Box>
                <Box>{selectedCheck.conclusion || "-"}</Box>
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
              handleEdit(selectedCheck!);
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
        <DialogTitle>新建检验</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="检验单号 *"
              value={formData.check_no || ""}
              onChange={(e) => setFormData({ ...formData, check_no: e.target.value })}
              placeholder="请输入检验单号"
            />
            <TextField
              fullWidth
              select
              label="检验类型"
              value={formData.check_type || "原材料检验"}
              onChange={(e) => setFormData({ ...formData, check_type: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="原材料检验">原材料检验</option>
              <option value="过程检验">过程检验</option>
              <option value="成品检验">成品检验</option>
            </TextField>
            <TextField
              fullWidth
              label="检验员"
              value={formData.inspector || ""}
              onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
              placeholder="请输入检验员"
            />
            <TextField
              fullWidth
              label="检验地点"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入检验地点"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "进行中"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="待处理">待处理</option>
              <option value="进行中">进行中</option>
              <option value="已完成">已完成</option>
              <option value="已关闭">已关闭</option>
            </TextField>
            <TextField
              fullWidth
              label="检验结果"
              value={formData.result || ""}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              placeholder="请输入检验结果"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="结论"
              value={formData.conclusion || ""}
              onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
              placeholder="请输入结论"
              multiline
              rows={2}
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
        <DialogTitle>编辑检验</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="检验单号 *"
              value={formData.check_no || ""}
              onChange={(e) => setFormData({ ...formData, check_no: e.target.value })}
              placeholder="请输入检验单号"
            />
            <TextField
              fullWidth
              label="检验员"
              value={formData.inspector || ""}
              onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
              placeholder="请输入检验员"
            />
            <TextField
              fullWidth
              label="检验地点"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入检验地点"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "进行中"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="待处理">待处理</option>
              <option value="进行中">进行中</option>
              <option value="已完成">已完成</option>
              <option value="已关闭">已关闭</option>
            </TextField>
            <TextField
              fullWidth
              label="检验结果"
              value={formData.result || ""}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              placeholder="请输入检验结果"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="结论"
              value={formData.conclusion || ""}
              onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
              placeholder="请输入结论"
              multiline
              rows={2}
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

export default QmsInspectionPageRefactored;
