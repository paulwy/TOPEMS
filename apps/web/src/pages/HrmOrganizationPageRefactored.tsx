/**
 * HrmOrganizationPage 重构后
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 保持树形组织架构展示
 * 3. 保持业务逻辑不变
 * 4. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Building,
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  companyApi,
  departmentApi,
  employeeApi,
  type Company,
  type Department,
  type Employee,
} from "../api/hrm";
import { useAppStore } from "../store";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";

interface OrganizationNode {
  id: string;
  name: string;
  type: "company" | "department";
  companyId?: string;
  parentId?: string;
  children?: OrganizationNode[];
  data?: Company | Department;
}

const HrmOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState("");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<OrganizationNode | null>(null);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");

  const [companyFormData, setCompanyFormData] = useState<Partial<Company>>({});
  const [deptFormData, setDeptFormData] = useState<Partial<Department>>({});

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const treeData = useMemo(() => {
    const result: OrganizationNode[] = [];

    companies.forEach((company) => {
      const companyNode: OrganizationNode = {
        id: `company-${company.id}`,
        name: company.name,
        type: "company",
        companyId: company.id,
        data: company,
        children: [],
      };

      const companyDepts = departments.filter((d) => d.company_id === company.id);
      const deptMap = new Map<string, OrganizationNode>();

      companyDepts.forEach((dept) => {
        deptMap.set(dept.id, {
          id: `dept-${dept.id}`,
          name: dept.name,
          type: "department",
          companyId: company.id,
          parentId: dept.parent_id,
          data: dept,
          children: [],
        });
      });

      companyDepts.forEach((dept) => {
        const node = deptMap.get(dept.id)!;
        if (dept.parent_id && deptMap.has(dept.parent_id)) {
          deptMap.get(dept.parent_id)!.children!.push(node);
        } else {
          companyNode.children!.push(node);
        }
      });

      result.push(companyNode);
    });

    return result;
  }, [companies, departments]);

  const filteredTreeData = useMemo(() => {
    if (!searchText.trim()) return treeData;

    const search = searchText.toLowerCase();

    const filterNode = (node: OrganizationNode): OrganizationNode | null => {
      const matches = node.name.toLowerCase().includes(search);
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter((n): n is OrganizationNode => n !== null);

      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return treeData
      .map(filterNode)
      .filter((n): n is OrganizationNode => n !== null);
  }, [treeData, searchText]);

  const renderTree = (nodes: OrganizationNode[], level: number = 0) => {
    return nodes.map((node) => (
      <Box key={node.id}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 1,
            cursor: "pointer",
            transition: "background-color 0.2s",
            bgcolor: selectedNode?.id === node.id ? "#3b82f6" : "transparent",
            color: selectedNode?.id === node.id ? "white" : "text.primary",
            "&:hover": { bgcolor: selectedNode?.id === node.id ? "#3b82f6" : "grey.100" },
            pl: `${level * 16 + 12}px`,
          }}
          onClick={() => handleNodeSelect(node)}
        >
          {node.children && node.children.length > 0 && (
            <Box
              component="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              sx={{
                p: 0.5,
                border: "none",
                bgcolor: "transparent",
                cursor: "pointer",
                borderRadius: 0.5,
                display: "flex",
                alignItems: "center",
                "&:hover": { bgcolor: "grey.200" },
              }}
            >
              <ChevronRight
                style={{
                  width: 16,
                  height: 16,
                  transform: expandedIds.has(node.id) ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </Box>
          )}
          {node.children && node.children.length === 0 && <Box sx={{ width: 20 }} />}
          {node.type === "company" ? (
            <Building style={{ width: 16, height: 16, color: selectedNode?.id === node.id ? "white" : "#3b82f6" }} />
          ) : (
            <Building2 style={{ width: 16, height: 16, color: selectedNode?.id === node.id ? "white" : "success.main" }} />
          )}
          <Box sx={{ fontWeight: 500, fontSize: "0.875rem", flex: 1 }}>{node.name}</Box>
          {node.type === "company" && (
            <Chip
              size="small"
              variant="outlined"
              label={`${getCompanyEmployeeCount(node.companyId!)} 人`}
              sx={{ ml: "auto", fontSize: "0.75rem" }}
            />
          )}
          {node.type === "department" && (
            <Chip
              size="small"
              variant="outlined"
              label={`${getDeptEmployeeCount(node.id.replace("dept-", ""))} 人`}
              sx={{ ml: "auto", fontSize: "0.75rem" }}
            />
          )}
        </Box>
        {node.children &&
          node.children.length > 0 &&
          expandedIds.has(node.id) && (
            <Box>{renderTree(node.children, level + 1)}</Box>
          )}
      </Box>
    ));
  };

  const getCompanyEmployeeCount = (companyId: string): number => {
    const companyDepts = departments.filter((d) => d.company_id === companyId);
    const deptIds = companyDepts.map((d) => d.id);
    return employees.filter((e) => deptIds.includes(e.department_id || "")).length;
  };

  const getDeptEmployeeCount = (deptId: string): number => {
    return employees.filter((e) => e.department_id === deptId).length;
  };

  const handleNodeSelect = (node: OrganizationNode) => {
    setSelectedNode(node);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companyRes, deptRes, empRes] = await Promise.all([
        companyApi.list(),
        departmentApi.list(),
        employeeApi.list({ page_size: 500 }),
      ]);

      if (companyRes.code === 200 && companyRes.data) {
        setCompanies((companyRes.data as any).items || []);
      }
      if (deptRes.code === 200 && deptRes.data) {
        setDepartments((deptRes.data as any).items || []);
      }
      if (empRes.code === 200 && empRes.data) {
        setEmployees((empRes.data as any).items || []);
      }
    } catch (error: any) {
      addNotification({
        title: "加载失败",
        message: error.message || "获取数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCompany = () => {
    setModalMode("create");
    setCompanyFormData({});
    setShowCompanyModal(true);
  };

  const handleEditCompany = () => {
    if (selectedNode?.type === "company" && selectedNode.data) {
      setModalMode("edit");
      setCompanyFormData(selectedNode.data as Company);
      setShowCompanyModal(true);
    }
  };

  const handleDeleteCompany = async () => {
    if (selectedNode?.type === "company" && selectedNode.companyId) {
      if (confirm("确定要删除这个公司吗？")) {
        try {
          const response = await companyApi.delete(selectedNode.companyId);
          if (response.code === 200) {
            addNotification({
              title: "成功",
              message: "删除成功",
              type: "success",
            });
            fetchData();
            setSelectedNode(null);
          }
        } catch (error: any) {
          addNotification({
            title: "失败",
            message: error.message || "删除失败",
            type: "error",
          });
        }
      }
    }
  };

  const handleSaveCompany = async () => {
    try {
      if (modalMode === "create") {
        const response = await companyApi.create(companyFormData as Company);
        if (response.code === 200) {
          addNotification({ title: "成功", message: "创建成功", type: "success" });
          setShowCompanyModal(false);
          fetchData();
        }
      } else {
        if (companyFormData.id) {
          const response = await companyApi.update(companyFormData.id, companyFormData as Company);
          if (response.code === 200) {
            addNotification({ title: "成功", message: "更新成功", type: "success" });
            setShowCompanyModal(false);
            fetchData();
          }
        }
      }
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: error.message || "操作失败",
        type: "error",
      });
    }
  };

  const handleCreateDepartment = () => {
    setModalMode("create");
    setDeptFormData({ company_id: selectedNode?.companyId });
    setShowDeptModal(true);
  };

  const handleEditDepartment = () => {
    if (selectedNode?.type === "department" && selectedNode.data) {
      setModalMode("edit");
      setDeptFormData(selectedNode.data as Department);
      setShowDeptModal(true);
    }
  };

  const handleDeleteDepartment = async () => {
    if (selectedNode?.type === "department") {
      const deptId = selectedNode.id.replace("dept-", "");
      if (confirm("确定要删除这个部门吗？")) {
        try {
          const response = await departmentApi.delete(deptId);
          if (response.code === 200) {
            addNotification({ title: "成功", message: "删除成功", type: "success" });
            fetchData();
            setSelectedNode(null);
          }
        } catch (error: any) {
          addNotification({
            title: "失败",
            message: error.message || "删除失败",
            type: "error",
          });
        }
      }
    }
  };

  const handleSaveDepartment = async () => {
    try {
      if (modalMode === "create") {
        const response = await departmentApi.create(deptFormData as Department);
        if (response.code === 200) {
          addNotification({ title: "成功", message: "创建成功", type: "success" });
          setShowDeptModal(false);
          fetchData();
        }
      } else {
        if (deptFormData.id) {
          const response = await departmentApi.update(deptFormData.id, deptFormData as Department);
          if (response.code === 200) {
            addNotification({ title: "成功", message: "更新成功", type: "success" });
            setShowDeptModal(false);
            fetchData();
          }
        }
      }
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: error.message || "操作失败",
        type: "error",
      });
    }
  };

  const availableParentDepts = useMemo(() => {
    if (!selectedNode) return [];
    const companyId = selectedNode.type === "company" ? selectedNode.companyId : selectedNode.companyId;
    if (!companyId) return [];
    return departments.filter(
      (d) => d.company_id === companyId && d.id !== (deptFormData.id as string),
    );
  }, [selectedNode, departments, deptFormData.id]);

  const filters: FilterConfig[] = [
    {
      id: "search",
      label: "搜索",
      type: "text",
      placeholder: "搜索公司或部门...",
      width: 200,
    },
  ];

  const handleFilterChange = (filters: Record<string, any>) => {
    if (filters.search !== undefined) setSearchText(filters.search);
  };

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 72px)" }}>
      {/* 左侧组织架构树 */}
      <Box
        sx={{
          width: 360,
          borderRight: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              组织架构
            </Typography>
            <Button
              size="small"
              onClick={handleCreateCompany}
              startIcon={<Plus sx={{ width: 16, height: 16 }} />}
              sx={{ bgcolor: "#3b82f6" }}
            >
              新增
            </Button>
          </Box>
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={() => setSearchText("")}
            onSearch={() => {}}
          />
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 128 }}>
              <RefreshCw sx={{ width: 20, height: 20, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
            </Box>
          ) : filteredTreeData.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
              <Building sx={{ width: 48, height: 48, mx: "auto", mb: 2, opacity: 0.5 }} />
              <Typography>暂无组织架构数据</Typography>
            </Box>
          ) : (
            renderTree(filteredTreeData)
          )}
        </Box>
      </Box>

      {/* 右侧详情面板 */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {selectedNode ? (
                <>
                  {selectedNode.type === "company" ? (
                    <Building sx={{ width: 24, height: 24, color: "#3b82f6" }} />
                  ) : (
                    <Building2 sx={{ width: 24, height: 24, color: "success.main" }} />
                  )}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedNode.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedNode.type === "company" ? "公司" : "部门"}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    请选择组织
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    在左侧选择公司或部门查看详情
                  </Typography>
                </Box>
              )}
            </Box>

            {selectedNode && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={selectedNode.type === "company" ? handleEditCompany : handleEditDepartment}
                  startIcon={<Edit sx={{ width: 16, height: 16 }} />}
                >
                  编辑
                </Button>
                {selectedNode.type === "department" && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCreateDepartment}
                    startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                  >
                    添加子部门
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ color: "error.main", borderColor: "error.main" }}
                  onClick={selectedNode.type === "company" ? handleDeleteCompany : handleDeleteDepartment}
                  startIcon={<Trash2 sx={{ width: 16, height: 16 }} />}
                >
                  删除
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", p: 3, bgcolor: "grey.50" }}>
          {selectedNode ? (
            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
                  <Users sx={{ width: 20, height: 20 }} />
                  员工列表
                </Typography>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                    <Users sx={{ width: 48, height: 48, mx: "auto", mb: 2, opacity: 0.5 }} />
                    <Typography>暂无员工</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {employees.map((emp) => (
                      <Box
                        key={emp.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          p: 1.5,
                          bgcolor: "grey.50",
                          borderRadius: 1,
                          "&:hover": { bgcolor: "grey.100" },
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            bgcolor: "#3b82f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Users sx={{ width: 20, height: 20, color: "white" }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 500 }}>{emp.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {emp.position || "无职位"}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={emp.status === "active" ? "在职" : "离职"}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Box sx={{ textAlign: "center", color: "text.secondary" }}>
                <Building sx={{ width: 64, height: 64, mx: "auto", mb: 3, opacity: 0.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  选择一个组织
                </Typography>
                <Typography variant="body2">在左侧树形结构中选择公司或部门</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* 公司模态框 */}
      <Dialog open={showCompanyModal} onClose={() => setShowCompanyModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {modalMode === "create" ? "创建公司" : modalMode === "edit" ? "编辑公司" : "查看公司"}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="公司名称"
              size="small"
              value={companyFormData.name || ""}
              onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
              disabled={modalMode === "view"}
              placeholder="请输入公司名称"
            />
            <TextField
              label="公司简称"
              size="small"
              value={companyFormData.short_name || ""}
              onChange={(e) => setCompanyFormData({ ...companyFormData, short_name: e.target.value })}
              disabled={modalMode === "view"}
              placeholder="请输入公司简称"
            />
            <TextField
              label="公司地址"
              size="small"
              value={companyFormData.address || ""}
              onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
              disabled={modalMode === "view"}
              placeholder="请输入公司地址"
            />
            <TextField
              label="公司描述"
              size="small"
              multiline
              rows={3}
              value={companyFormData.description || ""}
              onChange={(e) => setCompanyFormData({ ...companyFormData, description: e.target.value })}
              disabled={modalMode === "view"}
              placeholder="请输入公司描述"
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 3 }}>
            {modalMode !== "view" && (
              <Button onClick={handleSaveCompany} variant="contained" sx={{ bgcolor: "#3b82f6" }}>
                {modalMode === "create" ? "创建" : "保存"}
              </Button>
            )}
            {modalMode === "view" && (
              <Button onClick={() => setShowCompanyModal(false)} variant="contained">
                关闭
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* 部门模态框 */}
      <Dialog open={showDeptModal} onClose={() => setShowDeptModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {modalMode === "create" ? "创建部门" : modalMode === "edit" ? "编辑部门" : "查看部门"}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="部门名称"
              size="small"
              value={deptFormData.name || ""}
              onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
              disabled={modalMode === "view"}
              placeholder="请输入部门名称"
            />
            <TextField
              label="部门编码"
              size="small"
              value={deptFormData.code || ""}
              onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value })}
              disabled={modalMode === "view"}
              placeholder="请输入部门编码"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>上级部门</InputLabel>
              <Select
                value={deptFormData.parent_id || "none"}
                onChange={(e) =>
                  setDeptFormData({
                    ...deptFormData,
                    parent_id: e.target.value === "none" ? undefined : (e.target.value as string),
                  })
                }
                disabled={modalMode === "view"}
                label="上级部门"
              >
                <MenuItem value="none">无上级部门</MenuItem>
                {availableParentDepts.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="部门描述"
              size="small"
              multiline
              rows={3}
              value={deptFormData.description || ""}
              onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
              disabled={modalMode === "view"}
              placeholder="请输入部门描述"
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 3 }}>
            {modalMode !== "view" && (
              <Button onClick={handleSaveDepartment} variant="contained" sx={{ bgcolor: "#3b82f6" }}>
                {modalMode === "create" ? "创建" : "保存"}
              </Button>
            )}
            {modalMode === "view" && (
              <Button onClick={() => setShowDeptModal(false)} variant="contained">
                关闭
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HrmOrganizationPage;