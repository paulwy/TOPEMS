/**
 * HrmEmployeePage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  useTheme,
} from "@mui/material";
import {
  Users,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import {
  employeeApi,
  departmentApi,
  companyApi,
  type Employee,
  type Department,
  type Company,
  type PaginatedResult,
} from "../api/hrm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  StatCardGroup,
  EmptyState,
  type ColumnDef,
  type RowAction,
} from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";
import {
  AIHelperButton,
  AICodeGenerator,
  AIDataCompleter,
  AIFormValidator,
} from "../components/ai";
import type { CompletionItem } from "../types/ai";

type ViewMode = "list" | "tree";

// ============ 列定义 ============
const getColumns = (
  departments: Department[],
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<Employee>[] => [
  {
    id: "name",
    header: "员工信息",
    accessor: "name",
    minWidth: 200,
    render: (row: Employee) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: "primary.main",
            color: "white",
            fontSize: "0.875rem",
          }}
        >
          {row.name?.charAt(0) || "?"}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.name}
          </Typography>
          {row.employee_no && (
            <Typography variant="caption" color="text.secondary">
              {row.employee_no}
            </Typography>
          )}
        </Box>
      </Box>
    ),
  },
  {
    id: "department_id",
    header: "所属部门",
    accessor: "department_id",
    minWidth: 150,
    render: (row: Employee) => {
      const dept = departments.find((d) => d.id === row.department_id);
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Building2 sx={{ width: 16, height: 16, color: "text.secondary" }} />
          <Typography variant="body2">{dept?.name || "-"}</Typography>
        </Box>
      );
    },
  },
  {
    id: "position",
    header: "职位",
    accessor: "position",
    minWidth: 120,
    render: (row: Employee) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Briefcase sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{row.position || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "email",
    header: "邮箱",
    accessor: "email",
    minWidth: 180,
    render: (row: Employee) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Mail sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
          {row.email || "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "phone",
    header: "电话",
    accessor: "phone",
    minWidth: 130,
    render: (row: Employee) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Phone sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{row.phone || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: Employee) => getStatusBadge(row.status),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (emp: Employee) => void,
  onEdit: (emp: Employee) => void,
  onDelete: (emp: Employee) => void,
): RowAction<Employee>[] => [
  {
    label: "查看详情",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
    color: "primary",
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (row) => onDelete(row),
    color: "error",
    divider: true,
  },
];

// ============ 筛选配置 ============
const getFilters = (departments: Department[]): FilterConfig[] => [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索姓名、工号、邮箱...",
    width: 250,
  },
  {
    id: "department",
    label: "部门",
    type: "select",
    options: departments.map((d) => ({ label: d.name, value: d.id })),
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部状态", value: "all" },
      { label: "在职", value: "active" },
      { label: "离职", value: "inactive" },
    ],
  },
];

// ============ 组件 ============
const HrmEmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const addNotification = useAppStore((state) => state.addNotification);

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Employee>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [companies, setCompanies] = useState<Company[]>([]);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // AI 功能状态
  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [showAIDataCompleter, setShowAIDataCompleter] = useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = useState(false);
  const [aiGeneratorMode, setAiGeneratorMode] = useState<"create" | "edit">("create");

  // 表单数据
  const [formData, setFormData] = useState<Partial<Employee>>({});

  // 树形视图状态
  const [treeData, setTreeData] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  // 统计概览展开状态
  const [expandedStats, setExpandedStats] = useState(true);

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, "success" | "default"> = {
      active: "success",
      inactive: "default",
    };
    const labels: Record<string, string> = {
      active: "在职",
      inactive: "离职",
    };
    return (
      <Chip
        size="small"
        color={colors[status] || "default"}
        label={labels[status] || status}
        sx={{ fontWeight: 500 }}
      />
    );
  }, []);

  // 获取员工列表
  const fetchEmployees = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await employeeApi.list(params);
        if (response.code === 200 && response.data) {
          const responseData = response.data as any;
          setData({
            items: responseData.items || [],
            total: responseData.total || 0,
            page: responseData.page || 1,
            page_size: responseData.page_size || 10,
          });
          if (viewMode === "tree") {
            setFilteredEmployees(responseData.items || []);
          }
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取员工数据失败",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [addNotification, viewMode],
  );

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await departmentApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const responseData = response.data as any;
        const depts = responseData.items || [];
        setDepartments(depts);
      }
    } catch (error: any) {
      console.error("Failed to fetch departments:", error);
    }
  }, []);

  // 获取公司列表
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const responseData = response.data as any;
        setCompanies(responseData.items || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch companies:", error);
    }
  }, []);

  // 初始加载
  React.useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchCompanies();
  }, [fetchEmployees, fetchDepartments, fetchCompanies]);

  // 构建树形数据
  const buildTree = useCallback(
    (depts: Department[], emps: Employee[]): any[] => {
      const deptMap = new Map<string, any>();
      const rootNodes: any[] = [];

      depts.forEach((dept) => {
        deptMap.set(dept.id, {
          id: dept.id,
          name: dept.name,
          type: "department",
          children: [],
          data: dept,
        });
      });

      depts.forEach((dept) => {
        const node = deptMap.get(dept.id)!;
        if (dept.parent_id && deptMap.has(dept.parent_id)) {
          deptMap.get(dept.parent_id)!.children!.push(node);
        } else {
          rootNodes.push(node);
        }
      });

      emps.forEach((emp) => {
        const empNode: any = {
          id: emp.id,
          name: emp.name,
          type: "employee",
          data: emp,
        };
        if (emp.department_id && deptMap.has(emp.department_id)) {
          deptMap.get(emp.department_id)!.children!.push(empNode);
        }
      });

      return rootNodes;
    },
    [],
  );

  React.useEffect(() => {
    if (
      viewMode === "tree" &&
      departments.length > 0 &&
      filteredEmployees.length > 0
    ) {
      const tree = buildTree(departments, filteredEmployees);
      setTreeData(tree);
    }
  }, [viewMode, departments, filteredEmployees, buildTree]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = { search: searchText };
    if (departmentFilter && departmentFilter !== "all")
      params.department_id = departmentFilter;
    if (statusFilter && statusFilter !== "all") params.status = statusFilter;

    if (viewMode === "list") {
      fetchEmployees(params);
    } else {
      setLoading(true);
      employeeApi
        .list({ ...params, page_size: 100 })
        .then((response) => {
          if (response.code === 200 && response.data) {
            const responseData = response.data as any;
            const emps = responseData.items || [];
            setFilteredEmployees(emps);
            const tree = buildTree(departments, emps);
            setTreeData(tree);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [
    searchText,
    departmentFilter,
    statusFilter,
    viewMode,
    fetchEmployees,
    departments,
    buildTree,
  ]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setDepartmentFilter("all");
    setStatusFilter("all");
    if (viewMode === "list") {
      fetchEmployees();
    } else {
      fetchEmployees({ page_size: 100 });
    }
  }, [viewMode, fetchEmployees]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedEmployee(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: Employee) => {
    setSelectedEmployee(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: Employee) => {
    setSelectedEmployee(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (emp: Employee) => {
      if (!confirm(`确定要删除员工"${emp.name}"吗？`)) return;
      try {
        const response = await employeeApi.delete(emp.id);
        if (response.code === 200) {
          addNotification({
            title: "成功",
            message: "员工删除成功",
            type: "success",
          });
          if (viewMode === "list") {
            fetchEmployees();
          } else {
            const newEmps = filteredEmployees.filter((e) => e.id !== emp.id);
            setFilteredEmployees(newEmps);
            const tree = buildTree(departments, newEmps);
            setTreeData(tree);
          }
        } else {
          addNotification({
            title: "失败",
            message: "删除员工失败",
            type: "error",
          });
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除员工失败",
          type: "error",
        });
      }
    },
    [addNotification, viewMode, fetchEmployees, filteredEmployees, departments, buildTree],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await employeeApi.create(formData);
        addNotification({
          title: "成功",
          message: "员工创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        if (viewMode === "list") {
          fetchEmployees();
        } else {
          fetchEmployees({ page_size: 100 });
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建员工失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, viewMode, fetchEmployees],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedEmployee) return;
      try {
        await employeeApi.update(selectedEmployee.id, formData);
        addNotification({
          title: "成功",
          message: "员工更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedEmployee(null);
        if (viewMode === "list") {
          fetchEmployees();
        } else {
          fetchEmployees({ page_size: 100 });
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新员工失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedEmployee, formData, viewMode, fetchEmployees],
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // AI 功能
  const handleOpenAICodeGenerator = useCallback((mode: "create" | "edit") => {
    setAiGeneratorMode(mode);
    setShowAICodeGenerator(true);
  }, []);

  const handleSelectAICode = useCallback((code: string) => {
    setFormData((prev) => ({ ...prev, employee_no: code }));
  }, []);

  const handleOpenAIDataCompleter = useCallback(() => {
    setShowAIDataCompleter(true);
  }, []);

  const handleApplyCompletion = useCallback(
    (completions: Record<string, CompletionItem>) => {
      const updates: Record<string, any> = {};
      Object.entries(completions).forEach(([field, item]) => {
        updates[field] = item.value;
      });
      setFormData((prev) => ({ ...prev, ...updates }));
      setShowAIDataCompleter(false);
    },
    [],
  );

  const handleOpenAIFormValidator = useCallback(() => {
    setShowAIFormValidator(true);
  }, []);

  const handleApplyValidationSuggestions = useCallback((suggestions: any[]) => {
    const updates: Record<string, any> = {};
    suggestions.forEach((s) => {
      updates[s.field] = s.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIFormValidator(false);
  }, []);

  // 统计卡片数据
  const employeeStats = useMemo(() => {
    const allEmployees = data.items;
    return {
      total: allEmployees.length,
      active: allEmployees.filter((e) => e.status === "active").length,
      inactive: allEmployees.filter((e) => e.status === "inactive").length,
      activeRate:
        allEmployees.length > 0
          ? Math.round(
              (allEmployees.filter((e) => e.status === "active").length /
                allEmployees.length) *
                100,
            )
          : 0,
    };
  }, [data.items]);

  // 统计卡片
  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "员工总数",
        value: employeeStats.total,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "active",
        title: "在职员工",
        value: employeeStats.active,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "inactive",
        title: "离职员工",
        value: employeeStats.inactive,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "error" as const,
      },
      {
        id: "rate",
        title: "在职率",
        value: `${employeeStats.activeRate}%`,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "secondary" as const,
      },
    ],
    [employeeStats],
  );

  const columns = useMemo(() => getColumns(departments, getStatusBadge), [departments, getStatusBadge]);
  const rowActions = useMemo(() => getRowActions(handleView, handleEdit, handleDelete), [handleView, handleEdit, handleDelete]);
  const filterConfigs = useMemo(() => getFilters(departments), [departments]);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.department !== undefined) setDepartmentFilter(filters.department);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="员工管理"
        subtitle={`共 ${data.total} 名员工`}
        showBack
        onBack={() => navigate(-1)}
        actions={[
          {
            label: "新增员工",
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleAdd,
            variant: "contained",
            color: "primary",
          },
        ]}
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: "hidden" }}>
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            "&:hover": { bgcolor: "action.hover" },
          }}
          onClick={() => setExpandedStats(!expandedStats)}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            员工概览
          </Typography>
          {expandedStats ? (
            <ChevronUp sx={{ color: "text.secondary" }} />
          ) : (
            <ChevronDown sx={{ color: "text.secondary" }} />
          )}
        </Box>

        {expandedStats && (
          <Box sx={{ p: 2, pt: 0 }}>
            <StatCardGroup stats={statCards} columns={4} />
          </Box>
        )}
      </Paper>

      {/* 筛选栏 */}
      <FilterBar
        filters={filterConfigs}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        onSearch={handleSearch}
      />

      {/* 操作栏 */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              bgcolor: "grey.100",
              borderRadius: 1,
              p: 0.5,
            }}
          >
            <Button
              size="small"
              variant={viewMode === "list" ? "contained" : "text"}
              onClick={() => setViewMode("list")}
              startIcon={<List style={{ width: 16, height: 16 }} />}
              sx={viewMode === "list" ? { bgcolor: "primary.main" } : {}}
            >
              列表
            </Button>
            <Button
              size="small"
              variant={viewMode === "tree" ? "contained" : "text"}
              onClick={() => setViewMode("tree")}
              startIcon={<LayoutGrid style={{ width: 16, height: 16 }} />}
              sx={viewMode === "tree" ? { bgcolor: "primary.main" } : {}}
            >
              树形
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 列表/树形视图 */}
      {viewMode === "list" ? (
        <Paper sx={{ borderRadius: 2 }}>
          <ListPageTemplate
            title="员工列表"
            columns={columns}
            data={data.items}
            loading={loading}
            pagination={{
              page: data.page - 1,
              pageSize: data.page_size,
              total: data.total,
              onPageChange: (page) => fetchEmployees({ page: page + 1 }),
              onPageSizeChange: (pageSize) => fetchEmployees({ page_size: pageSize }),
            }}
            rowActions={rowActions}
            onRowClick={handleView}
            emptyMessage="暂无员工数据"
          />
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { md: "1fr 2fr" },
            gap: 3,
          }}
        >
          {/* 部门树 */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              部门列表
            </Typography>
            {loading ? (
              <Typography color="text.secondary">加载中...</Typography>
            ) : treeData.length === 0 ? (
              <EmptyState emoji="🏢" title="暂无部门数据" compact />
            ) : (
              <TreeViewComponent
                data={treeData}
                selectedId={selectedDeptId}
                onSelect={(node: any) => {
                  if (node.type === "department") {
                    setSelectedDeptId(node.id);
                  } else {
                    handleView(node.data);
                  }
                }}
              />
            )}
          </Paper>

          {/* 部门员工 */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            {selectedDeptId ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {departments.find((d) => d.id === selectedDeptId)?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {
                      filteredEmployees.filter((e) => e.department_id === selectedDeptId)
                        .length
                    }{" "}
                    名员工
                  </Typography>
                </Box>
                <ListPageTemplate
                  title={departments.find((d) => d.id === selectedDeptId)?.name || "部门员工"}
                  columns={columns}
                  data={filteredEmployees.filter((e) => e.department_id === selectedDeptId)}
                  rowActions={rowActions}
                  onRowClick={handleView}
                  emptyMessage="该部门暂无员工"
                />
              </>
            ) : (
              <EmptyState
                emoji="👈"
                title="选择部门查看员工"
                description="从左侧部门树中选择一个部门，查看部门成员信息"
                compact
              />
            )}
          </Paper>
        </Box>
      )}

      {/* 新增/编辑模态框 */}
      <EmployeeFormDialog
        open={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        mode={showCreateModal ? "create" : "edit"}
        employee={selectedEmployee}
        formData={formData}
        onChange={handleInputChange}
        onSubmit={showCreateModal ? handleCreate : handleUpdate}
        companies={companies}
        departments={departments}
        onOpenAICodeGenerator={handleOpenAICodeGenerator}
        onOpenAIDataCompleter={handleOpenAIDataCompleter}
        onOpenAIFormValidator={handleOpenAIFormValidator}
      />

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>员工详情</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  员工姓名
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedEmployee.name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  工号
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedEmployee.employee_no || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  邮箱
                </Typography>
                <Typography variant="body2">{selectedEmployee.email || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  电话
                </Typography>
                <Typography variant="body2">{selectedEmployee.phone || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  部门
                </Typography>
                <Typography variant="body2">
                  {departments.find((d) => d.id === selectedEmployee.department_id)?.name || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  职位
                </Typography>
                <Typography variant="body2">{selectedEmployee.position || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  入职日期
                </Typography>
                <Typography variant="body2">{selectedEmployee.hire_date || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedEmployee.status)}</Box>
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
              handleEdit(selectedEmployee!);
            }}
            sx={{ bgcolor: "primary.main" }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI 组件 */}
      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{ entityType: "employee", name: (formData as Employee)?.name }}
        onSelect={handleSelectAICode}
        existingCodes={data.items.map((e) => e.employee_no).filter(Boolean) as string[]}
      />
      <AIDataCompleter
        isOpen={showAIDataCompleter}
        onClose={() => setShowAIDataCompleter(false)}
        completeRequest={{
          partialData: formData,
          context: { module: "hrm", entityType: "employee" },
        }}
        onApplyCompletion={handleApplyCompletion}
      />
      <AIFormValidator
        isOpen={showAIFormValidator}
        onClose={() => setShowAIFormValidator(false)}
        validateRequest={{
          data: formData,
          context: { module: "hrm", entityType: "employee" },
        }}
        onApplySuggestions={handleApplyValidationSuggestions}
        onFixIssue={() => {}}
      />
    </Box>
  );
};

