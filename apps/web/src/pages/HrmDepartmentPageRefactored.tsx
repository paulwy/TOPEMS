/**
 * HrmDepartmentPage 重构示例
 *
 * 本文件展示了如何按照 page-refactoring-guide.md 将现有页面重构为使用模板组件
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
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Building2,
  Search,
} from "lucide-react";
import {
  departmentApi,
  type Department,
  type PaginatedResult,
} from "../api/hrm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 列定义 ============
const columns: ColumnDef<Department>[] = [
  {
    id: "name",
    header: "部门名称",
    accessor: "name",
    sortable: true,
    width: 200,
  },
  {
    id: "code",
    header: "部门代码",
    accessor: "code",
    sortable: true,
    width: 120,
  },
  {
    id: "manager",
    header: "负责人",
    accessor: "manager_name",
    render: (value) => value || "-",
  },
  {
    id: "parent",
    header: "上级部门",
    accessor: "parent_name",
    render: (value) => value || "-",
  },
  {
    id: "employee_count",
    header: "员工数",
    accessor: "employee_count",
    render: (value) => (
      <Chip
        label={value || 0}
        size="small"
        sx={{ bgcolor: "primary.light", color: "primary.contrastText" }}
      />
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => (
      <Chip
        label={value === "active" ? "启用" : "停用"}
        color={value === "active" ? "success" : "default"}
        size="small"
      />
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (dept: Department) => void,
  onEdit: (dept: Department) => void,
  onDelete: (dept: Department) => void,
): RowAction<Department>[] => [
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
    placeholder: "搜索部门名称/代码...",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "active", label: "启用" },
      { value: "inactive", label: "停用" },
    ],
  },
];

// ============ 组件 ============
const HrmDepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Department>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(
    null,
  );

  // 表单数据
  const [formData, setFormData] = useState<Partial<Department>>({});

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await departmentApi.list(params);
      if (response.code === 200 && response.data) {
        setData(response.data);
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取部门数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, searchText, statusFilter, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
    },
    [],
  );

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理查看
  const handleView = useCallback((dept: Department) => {
    setSelectedDepartment(dept);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((dept: Department) => {
    setSelectedDepartment(dept);
    setFormData(dept);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (dept: Department) => {
      if (!window.confirm(`确定要删除部门"${dept.name}"吗?`)) return;
      try {
        await departmentApi.delete(dept.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "部门已删除",
        });
        fetchDepartments();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除部门",
        });
      }
    },
    [addNotification, fetchDepartments],
  );

  // 初始加载
  React.useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return (
    <>
      <PageHeader
        title="部门管理"
        subtitle={`共 ${data.total} 个部门`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={() => setShowCreateModal(true)}
          >
            新建部门
          </Button>
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
        emptyMessage="暂无部门数据"
      />

      {/* 查看模态框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>部门详情</DialogTitle>
        <DialogContent>
          {selectedDepartment && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                部门名称
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedDepartment.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                部门代码
              </Typography>
              <Typography variant="body1">{selectedDepartment.code}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框类似 */}
    </>
  );
};

export default HrmDepartmentPage;
