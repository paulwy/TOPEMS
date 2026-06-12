import React, { useState, useEffect, useMemo } from "react";
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
  Folder,
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
  type ListParams,
} from "../api/hrm";
import { useAppStore } from "../store";
import { HrmLayout } from "../components/HrmLayout";
import {
  AIHelperButton,
  AICodeGenerator,
  AITextOptimizer,
  AIFormValidator,
} from "../components/ai";
import type { ValidateRequest, ValidationIssue, Suggestion } from "../types/ai";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TreeNode } from "../components/TreeView";
import TreeView from "../components/TreeView";

const HrmDepartmentPage: React.FC = () => {
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
  const [aiTextOptimizerMode, setAiTextOptimizerMode] = useState<
    "create" | "edit"
  >("create");
  const [aiFormValidatorMode, setAiFormValidatorMode] = useState<
    "create" | "edit"
  >("create");

  const [formData, setFormData] = useState<Partial<Department>>({});
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchDepartments = async (params?: ListParams) => {
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
  };

  const expandAllChildren = (dept: Department, allDepts: Department[]) => {
    setExpandedIds((prev) => {
      const newExpanded = new Set(prev);
      newExpanded.add(dept.id);
      const children = allDepts.filter((d) => d.parent_id === dept.id);
      children.forEach((child) => expandAllChildren(child, allDepts));
      return newExpanded;
    });
  };

  const fetchDepartmentEmployees = async (deptId: string) => {
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
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };

  const buildTree = useMemo((): TreeNode[] => {
    const deptMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    departments.forEach((dept) => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: "department" as const,
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

    const filterNode = (node: TreeNode): TreeNode | null => {
      const matches = node.name.toLowerCase().includes(search);
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter((n): n is TreeNode => n !== null);

      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return buildTree.map(filterNode).filter((n): n is TreeNode => n !== null);
  }, [buildTree, searchText]);

  const fetchCompanies = async () => {
    try {
      const response = await companyApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const data = response.data as PaginatedResult<Company>;
        setCompanies(data.items || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch companies:", error);
    }
  };

  useEffect(() => {
    fetchDepartments({ page_size: 1000 });
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      fetchDepartmentEmployees(selectedDeptId);
    } else {
      setEmployees([]);
    }
  }, [selectedDeptId]);

  const handleSearch = () => {
    fetchDepartments({
      search: searchText || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
  };

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("");
    setSelectedDeptId(undefined);
    fetchDepartments();
  };

  const handleAdd = () => {
    setSelectedDepartment(null);
    setFormData({});
    setShowCreateModal(true);
  };

  const handleEdit = (record: Department) => {
    setSelectedDepartment(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Department) => {
    setSelectedDepartment(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
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
  };

  const handleCreate = async (e: React.FormEvent) => {
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
  };

  const handleUpdate = async (e: React.FormEvent) => {
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
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectNode = (node: TreeNode) => {
    if (node.type === "department") {
      setSelectedDeptId(node.id);
    }
  };

  const handleOpenAICodeGenerator = (mode: "create" | "edit") => {
    setAiGeneratorMode(mode);
    setShowAICodeGenerator(true);
  };

  const handleSelectAICode = (code: string) => {
    setFormData((prev) => ({ ...prev, code }));
  };

  const handleOpenAITextOptimizer = (mode: "create" | "edit") => {
    setAiTextOptimizerMode(mode);
    setShowAITextOptimizer(true);
  };

  const handleOptimizedText = (text: string) => {
    setFormData((prev) => ({ ...prev, description: text }));
  };

  const handleOpenAIFormValidator = (mode: "create" | "edit") => {
    setAiFormValidatorMode(mode);
    setShowAIFormValidator(true);
  };

  const handleApplySuggestions = (suggestions: Suggestion[]) => {
    const updates: Record<string, any> = {};
    suggestions.forEach((s) => {
      updates[s.field] = s.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIFormValidator(false);
  };

  const handleFixIssue = (issue: ValidationIssue) => {
    if (issue.fix) {
      // 简单实现 - 可以通过 issue.field 和 issue.fix 来更新表单
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "outline"> = {
      active: "default",
      inactive: "secondary",
    };
    const labels: Record<string, string> = {
      active: "启用",
      inactive: "禁用",
    };
    return (
      <Badge
        variant={colors[status] || "outline"}
        className="px-2 py-0.5 text-xs"
      >
        {labels[status] || status}
      </Badge>
    );
  };

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  const renderTreeItem = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
            selectedDeptId === node.id
              ? "bg-blue-50 text-blue-700"
              : "text-slate-700 hover:bg-slate-100"
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => handleSelectNode(node)}
        >
          {hasChildren && (
            <button
              className="p-0.5 hover:bg-slate-200 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {!hasChildren && <span className="w-5" />}

          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              selectedDeptId === node.id ? "bg-blue-100" : "bg-slate-100"
            }`}
          >
            <Building2
              className={`w-4 h-4 ${selectedDeptId === node.id ? "text-blue-600" : "text-emerald-600"}`}
            />
          </div>

          <span className="font-medium text-sm flex-1">{node.name}</span>

          <div className="flex items-center gap-2">
            {getStatusBadge((node.data as Department)?.status || "active")}
            <span className="text-xs text-slate-400 ml-2">
              {getDeptEmployeeCount(node.id)}人
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children!.map((child) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getDeptEmployeeCount = (deptId: string): number => {
    return employees.filter((e) => e.department_id === deptId).length;
  };

  const availableParentDepts = useMemo(() => {
    return departments.filter(
      (d) =>
        d.id !== (formData.id as string | undefined) &&
        d.parent_id !== (formData.id as string | undefined),
    );
  }, [departments, formData.id]);

  return (
    <HrmLayout title="部门管理" subtitle="管理企业组织架构" showSidebar={false}>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  fetchDepartments();
                  setSelectedDeptId(undefined);
                  setEmployees([]);
                }}
                className="p-2 hover:bg-emerald-100"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-emerald-200" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">部门管理</CardTitle>
              <CardDescription className="text-emerald-600">
                {totalDepartments} 个部门
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAdd}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              新增部门
            </Button>
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-1 border-r border-slate-200 bg-slate-50">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="搜索部门..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-9"
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[120px]">
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearch}
                  className="h-9"
                >
                  搜索
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-9"
                >
                  重置
                </Button>
              </div>
            </div>

            <div className="h-[calc(100vh-240px)] overflow-y-auto px-2 pb-4">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
                  <p className="mt-2 text-gray-500 text-sm">加载中...</p>
                </div>
              ) : filteredTree.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm">暂无部门数据</p>
                  <Button onClick={handleAdd} size="sm" className="mt-3 gap-2">
                    <Plus className="w-4 h-4" />
                    新增部门
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTree.map((node) => renderTreeItem(node))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedDept ? (
              <div className="h-[calc(100vh-140px)] overflow-y-auto p-6 space-y-6">
                <Card className="bg-white border-slate-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {selectedDept.name}
                          </CardTitle>
                          {selectedDept.code && (
                            <CardDescription>
                              编码: {selectedDept.code}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedDept.status)}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(selectedDept)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看详情</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(selectedDept)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => handleDelete(selectedDept.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">部门人数</p>
                            <p className="text-xl font-bold text-slate-900 mt-1">
                              {employees.length}
                            </p>
                          </div>
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">所属公司</p>
                            <p className="text-sm font-bold text-slate-900 mt-1">
                              {selectedDept.company_id
                                ? companies.find(
                                    (c) => c.id === selectedDept.company_id,
                                  )?.name || "-"
                                : "无"}
                            </p>
                          </div>
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Building className="w-5 h-5 text-amber-600" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">上级部门</p>
                            <p className="text-sm font-bold text-slate-900 mt-1">
                              {selectedDept.parent_id
                                ? departments.find(
                                    (d) => d.id === selectedDept.parent_id,
                                  )?.name || "-"
                                : "无"}
                            </p>
                          </div>
                          <div className="p-2 bg-slate-200 rounded-lg">
                            <Folder className="w-5 h-5 text-slate-600" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">创建时间</p>
                            <p className="text-sm font-medium text-slate-900 mt-1">
                              {new Date(
                                selectedDept.created_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">状态</p>
                            <div className="text-sm font-medium mt-1">
                              {getStatusBadge(selectedDept.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedDept.description && (
                      <div className="mb-6">
                        <Label className="text-sm text-slate-500">
                          部门描述
                        </Label>
                        <p className="font-medium mt-1 text-slate-700">
                          {selectedDept.description}
                        </p>
                      </div>
                    )}

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Users className="w-5 h-5 text-blue-500" />
                          部门成员
                          <Badge variant="outline" className="ml-auto text-xs">
                            {employees.length} 人
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {employees.length === 0 ? (
                          <div className="p-8 text-center text-slate-500">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p>该部门暂无员工</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {employees.map((emp) => (
                              <div
                                key={emp.id}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                              >
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                  <User className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-900">
                                      {emp.name}
                                    </p>
                                    <Badge
                                      variant={
                                        emp.status === "active"
                                          ? "default"
                                          : "outline"
                                      }
                                      className="text-xs"
                                    >
                                      {emp.status === "active"
                                        ? "在职"
                                        : "离职"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-0.5">
                                    {emp.employee_number} ·{" "}
                                    {emp.position || "无职位"}
                                  </p>
                                </div>
                                <div className="hidden sm:flex flex-col items-end text-sm text-slate-500">
                                  {emp.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="w-3.5 h-3.5" />
                                      <span>{emp.email}</span>
                                    </div>
                                  )}
                                  {emp.phone && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Phone className="w-3.5 h-3.5" />
                                      <span>{emp.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-[calc(100vh-140px)] flex items-center justify-center bg-slate-50">
                <Card className="border-2 border-dashed border-slate-200 bg-white">
                  <CardContent className="p-12 text-center">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-500 mb-2">
                      选择部门查看详情
                    </h3>
                    <p className="text-sm text-slate-400">
                      从左侧部门树中选择一个部门，查看部门详情和成员信息
                    </p>
                    <Button onClick={handleAdd} className="mt-4 gap-2">
                      <Plus className="w-4 h-4" />
                      新增部门
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">新增部门</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-sm font-medium">
                部门名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-name"
                type="text"
                required
                value={(formData as Department)?.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="请输入部门名称"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-code" className="text-sm font-medium">
                部门编码
              </Label>
              <div className="flex gap-2">
                <Input
                  id="create-code"
                  type="text"
                  value={(formData as Department)?.code || ""}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  placeholder="请输入部门编码"
                  className="h-10 flex-1"
                />
                <AIHelperButton
                  type="generate"
                  onClick={() => handleOpenAICodeGenerator("create")}
                  size="sm"
                  label="AI生成"
                  variant="secondary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-company" className="text-sm font-medium">
                所属公司
              </Label>
              <Select
                value={(formData as Department)?.company_id || ""}
                onValueChange={(value) =>
                  handleInputChange("company_id", value === "none" ? "" : value)
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="请选择公司" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-parent" className="text-sm font-medium">
                上级部门
              </Label>
              <Select
                value={(formData as Department)?.parent_id || ""}
                onValueChange={(value) =>
                  handleInputChange(
                    "parent_id",
                    value === "none" ? undefined : value,
                  )
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {availableParentDepts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="create-description"
                  className="text-sm font-medium"
                >
                  部门描述
                </Label>
                <AIHelperButton
                  type="optimize"
                  onClick={() => handleOpenAITextOptimizer("create")}
                  size="sm"
                  variant="secondary"
                  label="AI 优化"
                />
              </div>
              <Textarea
                id="create-description"
                value={(formData as Department)?.description || ""}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                placeholder="请输入部门描述"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-status" className="text-sm font-medium">
                状态
              </Label>
              <Select
                value={(formData as Department)?.status || "active"}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogTitle className="text-lg">编辑部门</DialogTitle>
          </DialogHeader>
          {selectedDepartment && (
            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  部门名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  type="text"
                  required
                  value={(formData as Department)?.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code" className="text-sm font-medium">
                  部门编码
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-code"
                    type="text"
                    value={(formData as Department)?.code || ""}
                    onChange={(e) => handleInputChange("code", e.target.value)}
                    className="h-10 flex-1"
                  />
                  <AIHelperButton
                    type="generate"
                    onClick={() => handleOpenAICodeGenerator("edit")}
                    size="sm"
                    label="AI生成"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company" className="text-sm font-medium">
                  所属公司
                </Label>
                <Select
                  value={(formData as Department)?.company_id || ""}
                  onValueChange={(value) =>
                    handleInputChange(
                      "company_id",
                      value === "none" ? undefined : value,
                    )
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="请选择公司" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parent" className="text-sm font-medium">
                  上级部门
                </Label>
                <Select
                  value={(formData as Department)?.parent_id || ""}
                  onValueChange={(value) =>
                    handleInputChange(
                      "parent_id",
                      value === "none" ? undefined : value,
                    )
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {availableParentDepts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="edit-description"
                    className="text-sm font-medium"
                  >
                    部门描述
                  </Label>
                  <AIHelperButton
                    type="optimize"
                    onClick={() => handleOpenAITextOptimizer("edit")}
                    size="sm"
                    variant="secondary"
                    label="AI 优化"
                  />
                </div>
                <Textarea
                  id="edit-description"
                  value={(formData as Department)?.description || ""}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-sm font-medium">
                  状态
                </Label>
                <Select
                  value={(formData as Department)?.status || "active"}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="mt-6 flex items-center justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDepartment(null);
                  }}
                >
                  取消
                </Button>
                <div className="flex items-center gap-2">
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
            <DialogTitle className="text-lg">部门详情</DialogTitle>
          </DialogHeader>
          {selectedDepartment && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">部门名称</Label>
                <div className="font-medium text-slate-900">
                  {selectedDepartment.name}
                </div>
              </div>
              {selectedDepartment.code && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-500">部门编码</Label>
                  <div className="font-medium text-slate-900">
                    {selectedDepartment.code}
                  </div>
                </div>
              )}
              {selectedDepartment.parent_id && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-500">上级部门</Label>
                  <div className="font-medium text-slate-900">
                    {departments.find(
                      (d) => d.id === selectedDepartment.parent_id,
                    )?.name || "-"}
                  </div>
                </div>
              )}
              {selectedDepartment.description && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-500">部门描述</Label>
                  <div className="font-medium text-slate-900">
                    {selectedDepartment.description}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">状态</Label>
                <div>{getStatusBadge(selectedDepartment.status)}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">创建时间</Label>
                <div className="font-medium text-slate-900">
                  {new Date(selectedDepartment.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowViewModal(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        context={{
          textType: "duty",
          name: (formData as Department)?.name,
        }}
        originalText={(formData as Department)?.description || ""}
        onOptimized={handleOptimizedText}
      />

      <AIFormValidator
        isOpen={showAIFormValidator}
        onClose={() => setShowAIFormValidator(false)}
        validateRequest={{
          data: formData,
          context: {
            module: "hrm",
            entityType: "department",
          },
        }}
        onApplySuggestions={handleApplySuggestions}
        onFixIssue={handleFixIssue}
      />
    </HrmLayout>
  );
};

export default HrmDepartmentPage;