// ============ 员工表单模态框 ============
interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  employee: Employee | null;
  formData: Partial<Employee>;
  onChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  companies: Company[];
  departments: Department[];
  onOpenAICodeGenerator: (mode: "create" | "edit") => void;
  onOpenAIDataCompleter: () => void;
  onOpenAIFormValidator: () => void;
}

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onClose,
  mode,
  employee,
  formData,
  onChange,
  onSubmit,
  companies,
  departments,
  onOpenAICodeGenerator,
  onOpenAIDataCompleter,
  onOpenAIFormValidator,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{mode === "create" ? "新增员工" : "编辑员工"}</DialogTitle>
    <DialogContent>
      <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2, pt: 1 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>所属公司 *</InputLabel>
          <Select
            value={(formData as Employee)?.company_id || ""}
            label="所属公司 *"
            onChange={(e) => onChange("company_id", e.target.value)}
            required
          >
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="员工姓名 *"
            size="small"
            value={(formData as Employee)?.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
          <Box sx={{ position: "relative" }}>
            <TextField
              label="工号"
              size="small"
              value={(formData as Employee)?.employee_no || ""}
              onChange={(e) => onChange("employee_no", e.target.value)}
              fullWidth
            />
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="邮箱"
            type="email"
            size="small"
            value={(formData as Employee)?.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
          />
          <TextField
            label="电话"
            size="small"
            value={(formData as Employee)?.phone || ""}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </Box>

        <FormControl size="small" fullWidth>
          <InputLabel>所属部门</InputLabel>
          <Select
            value={(formData as Employee)?.department_id || ""}
            label="所属部门"
            onChange={(e) => onChange("department_id", e.target.value)}
          >
            <MenuItem value="">无</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="职位"
          size="small"
          value={(formData as Employee)?.position || ""}
          onChange={(e) => onChange("position", e.target.value)}
        />

        <TextField
          label="入职日期"
          type="date"
          size="small"
          value={(formData as Employee)?.hire_date || ""}
          onChange={(e) => onChange("hire_date", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <FormControl size="small" fullWidth>
          <InputLabel>状态</InputLabel>
          <Select
            value={(formData as Employee)?.status || "active"}
            label="状态"
            onChange={(e) => onChange("status", e.target.value)}
          >
            <MenuItem value="active">在职</MenuItem>
            <MenuItem value="inactive">离职</MenuItem>
          </Select>
        </FormControl>

        <DialogActions sx={{ p: 0, pt: 2, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <AIHelperButton
              type="generate"
              onClick={() => onOpenAICodeGenerator(mode)}
              size="small"
              label="生成工号"
            />
            <AIHelperButton type="complete" onClick={onOpenAIDataCompleter} size="small" label="智能补全" />
            <AIHelperButton type="validate" onClick={onOpenAIFormValidator} size="small" label="AI校验" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} variant="outlined">
              取消
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: "primary.main" }}>
              {mode === "create" ? "创建" : "保存"}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </DialogContent>
  </Dialog>
);

// ============ 简单树形组件 ============
interface TreeViewComponentProps {
  data: any[];
  selectedId?: string;
  onSelect: (node: any) => void;
}

const TreeViewComponent: React.FC<TreeViewComponentProps> = ({ data, selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: any, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <Box key={node.id}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            py: 0.75,
            pl: level * 2 + 1,
            cursor: "pointer",
            borderRadius: 1,
            bgcolor: isSelected ? "primary.main" : "transparent",
            color: isSelected ? "white" : "text.primary",
            "&:hover": {
              bgcolor: isSelected ? "primary.main" : "action.hover",
            },
          }}
          onClick={() => {
            if (node.type === "department" && hasChildren) {
              toggleExpand(node.id);
            }
            onSelect(node);
          }}
        >
          {hasChildren && (
            <IconButton size="small" sx={{ p: 0.25 }}>
              {isExpanded ? (
                <ChevronDown sx={{ width: 16, height: 16 }} />
              ) : (
                <ChevronUp sx={{ width: 16, height: 16 }} />
              )}
            </IconButton>
          )}
          {!hasChildren && <Box sx={{ width: 24 }} />}
          {node.type === "department" ? (
            <Building2 sx={{ width: 16, height: 16, color: isSelected ? "white" : "success.main" }} />
          ) : (
            <Users sx={{ width: 16, height: 16, color: isSelected ? "white" : "primary.main" }} />
          )}
          <Typography variant="body2" sx={{ flex: 1 }}>
            {node.name}
          </Typography>
          {node.type === "department" && node.children && (
            <Chip label={node.children.length} size="small" sx={{ height: 20, fontSize: "0.75rem" }} />
          )}
        </Box>
        {hasChildren && isExpanded && (
          <Box>{node.children.map((child: any) => renderNode(child, level + 1))}</Box>
        )}
      </Box>
    );
  };

  return <Box>{data.map((node) => renderNode(node))}</Box>;
};

export default HrmEmployeePage;