/**
 * RsProjectPage 重构版本
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
  useTheme,
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
} from "lucide-react";
import {
  rsApi,
  type Project,
  type CreateProjectRequest,
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
const columns: ColumnDef<Project>[] = [
  {
    id: "name",
    header: "项目名称",
    accessor: "name",
    sortable: true,
    width: 200,
  },
  {
    id: "code",
    header: "项目代码",
    accessor: "code",
    sortable: true,
    width: 120,
  },
  {
    id: "project_type",
    header: "项目类型",
    accessor: "project_type",
    width: 100,
  },
  {
    id: "leader",
    header: "负责人",
    accessor: "leader",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusColors: Record<string, { bg: string; color: string }> = {
        "立项": { bg: "info.light", color: "info.dark" },
        "进行中": { bg: "primary.light", color: "primary.dark" },
        "已完成": { bg: "success.light", color: "success.dark" },
        "已终止": { bg: "error.light", color: "error.dark" },
        "草稿": { bg: "grey.200", color: "grey.700" },
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
    id: "start_date",
    header: "开始日期",
    accessor: "start_date",
    render: (value) => {
      if (!value) return "-";
      const date = new Date(value);
      return date.toLocaleDateString("zh-CN");
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (project: Project) => void,
  onEdit: (project: Project) => void,
  onDelete: (project: Project) => void,
): RowAction<Project>[] => [
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
      { value: "立项", label: "立项" },
      { value: "进行中", label: "进行中" },
      { value: "已完成", label: "已完成" },
      { value: "已终止", label: "已终止" },
      { value: "草稿", label: "草稿" },
    ],
    value: "all",
  },
  {
    id: "project_type",
    label: "项目类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "研发", label: "研发" },
      { value: "改进", label: "改进" },
      { value: "测试", label: "测试" },
      { value: "其他", label: "其他" },
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
const RsProjectPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Project[];
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Project>>({});

  // 获取项目列表
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.project_type = typeFilter;

      const response = await rsApi.listProjects(params);
      if (response.success && response.data) {
        const responseData = response.data as any;
        const items = Array.isArray(responseData)
          ? responseData
          : responseData.projects || [];
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
        message: error.message || "获取项目数据失败",
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
      if (filterId === "project_type") setTypeFilter(value);
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
  const handleView = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((project: Project) => {
    setSelectedProject(project);
    setFormData(project);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (project: Project) => {
      if (!window.confirm(`确定要删除项目"${project.name}"吗?`)) return;
      try {
        await rsApi.deleteProject(project.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "项目已删除",
        });
        fetchProjects();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除项目",
        });
      }
    },
    [addNotification, fetchProjects],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    try {
      const createData: CreateProjectRequest = {
        name: formData.name || "",
        code: formData.code || "",
        description: formData.description || "",
        project_type: formData.project_type || "研发",
        leader: formData.leader || "",
        start_date: formData.start_date || new Date().toISOString().split("T")[0],
      };
      await rsApi.createProject(createData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "项目已创建",
      });
      setShowCreateModal(false);
      setFormData({});
      fetchProjects();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: error.message || "无法创建项目",
      });
    }
  }, [formData, addNotification, fetchProjects]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedProject) return;
    try {
      await rsApi.updateProject(selectedProject.id, formData);
      addNotification({
        type: "success",
        title: "更新成功",
        message: "项目已更新",
      });
      setShowEditModal(false);
      setFormData({});
      fetchProjects();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "更新失败",
        message: error.message || "无法更新项目",
      });
    }
  }, [selectedProject, formData, addNotification, fetchProjects]);

  // 初始加载
  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <>
      <PageHeader
        title="研发项目"
        subtitle={`共 ${data.total} 个项目`}
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
              新建项目
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
        emptyMessage="暂无项目数据"
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
        <DialogTitle>项目详情</DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  项目名称
                </Box>
                <Box>{selectedProject.name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  项目代码
                </Box>
                <Box>{selectedProject.code}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  项目类型
                </Box>
                <Box>{selectedProject.project_type}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  负责人
                </Box>
                <Box>{selectedProject.leader || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>{selectedProject.status}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  开始日期
                </Box>
                <Box>
                  {selectedProject.start_date
                    ? new Date(selectedProject.start_date).toLocaleDateString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  描述
                </Box>
                <Box>{selectedProject.description || "-"}</Box>
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
              handleEdit(selectedProject!);
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
        <DialogTitle>新建项目</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="项目名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入项目名称"
            />
            <TextField
              fullWidth
              label="项目代码 *"
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="请输入项目代码"
            />
            <TextField
              fullWidth
              label="负责人 *"
              value={formData.leader || ""}
              onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
              placeholder="请输入负责人"
            />
            <TextField
              fullWidth
              select
              label="项目类型"
              value={formData.project_type || "研发"}
              onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="研发">研发</option>
              <option value="改进">改进</option>
              <option value="测试">测试</option>
              <option value="其他">其他</option>
            </TextField>
            <TextField
              fullWidth
              type="date"
              label="开始日期"
              value={formData.start_date || ""}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              label="项目描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入项目描述"
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
        <DialogTitle>编辑项目</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="项目名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入项目名称"
            />
            <TextField
              fullWidth
              label="项目代码 *"
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="请输入项目代码"
            />
            <TextField
              fullWidth
              label="负责人 *"
              value={formData.leader || ""}
              onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
              placeholder="请输入负责人"
            />
            <TextField
              fullWidth
              select
              label="项目类型"
              value={formData.project_type || "研发"}
              onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="研发">研发</option>
              <option value="改进">改进</option>
              <option value="测试">测试</option>
              <option value="其他">其他</option>
            </TextField>
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "进行中"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="立项">立项</option>
              <option value="进行中">进行中</option>
              <option value="已完成">已完成</option>
              <option value="已终止">已终止</option>
              <option value="草稿">草稿</option>
            </TextField>
            <TextField
              fullWidth
              type="date"
              label="开始日期"
              value={formData.start_date || ""}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              label="项目描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入项目描述"
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

export default RsProjectPageRefactored;
