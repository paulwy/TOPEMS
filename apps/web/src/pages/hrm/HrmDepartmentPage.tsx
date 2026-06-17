import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  TextField,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  Box,
  Paper,
  Avatar,
  IconButton,
  Divider,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Phone,
  Mail,
  User,
  Building,
} from "lucide-react";
import {
  departmentApi,
  employeeApi,
  companyApi,
  type Department,
  type Employee,
  type Company,
  type PaginatedResult,
} from "@/api/hrm";
import { useAppStore } from "../../store";
import {
  AIHelperButton,
  AICodeGenerator,
  AITextOptimizer,
  AIFormValidator,
} from "@/components/ai";
import type { ValidationIssue, Suggestion } from "@/types/ai";
import { EmptyState } from "@/components/mui";

const HrmDepartmentPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalDepartments, setTotalDepartments] = useState<number>(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [showAITextOptimizer, setShowAITextOptimizer] = useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [aiGeneratorMode, setAiGeneratorMode] = useState<"create" | "edit">(
    "create",
  );

  const [formData, setFormData] = useState<Partial<Department>>({});
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchDepartments = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await departmentApi.list(params);
        if (response.code === 200 && response.data) {
          const data = response.data as PaginatedResult<Department>;
          const depts = data.items || [];
          setDepartments(depts);
          setTotalDepartments(data.total || depts.length);

          const rootDepts = depts.filter((d) => !d.parent_id);
          rootDepts.forEach((d) => expandAllChildren(d, depts));
        } else {
          setDepartments([]);
          setTotalDepartments(0);
        }
      } catch (error: any) {
        addNotification({
          title: "加载失败",
          message: error.message || "获取部门列表失败",
          type: "error",
        });
        setDepartments([]);
        setTotalDepartments(0);
      } finally {
        setLoading(false);
      }
    },
    [addNotification],
  );

  const expandAllChildren = useCallback(
    (dept: Department, allDepts: Department[]) => {
      setExpandedIds((prev) => {
        const newExpanded = new Set(prev);
        newExpanded.add(dept.id);
        const children = allDepts.filter((d) => d.parent_id === dept.id);
        children.forEach((child) => expandAllChildren(child, allDepts));
        return newExpanded;
      });
    },
    [],
  );

  const fetchDepartmentEmployees = useCallback(async (deptId: string) => {
    try {
      const response = await employeeApi.list({
        department_id: deptId,
        page_size: 100,
      });
      if (response.code === 200 && response.data) {
        const data = response.data as PaginatedResult<Employee>;
        setEmployees(data.items || []);
      } else {
        setEmployees([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch employees:", error);
      setEmployees([]);
    }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  const buildTree = useMemo((): any[] => {
    const deptMap = new Map<string, any>();
    const rootNodes: any[] = [];

    departments.forEach((dept) => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: "department",
        children: [],
        data: dept,
      });
    });

    departments.forEach((dept) => {
      const node = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, [departments]);

  const filteredTree = useMemo(() => {
    if (!searchText.trim()) return buildTree;

    const search = searchText.toLowerCase();

    const filterNode = (node: any): any | null => {
      const matches = node.name.toLowerCase().includes(search);
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter((n: any): n is any => n !== null);

      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return buildTree.map(filterNode).filter((n: any): n is any => n !== null);
  }, [buildTree, searchText]);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const data = response.data as PaginatedResult<Company>;
        setCompanies(data.items || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch companies:", error);
    }
  }, []);

  useEffect(() => {
    fetchDepartments({ page_size: 1000 });
    fetchCompanies();
  }, [fetchDepartments, fetchCompanies]);

  useEffect(() => {
    if (selectedDeptId) {
      fetchDepartmentEmployees(selectedDeptId);
    } else {
      setEmployees([]);
    }
  }, [selectedDeptId, fetchDepartmentEmployees]);

  const handleSearch = useCallback(() => {
    fetchDepartments({
      search: searchText || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
  }, [searchText, statusFilter, fetchDepartments]);

  const handleReset = useCallback(() => {
    setSearchText("");
    setStatusFilter("all");
    setSelectedDeptId(undefined);
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAdd = useCallback(() => {
    setSelectedDepartment(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback((record: Department) => {
    setSelectedDepartment(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((record: Department) => {
    setSelectedDepartment(record);
    setShowViewModal(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("确定要删除这个部门吗？")) return;
      try {
        const response = await departmentApi.delete(id);
        if (response.code === 200) {
          addNotification({
            title: "成功",
            message: "部门删除成功",
            type: "success",
          });
          fetchDepartments();
          if (selectedDeptId === id) {
            setSelectedDeptId(undefined);
            setEmployees([]);
          }
        } else {
          addNotification({
            title: "失败",
            message: "删除部门失败",
            type: "error",
          });
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除部门失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchDepartments, selectedDeptId],
  );

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await departmentApi.create(formData);
        addNotification({
          title: "成功",
          message: "部门创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        fetchDepartments();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建部门失败",
          type: "error",
        });
      }
    },
    [formData, addNotification, fetchDepartments],
  );

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedDepartment) return;
      try {
        await departmentApi.update(selectedDepartment.id, formData);
        addNotification({
          title: "成功",
          message: "部门更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedDepartment(null);
        fetchDepartments();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新部门失败",
          type: "error",
        });
      }
    },
    [selectedDepartment, formData, addNotification, fetchDepartments],
  );

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectNode = useCallback((node: any) => {
    if (node.type === "department") {
      setSelectedDeptId(node.id);
    }
  }, []);

  const handleOpenAICodeGenerator = useCallback((mode: "create" | "edit") => {
    setAiGeneratorMode(mode);
    setShowAICodeGenerator(true);
  }, []);

  const handleSelectAICode = useCallback((code: string) => {
    setFormData((prev) => ({ ...prev, code }));
  }, []);

  const handleOpenAITextOptimizer = useCallback(() => {
    setShowAITextOptimizer(true);
  }, []);

  const handleOptimizedText = useCallback((text: string) => {
    setFormData((prev) => ({ ...prev, description: text }));
  }, []);

  const handleOpenAIFormValidator = useCallback(() => {
    setShowAIFormValidator(true);
  }, []);

  const handleApplySuggestions = useCallback((suggestions: Suggestion[]) => {
    const updates: Record<string, any> = {};
    suggestions.forEach((s) => {
      updates[s.field] = s.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIFormValidator(false);
  }, []);

  const handleFixIssue = useCallback((issue: ValidationIssue) => {
    // 简单实现
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, "success" | "default"> = {
      active: "success",
      inactive: "default",
    };
    const labels: Record<string, string> = {
      active: "启用",
      inactive: "禁用",
    };
    return (
      <Chip
        size="small"
        color={colors[status] || "default"}
        label={labels[status] || status}
        variant="outlined"
      />
    );
  }, []);

  const getDeptEmployeeCount = useCallback(
    (deptId: string): number => {
      return employees.filter((e) => e.department_id === deptId).length;
    },
    [employees],
  );

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  const availableParentDepts = useMemo(() => {
    return departments.filter(
      (d) => d.id !== (formData.id as string | undefined),
    );
  }, [departments, formData.id]);

  // 渲染树节点
  const renderTreeItem = useCallback(
    (node: any, level: number = 0) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedIds.has(node.id);
      const isSelected = selectedDeptId === node.id;

      return (
        <Box key={node.id}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1.5,
              borderRadius: 1,
              cursor: "pointer",
              pl: `${level * 16 + 12}px`,
              bgcolor: isSelected ? "primary.light" : "transparent",
              color: isSelected ? "primary.main" : "text.primary",
              "&:hover": {
                bgcolor: isSelected ? "primary.light" : "action.hover",
              },
            }}
            onClick={() => handleSelectNode(node)}
          >
            {hasChildren && (
              <IconButton
                size="small"
                sx={{ p: 0.25 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown sx={{ width: 16, height: 16 }} />
                ) : (
                  <ChevronRight sx={{ width: 16, height: 16 }} />
                )}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 24 }} />}

            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isSelected ? "primary.light" : "grey.100",
              }}
            >
              <Building2
                sx={{
                  width: 16,
                  height: 16,
                  color: isSelected ? "primary.main" : "success.main",
                }}
              />
            </Box>

            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
              {node.name}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {getStatusBadge((node.data as Department)?.status || "active")}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                {getDeptEmployeeCount(node.id)}人
              </Typography>
            </Box>
          </Box>

          {hasChildren && isExpanded && (
            <Box sx={{ ml: 1 }}>
              {node.children.map((child: any) =>
                renderTreeItem(child, level + 1),
              )}
            </Box>
          )}
        </Box>
      );
    },
    [
      expandedIds,
      selectedDeptId,
      handleSelectNode,
      toggleExpand,
      getStatusBadge,
      getDeptEmployeeCount,
    ],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* 面包屑导航 */}
      <Box sx={{ mb: 2 }}>
        <Typography
          component="a"
          href="/hrm"
          sx={{
            color: "text.secondary",
            textDecoration: "none",
            fontSize: "0.875rem",
            "&:hover": { color: "primary.main", textDecoration: "underline" },
          }}
        >
          人力资源
        </Typography>
        <Typography component="span" sx={{ mx: 1, color: "text.disabled" }}>
          /
        </Typography>
        <Typography
          component="span"
          sx={{ color: "text.primary", fontSize: "0.875rem" }}
        >
          部门管理
        </Typography>
      </Box>

      {/* 页面标题 */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            部门管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalDepartments} 个部门
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus style={{ width: 18, height: 18 }} />}
          onClick={handleAdd}
          sx={{ bgcolor: "success.main" }}
        >
          新增部门
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 2fr" } }}>
          {/* 左侧部门树 */}
          <Box
            sx={{ borderRight: 1, borderColor: "divider", bgcolor: "grey.50" }}
          >
            <Box sx={{ p: 2 }}>
              {/* 搜索 */}
              <TextField
                type="text"
                placeholder="搜索部门..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search
                          sx={{
                            width: 18,
                            height: 18,
                            color: "text.secondary",
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* 筛选 */}
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="all">全部状态</MenuItem>
                    <MenuItem value="active">启用</MenuItem>
                    <MenuItem value="inactive">禁用</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small" onClick={handleSearch}>
                  搜索
                </Button>
                <Button variant="outlined" size="small" onClick={handleReset}>
                  重置
                </Button>
              </Box>
            </Box>

            {/* 树形列表 */}
            <Box
              sx={{
                height: `calc(100vh - ${isMobile ? 320 : 280}px)`,
                overflow: "auto",
                px: 1,
                pb: 2,
              }}
            >
              {loading ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">加载中...</Typography>
                </Box>
              ) : filteredTree.length === 0 ? (
                <EmptyState
                  emoji="🏢"
                  title="暂无部门数据"
                  actionLabel="新增部门"
                  onAction={handleAdd}
                />
              ) : (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  {filteredTree.map((node) => renderTreeItem(node))}
                </Box>
              )}
            </Box>
          </Box>

          {/* 右侧详情 */}
          <Box>
            {selectedDept ? (
              <Box
                sx={{
                  p: 3,
                  overflow: "auto",
                  maxHeight: `calc(100vh - 180px)`,
                }}
              >
                {/* 部门信息卡片 */}
                <Card sx={{ mb: 3 }}>
                  <CardHeader
                    sx={{
                      pb: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    title={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: "success.main",
                          }}
                        >
                          <Building2 sx={{ width: 24, height: 24 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {selectedDept.name}
                          </Typography>
                          {selectedDept.code && (
                            <Typography variant="body2" color="text.secondary">
                              编码: {selectedDept.code}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    }
                    action={
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {getStatusBadge(selectedDept.status)}
                        <Tooltip title="查看">
                          <IconButton
                            size="small"
                            onClick={() => handleView(selectedDept)}
                          >
                            <Eye style={{ width: 18, height: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(selectedDept)}
                          >
                            <Edit style={{ width: 18, height: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(selectedDept.id)}
                          >
                            <Trash2 style={{ width: 18, height: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  />
                  <CardContent>
                    {/* 统计卡片 */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: 2, md: 4 },
                        gap: 2,
                        mb: 3,
                      }}
                    >
                      <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              部门人数
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                              {employees.length}
                            </Typography>
                          </Box>
                          <Avatar
                            sx={{
                              bgcolor: "primary.light",
                              color: "primary.main",
                            }}
                          >
                            <Users sx={{ width: 20, height: 20 }} />
                          </Avatar>
                        </Box>
                      </Box>
                      <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              所属公司
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {selectedDept.company_id
                                ? companies.find(
                                    (c) => c.id === selectedDept.company_id,
                                  )?.name || "-"
                                : "无"}
                            </Typography>
                          </Box>
                          <Avatar
                            sx={{
                              bgcolor: "warning.light",
                              color: "warning.main",
                            }}
                          >
                            <Building sx={{ width: 20, height: 20 }} />
                          </Avatar>
                        </Box>
                      </Box>
                      <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              上级部门
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {selectedDept.parent_id
                                ? departments.find(
                                    (d) => d.id === selectedDept.parent_id,
                                  )?.name || "-"
                                : "无"}
                            </Typography>
                          </Box>
                          <Avatar
                            sx={{ bgcolor: "grey.200", color: "grey.700" }}
                          >
                            <Building2 sx={{ width: 20, height: 20 }} />
                          </Avatar>
                        </Box>
                      </Box>
                      <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              创建时间
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {selectedDept.created_at
                                ? new Date(
                                    selectedDept.created_at,
                                  ).toLocaleDateString()
                                : "-"}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* 描述 */}
                    {selectedDept.description && (
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 0.5 }}
                        >
                          部门描述
                        </Typography>
                        <Typography variant="body2">
                          {selectedDept.description}
                        </Typography>
                      </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* 部门成员 */}
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 2,
                        }}
                      >
                        <Users
                          sx={{ width: 20, height: 20, color: "primary.main" }}
                        />
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600 }}
                        >
                          部门成员
                        </Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${employees.length} 人`}
                          sx={{ ml: "auto" }}
                        />
                      </Box>

                      {employees.length === 0 ? (
                        <EmptyState emoji="👤" title="该部门暂无员工" compact />
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                          }}
                        >
                          {employees.map((emp) => (
                            <Box
                              key={emp.id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                p: 2,
                                bgcolor: "grey.50",
                                borderRadius: 2,
                                "&:hover": { bgcolor: "grey.100" },
                              }}
                            >
                              <Avatar sx={{ bgcolor: "primary.main" }}>
                                <User sx={{ width: 20, height: 20 }} />
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {emp.name}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    color={
                                      emp.status === "active"
                                        ? "success"
                                        : "default"
                                    }
                                    label={
                                      emp.status === "active" ? "在职" : "离职"
                                    }
                                    sx={{ height: 20, fontSize: "0.7rem" }}
                                  />
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {emp.employee_no} · {emp.position || "无职位"}
                                </Typography>
                              </Box>
                              {!isMobile && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                  }}
                                >
                                  {emp.email && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                      }}
                                    >
                                      <Mail
                                        sx={{
                                          width: 14,
                                          height: 14,
                                          color: "text.secondary",
                                        }}
                                      />
                                      <Typography variant="caption">
                                        {emp.email}
                                      </Typography>
                                    </Box>
                                  )}
                                  {emp.phone && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                      }}
                                    >
                                      <Phone
                                        sx={{
                                          width: 14,
                                          height: 14,
                                          color: "text.secondary",
                                        }}
                                      />
                                      <Typography variant="caption">
                                        {emp.phone}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 400,
                  p: 4,
                }}
              >
                <EmptyState
                  emoji="👈"
                  title="选择部门查看详情"
                  description="从左侧部门树中选择一个部门，查看部门详情和成员信息"
                />
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* 新增/编辑模态框 */}
      <DepartmentFormDialog
        open={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        mode={showCreateModal ? "create" : "edit"}
        department={selectedDepartment}
        formData={formData}
        onChange={handleInputChange}
        onSubmit={showCreateModal ? handleCreate : handleUpdate}
        companies={companies}
        departments={availableParentDepts}
        onOpenAICodeGenerator={handleOpenAICodeGenerator}
        onOpenAITextOptimizer={handleOpenAITextOptimizer}
        onOpenAIFormValidator={handleOpenAIFormValidator}
      />

      {/* 查看详情模态框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>部门详情</DialogTitle>
        <DialogContent>
          {selectedDepartment && (
            <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  部门名称
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedDepartment.name}
                </Typography>
              </Box>
              {selectedDepartment.code && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    部门编码
                  </Typography>
                  <Typography variant="body1">
                    {selectedDepartment.code}
                  </Typography>
                </Box>
              )}
              {selectedDepartment.parent_id && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    上级部门
                  </Typography>
                  <Typography variant="body1">
                    {departments.find(
                      (d) => d.id === selectedDepartment.parent_id,
                    )?.name || "-"}
                  </Typography>
                </Box>
              )}
              {selectedDepartment.description && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    部门描述
                  </Typography>
                  <Typography variant="body1">
                    {selectedDepartment.description}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedDepartment.status)}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  创建时间
                </Typography>
                <Typography variant="body1">
                  {selectedDepartment.created_at
                    ? new Date(selectedDepartment.created_at).toLocaleString()
                    : "-"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* AI 组件 */}
      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{
          entityType: "department",
          name: (formData as Department)?.name,
        }}
        onSelect={handleSelectAICode}
        existingCodes={
          departments.map((d) => d.code).filter(Boolean) as string[]
        }
      />
      <AITextOptimizer
        isOpen={showAITextOptimizer}
        onClose={() => setShowAITextOptimizer(false)}
        context={{ textType: "duty", name: (formData as Department)?.name }}
        originalText={(formData as Department)?.description || ""}
        onOptimized={handleOptimizedText}
      />
      <AIFormValidator
        isOpen={showAIFormValidator}
        onClose={() => setShowAIFormValidator(false)}
        validateRequest={{
          data: formData,
          context: { module: "hrm", entityType: "department" },
        }}
        onApplySuggestions={handleApplySuggestions}
        onFixIssue={handleFixIssue}
      />
    </Box>
  );
};

// ============ 部门表单模态框 ============

interface DepartmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  department: Department | null;
  formData: Partial<Department>;
  onChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  companies: Company[];
  departments: Department[];
  onOpenAICodeGenerator: (mode: "create" | "edit") => void;
  onOpenAITextOptimizer: () => void;
  onOpenAIFormValidator: () => void;
}

const DepartmentFormDialog: React.FC<DepartmentFormDialogProps> = ({
  open,
  onClose,
  mode,
  department,
  formData,
  onChange,
  onSubmit,
  companies,
  departments,
  onOpenAICodeGenerator,
  onOpenAITextOptimizer,
  onOpenAIFormValidator,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{mode === "create" ? "新增部门" : "编辑部门"}</DialogTitle>
    <DialogContent>
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ display: "grid", gap: 2, pt: 1 }}
      >
        <TextField
          label="部门名称 *"
          value={(formData as Department)?.name || ""}
          onChange={(e) => onChange("name", e.target.value)}
          required
          size="small"
        />

        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <InputLabel sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              部门编码
            </InputLabel>
            <AIHelperButton
              type="generate"
              onClick={() => onOpenAICodeGenerator(mode)}
              size="small"
              label="AI生成"
            />
          </Box>
          <TextField
            value={(formData as Department)?.code || ""}
            onChange={(e) => onChange("code", e.target.value)}
            size="small"
            fullWidth
          />
        </Box>

        <FormControl size="small" fullWidth>
          <InputLabel>所属公司</InputLabel>
          <Select
            value={(formData as Department)?.company_id || ""}
            label="所属公司"
            onChange={(e) =>
              onChange(
                "company_id",
                e.target.value === "none" ? "" : e.target.value,
              )
            }
          >
            <MenuItem value="none">无</MenuItem>
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>上级部门</InputLabel>
          <Select
            value={(formData as Department)?.parent_id || ""}
            label="上级部门"
            onChange={(e) =>
              onChange(
                "parent_id",
                e.target.value === "none" ? "" : e.target.value,
              )
            }
          >
            <MenuItem value="none">无</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <InputLabel sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              部门描述
            </InputLabel>
            <AIHelperButton
              type="optimize"
              onClick={() => onOpenAITextOptimizer()}
              size="small"
              label="AI优化"
            />
          </Box>
          <TextField
            value={(formData as Department)?.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Box>

        <FormControl size="small" fullWidth>
          <InputLabel>状态</InputLabel>
          <Select
            value={(formData as Department)?.status || "active"}
            label="状态"
            onChange={(e) => onChange("status", e.target.value)}
          >
            <MenuItem value="active">启用</MenuItem>
            <MenuItem value="inactive">禁用</MenuItem>
          </Select>
        </FormControl>

        <DialogActions sx={{ p: 0, pt: 2, justifyContent: "space-between" }}>
          <AIHelperButton
            type="validate"
            onClick={() => onOpenAIFormValidator()}
            size="small"
            label="AI校验"
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} variant="outlined">
              取消
            </Button>
            <Button type="submit" variant="contained">
              {mode === "create" ? "创建" : "保存"}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </DialogContent>
  </Dialog>
);

export default HrmDepartmentPage;
