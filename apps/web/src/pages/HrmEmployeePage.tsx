import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Briefcase,
  Building2,
  LayoutGrid,
  List,
  UserCheck,
  UserX,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  employeeApi,
  departmentApi,
  type Employee,
  type Department,
  type PaginatedResult,
  type ListParams,
} from "../api/hrm";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../components/DataTable";
import { HrmLayout } from "../components/HrmLayout";
import type { TreeNode } from "../components/TreeView";
import TreeView from "../components/TreeView";
import {
  AIHelperButton,
  AICodeGenerator,
  AIDataCompleter,
  AIFormValidator,
} from "../components/ai";
import type { CompletionItem } from "../types/ai";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "tree";

const HrmEmployeePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Employee>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [showAIDataCompleter, setShowAIDataCompleter] = useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = useState(false);
  const [aiGeneratorMode, setAiGeneratorMode] = useState<"create" | "edit">(
    "create",
  );

  const [formData, setFormData] = useState<Partial<Employee>>({});

  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  const fetchEmployees = useCallback(
    async (params?: ListParams) => {
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

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await departmentApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const responseData = response.data as any;
        const depts = responseData.items || [];
        setDepartments(depts);

        const tree = buildTree(depts, []);
        setTreeData(tree);
      }
    } catch (error: any) {
      console.error("Failed to fetch departments:", error);
    }
  }, []);

  const buildTree = useCallback(
    (depts: Department[], emps: Employee[]): TreeNode[] => {
      const deptMap = new Map<string, TreeNode>();
      const rootNodes: TreeNode[] = [];

      depts.forEach((dept) => {
        deptMap.set(dept.id, {
          id: dept.id,
          name: dept.name,
          type: "department" as const,
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
        const empNode: TreeNode = {
          id: emp.id,
          name: emp.name,
          type: "employee" as const,
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
    fetchEmployees();
    fetchDepartments();
  }, [fetchEmployees, fetchDepartments]);

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

  const handleAdd = useCallback(() => {
    setSelectedEmployee(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback((record: Employee) => {
    setSelectedEmployee(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  const handleOpenAICodeGenerator = useCallback((mode: "create" | "edit") => {
    setAiGeneratorMode(mode);
    setShowAICodeGenerator(true);
  }, []);

  const handleSelectAICode = useCallback((code: string) => {
    setFormData((prev) => ({ ...prev, employee_number: code }));
  }, []);

  const handleOpenAIDataCompleter = useCallback((mode: "create" | "edit") => {
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

  const handleOpenAIFormValidator = useCallback((mode: "create" | "edit") => {
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

  const handleView = useCallback((record: Employee) => {
    setSelectedEmployee(record);
    setShowViewModal(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("确定要删除这个员工吗？")) return;
      try {
        const response = await employeeApi.delete(id);
        if (response.code === 200) {
          addNotification({
            title: "成功",
            message: "员工删除成功",
            type: "success",
          });
          if (viewMode === "list") {
            fetchEmployees();
          } else {
            const newEmps = filteredEmployees.filter((e) => e.id !== id);
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
    [
      addNotification,
      viewMode,
      fetchEmployees,
      filteredEmployees,
      departments,
      buildTree,
    ],
  );

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

  const handleInputChange = useCallback(
    (field: string, value: string | number | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSelectNode = useCallback(
    (node: TreeNode) => {
      if (node.type === "department") {
        setSelectedDeptId(node.id);
      } else if (node.type === "employee") {
        const emp = node.data as Employee;
        handleView(emp);
      }
    },
    [handleView],
  );

  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      inactive: "secondary",
    };
    const labels: Record<string, string> = {
      active: "在职",
      inactive: "离职",
    };
    return (
      <Badge variant={colors[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  }, []);

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: "name",
        header: "员工信息",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {row.original.name}
                </div>
                {row.original.employee_number && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {row.original.employee_number}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "department_id",
        header: "所属部门",
        cell: ({ row }) => {
          const dept = departments.find(
            (d) => d.id === row.original.department_id,
          );
          return (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span>{dept?.name || "-"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "position",
        header: "职位",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-400" />
            <span>{row.original.position || "-"}</span>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "邮箱",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{row.original.email || "-"}</span>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "电话",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{row.original.phone || "-"}</span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: "id",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleView(row.original)}
              aria-label="查看员工详情"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row.original)}
              aria-label="编辑员工"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.original.id)}
              aria-label="删除员工"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ),
      },
    ],
    [departments, getStatusBadge, handleView, handleEdit, handleDelete],
  );

  const selectedDeptEmployees = useMemo(() => {
    if (!selectedDeptId) return filteredEmployees;
    return filteredEmployees.filter((e) => e.department_id === selectedDeptId);
  }, [selectedDeptId, filteredEmployees]);

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  const employeeStats = useMemo(() => {
    const allEmployees = data.items;
    const totalEmployees = allEmployees.length;
    const activeEmployees = allEmployees.filter(
      (e) => e.status === "active",
    ).length;
    const inactiveEmployees = allEmployees.filter(
      (e) => e.status === "inactive",
    ).length;
    const maleEmployees = allEmployees.filter(
      (e) => e.gender === "male",
    ).length;
    const femaleEmployees = allEmployees.filter(
      (e) => e.gender === "female",
    ).length;

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      maleEmployees,
      femaleEmployees,
      activeRate:
        totalEmployees > 0
          ? Math.round((activeEmployees / totalEmployees) * 100)
          : 0,
    };
  }, [data.items]);

  const departmentDistributionData = useMemo(() => {
    return departments.map((d, index) => ({
      name: d.name,
      value: data.items.filter((e) => e.department_id === d.id).length,
      color: [
        "#3b82f6",
        "#22c55e",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#06b6d4",
        "#94a3b8",
        "#ec4899",
      ][index % 8],
    }));
  }, [departments, data.items]);

  const employeeStatusData = useMemo(
    () => [
      { name: "在职", value: employeeStats.activeEmployees, color: "#22c55e" },
      {
        name: "离职",
        value: employeeStats.inactiveEmployees,
        color: "#ef4444",
      },
    ],
    [employeeStats],
  );

  const [expandedStats, setExpandedStats] = useState(false);

  return (
    <HrmLayout title="员工管理" subtitle="管理企业员工信息">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <button
              onClick={() => setExpandedStats(!expandedStats)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              aria-expanded={expandedStats}
            >
              <h2 className="text-lg font-semibold text-slate-900">员工概览</h2>
              {expandedStats ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                expandedStats ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <div className="px-4 pb-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ staggerChildren: 0.1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.4 }}
                  >
                    <MetricCard
                      title="员工总数"
                      value={employeeStats.totalEmployees}
                      icon={<Users className="w-5 h-5" />}
                      trend={null}
                      color="blue"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <MetricCard
                      title="在职员工"
                      value={employeeStats.activeEmployees}
                      icon={<UserCheck className="w-5 h-5" />}
                      trend={null}
                      color="green"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <MetricCard
                      title="离职员工"
                      value={employeeStats.inactiveEmployees}
                      icon={<UserX className="w-5 h-5" />}
                      trend={null}
                      color="red"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <MetricCard
                      title="在职率"
                      value={`${employeeStats.activeRate}%`}
                      icon={<TrendingUp className="w-5 h-5" />}
                      trend={null}
                      color="purple"
                    />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <StatsChart
                      type="pie"
                      title=""
                      data={departmentDistributionData}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <StatsChart type="pie" title="" data={employeeStatusData} />
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-md"
                    aria-label="列表视图"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "tree" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("tree")}
                    className="rounded-md"
                    aria-label="树形视图"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleAdd} aria-label="新增员工">
                  <Plus className="w-5 h-5 mr-2" />
                  新增员工
                </Button>
              </div>
            </div>

            {viewMode === "list" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-6 rounded-lg border bg-card text-card-foreground shadow-sm"
                >
                  <CardContent className="p-4">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex-1 min-w-[200px] relative">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, scaleX: 0 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                          style={{ transformOrigin: "left" }}
                        >
                          <Input
                            placeholder="搜索员工姓名、工号、邮箱..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSearch()
                            }
                            className="pl-10"
                            aria-label="搜索员工"
                          />
                        </motion.div>
                      </div>
                      <Select
                        value={departmentFilter}
                        onValueChange={setDepartmentFilter}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="全部部门" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部部门</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="全部状态" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部状态</SelectItem>
                          <SelectItem value="active">在职</SelectItem>
                          <SelectItem value="inactive">离职</SelectItem>
                        </SelectContent>
                      </Select>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
                        onClick={handleSearch}
                      >
                        搜索
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        onClick={handleReset}
                      >
                        重置
                      </motion.button>
                    </motion.div>
                  </CardContent>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="rounded-lg border bg-card text-card-foreground shadow-sm"
                >
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-8 text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="inline-block rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"
                        ></motion.div>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                          加载中...
                        </p>
                      </div>
                    ) : data.items.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="p-8 text-center"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        </motion.div>
                        <p className="text-gray-500 dark:text-gray-400">
                          暂无员工数据
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <DataTable
                          columns={columns}
                          data={data.items}
                          enablePagination={true}
                          pageCount={Math.ceil(data.total / data.page_size)}
                          onPageChange={(page) => fetchEmployees({ page })}
                          currentPage={data.page - 1}
                        />
                      </motion.div>
                    )}
                  </CardContent>
                </motion.div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-emerald-600" />
                          部门树
                        </h3>
                        <div className="text-sm text-slate-500">
                          {departments.length} 个部门
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="搜索部门"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSearch()
                            }
                            className="pl-9 text-sm"
                            aria-label="搜索部门"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mb-4">
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="全部状态" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部状态</SelectItem>
                            <SelectItem value="active">在职</SelectItem>
                            <SelectItem value="inactive">离职</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSearch}
                        >
                          搜索
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReset}
                        >
                          重置
                        </Button>
                      </div>
                      {loading ? (
                        <div className="p-8 text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
                          <p className="mt-2 text-gray-500">加载中...</p>
                        </div>
                      ) : treeData.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p>暂无部门数据</p>
                        </div>
                      ) : (
                        <TreeView
                          data={treeData}
                          onSelect={handleSelectNode}
                          selectedId={selectedDeptId}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  {selectedDept ? (
                    <div className="space-y-6">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h2 className="text-xl font-bold text-slate-900">
                                {selectedDept.name}
                              </h2>
                              {selectedDept.code && (
                                <p className="text-sm text-slate-500">
                                  编码: {selectedDept.code}
                                </p>
                              )}
                            </div>
                            <Badge>{selectedDeptEmployees.length} 人</Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            部门成员
                          </h3>
                          {selectedDeptEmployees.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                              <p>该部门暂无员工</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {selectedDeptEmployees.map((emp) => (
                                <div
                                  key={emp.id}
                                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium text-slate-900">
                                      {emp.name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      {emp.employee_number} ·{" "}
                                      {emp.position || "无职位"}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-slate-600">
                                      {getStatusBadge(emp.status)}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleView(emp)}
                                      aria-label="查看详情"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(emp)}
                                      aria-label="编辑"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={() => handleDelete(emp.id)}
                                      aria-label="删除"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className="h-full">
                      <CardContent className="p-12 text-center">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-500 mb-2">
                          选择部门查看员工
                        </h3>
                        <p className="text-sm text-slate-400">
                          从左侧部门树中选择一个部门，查看部门成员信息
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新增员工</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">员工姓名 *</Label>
                    <Input
                      id="create-name"
                      type="text"
                      required
                      value={(formData as Employee)?.name || ""}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="请输入员工姓名"
                      aria-required={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-number">工号</Label>
                    <Input
                      id="create-number"
                      type="text"
                      value={(formData as Employee)?.employee_number || ""}
                      onChange={(e) =>
                        handleInputChange("employee_number", e.target.value)
                      }
                      placeholder="请输入工号"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-email">邮箱</Label>
                    <Input
                      id="create-email"
                      type="email"
                      value={(formData as Employee)?.email || ""}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="请输入邮箱"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-phone">电话</Label>
                    <Input
                      id="create-phone"
                      type="text"
                      value={(formData as Employee)?.phone || ""}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      placeholder="请输入电话"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-department">所属部门</Label>
                  <Select
                    value={(formData as Employee)?.department_id || "none"}
                    onValueChange={(value) =>
                      handleInputChange(
                        "department_id",
                        value === "none" ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-position">职位</Label>
                  <Input
                    id="create-position"
                    type="text"
                    value={(formData as Employee)?.position || ""}
                    onChange={(e) =>
                      handleInputChange("position", e.target.value)
                    }
                    placeholder="请输入职位"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-hire-date">入职日期</Label>
                  <Input
                    id="create-hire-date"
                    type="date"
                    value={(formData as Employee)?.hire_date || ""}
                    onChange={(e) =>
                      handleInputChange("hire_date", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-status">状态</Label>
                  <Select
                    value={(formData as Employee)?.status || "active"}
                    onValueChange={(value) =>
                      handleInputChange("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">在职</SelectItem>
                      <SelectItem value="inactive">离职</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6 flex items-center justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </Button>
                <div className="flex items-center gap-2">
                  <AIHelperButton
                    type="generate"
                    onClick={() => handleOpenAICodeGenerator("create")}
                    size="sm"
                    variant="secondary"
                    label="生成工号"
                  />
                  <AIHelperButton
                    type="complete"
                    onClick={() => handleOpenAIDataCompleter("create")}
                    size="sm"
                    variant="secondary"
                    label="智能补全"
                  />
                  <AIHelperButton
                    type="validate"
                    onClick={() => handleOpenAIFormValidator("create")}
                    size="sm"
                    variant="secondary"
                    label="AI 校验"
                  />
                  <Button type="submit">创建</Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>编辑员工</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <form onSubmit={handleUpdate}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">员工姓名 *</Label>
                      <Input
                        id="edit-name"
                        type="text"
                        required
                        value={(formData as Employee)?.name || ""}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        aria-required={true}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-number">工号</Label>
                      <Input
                        id="edit-number"
                        type="text"
                        value={(formData as Employee)?.employee_number || ""}
                        onChange={(e) =>
                          handleInputChange("employee_number", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">邮箱</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={(formData as Employee)?.email || ""}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">电话</Label>
                      <Input
                        id="edit-phone"
                        type="text"
                        value={(formData as Employee)?.phone || ""}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-department">所属部门</Label>
                    <Select
                      value={(formData as Employee)?.department_id || "none"}
                      onValueChange={(value) =>
                        handleInputChange(
                          "department_id",
                          value === "none" ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-position">职位</Label>
                    <Input
                      id="edit-position"
                      type="text"
                      value={(formData as Employee)?.position || ""}
                      onChange={(e) =>
                        handleInputChange("position", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">状态</Label>
                    <Select
                      value={(formData as Employee)?.status || "active"}
                      onValueChange={(value) =>
                        handleInputChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">在职</SelectItem>
                        <SelectItem value="inactive">离职</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-6 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedEmployee(null);
                    }}
                  >
                    取消
                  </Button>
                  <div className="flex items-center gap-2">
                    <AIHelperButton
                      type="generate"
                      onClick={() => handleOpenAICodeGenerator("edit")}
                      size="sm"
                      variant="secondary"
                      label="生成工号"
                    />
                    <AIHelperButton
                      type="complete"
                      onClick={() => handleOpenAIDataCompleter("edit")}
                      size="sm"
                      variant="secondary"
                      label="智能补全"
                    />
                    <AIHelperButton
                      type="validate"
                      onClick={() => handleOpenAIFormValidator("edit")}
                      size="sm"
                      variant="secondary"
                      label="AI 校验"
                    />
                    <Button type="submit">保存</Button>
                  </div>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>员工详情</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-500">员工姓名</Label>
                    <div className="font-medium">{selectedEmployee.name}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500">工号</Label>
                    <div className="font-medium">
                      {selectedEmployee.employee_number || "-"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-500">邮箱</Label>
                    <div className="font-medium">
                      {selectedEmployee.email || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500">电话</Label>
                    <div className="font-medium">
                      {selectedEmployee.phone || "-"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-500">所属部门</Label>
                    <div className="font-medium">
                      {departments.find(
                        (d) => d.id === selectedEmployee.department_id,
                      )?.name || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500">职位</Label>
                    <div className="font-medium">
                      {selectedEmployee.position || "-"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-500">入职日期</Label>
                    <div className="font-medium">
                      {selectedEmployee.hire_date || "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500">状态</Label>
                    <div className="font-medium">
                      {getStatusBadge(selectedEmployee.status)}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500">创建时间</Label>
                  <div className="text-sm text-gray-500">
                    {selectedEmployee.created_at}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowViewModal(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AICodeGenerator
          isOpen={showAICodeGenerator}
          onClose={() => setShowAICodeGenerator(false)}
          context={{
            entityType: "employee",
            name: (formData as Employee)?.name,
          }}
          onSelect={handleSelectAICode}
          existingCodes={
            data.items.map((e) => e.employee_number).filter(Boolean) as string[]
          }
        />

        <AIDataCompleter
          isOpen={showAIDataCompleter}
          onClose={() => setShowAIDataCompleter(false)}
          completeRequest={{
            partialData: formData,
            context: {
              module: "hrm",
              entityType: "employee",
            },
          }}
          onApplyCompletion={handleApplyCompletion}
        />

        <AIFormValidator
          isOpen={showAIFormValidator}
          onClose={() => setShowAIFormValidator(false)}
          validateRequest={{
            data: formData,
            context: {
              module: "hrm",
              entityType: "employee",
            },
          }}
          onApplySuggestions={handleApplyValidationSuggestions}
          onFixIssue={() => {}}
        />
      </div>
    </HrmLayout>
  );
};

export default HrmEmployeePage;
