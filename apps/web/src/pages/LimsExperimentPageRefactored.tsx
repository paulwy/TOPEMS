/**
 * LimsExperimentPage 重构版本 (实验记录)
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
  FlaskConical,
} from "lucide-react";
import {
  rsApi,
  type Experiment,
  type CreateExperimentRequest,
} from "../api/rs";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 列定义 ============
const columns: ColumnDef<Experiment>[] = [
  {
    id: "name",
    header: "实验名称",
    accessor: "name",
    sortable: true,
    width: 200,
  },
  {
    id: "code",
    header: "实验编号",
    accessor: "code",
    sortable: true,
    width: 120,
  },
  {
    id: "experiment_type",
    header: "实验类型",
    accessor: "experiment_type",
    width: 100,
    render: (value) => {
      const typeColors: Record<string, { bg: string; color: string }> = {
        "小试": { bg: "info.light", color: "info.dark" },
        "中试": { bg: "warning.light", color: "warning.dark" },
        "量产": { bg: "success.light", color: "success.dark" },
      };
      const colors = typeColors[value] || { bg: "grey.200", color: "grey.700" };
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
    id: "phase",
    header: "阶段",
    accessor: "phase",
    width: 80,
  },
  {
    id: "experimenter",
    header: "实验员",
    accessor: "experimenter",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusColors: Record<string, { bg: string; color: string }> = {
        "待开始": { bg: "warning.light", color: "warning.dark" },
        "进行中": { bg: "info.light", color: "info.dark" },
        "已完成": { bg: "success.light", color: "success.dark" },
        "已终止": { bg: "error.light", color: "error.dark" },
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
    id: "started_at",
    header: "开始日期",
    accessor: "started_at",
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString("zh-CN");
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (experiment: Experiment) => void,
  onEdit: (experiment: Experiment) => void,
  onDelete: (experiment: Experiment) => void,
): RowAction<Experiment>[] => [
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
      { value: "待开始", label: "待开始" },
      { value: "进行中", label: "进行中" },
      { value: "已完成", label: "已完成" },
      { value: "已终止", label: "已终止" },
    ],
    value: "all",
  },
  {
    id: "experiment_type",
    label: "实验类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "小试", label: "小试" },
      { value: "中试", label: "中试" },
      { value: "量产", label: "量产" },
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
const LimsExperimentPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Experiment[];
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
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Experiment>>({});

  // 获取实验列表
  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.experiment_type = typeFilter;

      const response = await rsApi.listExperiments(params);
      if (response.success && response.data) {
        const responseData = response.data as any;
        const items = Array.isArray(responseData)
          ? responseData
          : responseData.experiments || [];
        setData({
          items: items,
          total: responseData.total || items.length,
          page: responseData.page || 1,
          page_size: responseData.page_size || 10,
        });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取实验数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, searchText, statusFilter, typeFilter, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
      if (filterId === "experiment_type") setTypeFilter(value);
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
  const handleView = useCallback((experiment: Experiment) => {
    setSelectedExperiment(experiment);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((experiment: Experiment) => {
    setSelectedExperiment(experiment);
    setFormData(experiment);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (experiment: Experiment) => {
      if (!window.confirm(`确定要删除实验"${experiment.name}"吗?`)) return;
      try {
        await rsApi.deleteExperiment(experiment.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "实验已删除",
        });
        fetchExperiments();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除实验",
        });
      }
    },
    [addNotification, fetchExperiments],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    try {
      const createData: CreateExperimentRequest = {
        name: formData.name || "",
        code: formData.code || "",
        project_id: formData.project_id || "",
        experiment_type: formData.experiment_type || "小试",
        phase: formData.phase || "小试",
        objective: formData.objective || "",
        method: formData.method || "",
        experimenter: formData.experimenter || "",
      };
      await rsApi.createExperiment(createData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "实验已创建",
      });
      setShowCreateModal(false);
      setFormData({});
      fetchExperiments();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: error.message || "无法创建实验",
      });
    }
  }, [formData, addNotification, fetchExperiments]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedExperiment) return;
    try {
      await rsApi.updateExperiment(selectedExperiment.id, {
        name: formData.name,
        status: formData.status,
        results: formData.results,
        conclusions: formData.conclusions,
      });
      addNotification({
        type: "success",
        title: "更新成功",
        message: "实验已更新",
      });
      setShowEditModal(false);
      setFormData({});
      fetchExperiments();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "更新失败",
        message: error.message || "无法更新实验",
      });
    }
  }, [selectedExperiment, formData, addNotification, fetchExperiments]);

  // 初始加载
  React.useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  return (
    <>
      <PageHeader
        title="实验记录"
        subtitle={`共 ${data.total} 条实验记录`}
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
              新建实验
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
        emptyMessage="暂无实验数据"
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
        <DialogTitle>实验详情</DialogTitle>
        <DialogContent>
          {selectedExperiment && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  实验名称
                </Box>
                <Box>{selectedExperiment.name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  实验编号
                </Box>
                <Box>{selectedExperiment.code}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  实验类型
                </Box>
                <Box>{selectedExperiment.experiment_type}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  阶段
                </Box>
                <Box>{selectedExperiment.phase}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  实验员
                </Box>
                <Box>{selectedExperiment.experimenter || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>{selectedExperiment.status}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  目标
                </Box>
                <Box>{selectedExperiment.objective || "-"}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  方法
                </Box>
                <Box>{selectedExperiment.method || "-"}</Box>
              </Box>
              {selectedExperiment.results && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    结果
                  </Box>
                  <Box>{String(selectedExperiment.results)}</Box>
                </Box>
              )}
              {selectedExperiment.conclusions && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    结论
                  </Box>
                  <Box>{selectedExperiment.conclusions}</Box>
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
              handleEdit(selectedExperiment!);
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
        <DialogTitle>新建实验</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="实验名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入实验名称"
            />
            <TextField
              fullWidth
              label="实验编号 *"
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="请输入实验编号"
            />
            <TextField
              fullWidth
              label="实验员"
              value={formData.experimenter || ""}
              onChange={(e) => setFormData({ ...formData, experimenter: e.target.value })}
              placeholder="请输入实验员"
            />
            <TextField
              fullWidth
              select
              label="实验类型"
              value={formData.experiment_type || "小试"}
              onChange={(e) => setFormData({ ...formData, experiment_type: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="小试">小试</option>
              <option value="中试">中试</option>
              <option value="量产">量产</option>
            </TextField>
            <TextField
              fullWidth
              select
              label="阶段"
              value={formData.phase || "小试"}
              onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="小试">小试</option>
              <option value="中试">中试</option>
              <option value="量产">量产</option>
            </TextField>
            <TextField
              fullWidth
              label="实验目标"
              value={formData.objective || ""}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              placeholder="请输入实验目标"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="实验方法"
              value={formData.method || ""}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              placeholder="请输入实验方法"
              multiline
              rows={3}
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
        <DialogTitle>编辑实验</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="实验名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入实验名称"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "待开始"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="待开始">待开始</option>
              <option value="进行中">进行中</option>
              <option value="已完成">已完成</option>
              <option value="已终止">已终止</option>
            </TextField>
            <TextField
              fullWidth
              label="实验目标"
              value={formData.objective || ""}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              placeholder="请输入实验目标"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="实验方法"
              value={formData.method || ""}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              placeholder="请输入实验方法"
              multiline
              rows={3}
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

export default LimsExperimentPageRefactored;
