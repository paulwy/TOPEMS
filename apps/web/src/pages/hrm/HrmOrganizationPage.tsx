import { Card, CardContent, CardHeader, Chip, Typography, TextField, InputAdornment, Dialog, DialogContent, DialogTitle, FormControl, InputLabel, Select as MuiSelect, MenuItem, Tooltip, Box, Stack,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect, useMemo } from "react";
import {
  Building,
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
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
} from "@/api/hrm";
import { useAppStore } from "../../store";
import { AIHelperButton, AICodeGenerator } from "@/components/ai";
import { StatCardGroup } from "@/components/mui";
import { apiLogger } from "@/utils/logger";

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
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState("");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<OrganizationNode | null>(
    null,
  );

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">(
    "create",
  );

  const [companyFormData, setCompanyFormData] = useState<Partial<Company>>({});
  const [deptFormData, setDeptFormData] = useState<Partial<Department>>({});

  const handleSelectAICode = (code: string) => {
    setDeptFormData((prev) => ({ ...prev, code }));
  };

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

      const companyDepts = departments.filter(
        (d) => d.company_id === company.id,
      );
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
            bgcolor:
              selectedNode?.id === node.id ? "primary.50" : "transparent",
            color:
              selectedNode?.id === node.id ? "primary.main" : "text.primary",
            "&:hover": { bgcolor: "grey.100" },
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
                  transform: expandedIds.has(node.id)
                    ? "rotate(90deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </Box>
          )}
          {node.children && node.children.length === 0 && (
            <Box sx={{ width: 20 }} />
          )}
          {node.type === "company" ? (
            <Building
              style={{ width: 16, height: 16, color: "primary.main" }}
            />
          ) : (
            <Building2
              style={{ width: 16, height: 16, color: "success.main" }}
            />
          )}
          <Box sx={{ fontWeight: 500, fontSize: "0.875rem" }}>{node.name}</Box>
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
    return employees.filter((e) => deptIds.includes(e.department_id || ""))
      .length;
  };

  const getDeptEmployeeCount = (deptId: string): number => {
    return employees.filter((e) => e.department_id === deptId).length;
  };

  const handleNodeSelect = (node: OrganizationNode) => {
    setSelectedNode(node);
    if (node.type === "department") {
      const deptId = node.id.replace("dept-", "");
      fetchDeptEmployees(deptId);
    } else {
      fetchCompanyEmployees(node.companyId!);
    }
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

  const fetchCompanyEmployees = async (companyId: string) => {
    try {
      const companyDepts = departments.filter(
        (d) => d.company_id === companyId,
      );
      const deptIds = companyDepts.map((d) => d.id).join(",");
      const response = await employeeApi.list({
        department_id: undefined,
        page_size: 200,
      });
      if (response.code === 200 && response.data) {
        const allEmps = (response.data as any).items || [];
        const filtered = allEmps.filter((e: Employee) =>
          deptIds.includes(e.department_id || ""),
        );
        setEmployees(filtered);
      }
    } catch (error: any) {
      apiLogger.error("Failed to fetch employees:", error);
    }
  };

  const fetchDeptEmployees = async (deptId: string) => {
    try {
      const response = await employeeApi.list({
        department_id: deptId,
        page_size: 100,
      });
      if (response.code === 200 && response.data) {
        setEmployees((response.data as any).items || []);
      }
    } catch (error: any) {
      apiLogger.error("Failed to fetch employees:", error);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleViewCompany = () => {
    if (selectedNode?.type === "company" && selectedNode.data) {
      setModalMode("view");
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
          } else {
            addNotification({
              title: "失败",
              message: "删除失败",
              type: "error",
            });
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
          addNotification({
            title: "成功",
            message: "创建成功",
            type: "success",
          });
          setShowCompanyModal(false);
          fetchData();
        }
      } else {
        if (companyFormData.id) {
          const response = await companyApi.update(
            companyFormData.id,
            companyFormData as Company,
          );
          if (response.code === 200) {
            addNotification({
              title: "成功",
              message: "更新成功",
              type: "success",
            });
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

  const handleViewDepartment = () => {
    if (selectedNode?.type === "department" && selectedNode.data) {
      setModalMode("view");
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
            addNotification({
              title: "成功",
              message: "删除成功",
              type: "success",
            });
            fetchData();
            setSelectedNode(null);
          } else {
            addNotification({
              title: "失败",
              message: "删除失败",
              type: "error",
            });
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
          addNotification({
            title: "成功",
            message: "创建成功",
            type: "success",
          });
          setShowDeptModal(false);
          fetchData();
        }
      } else {
        if (deptFormData.id) {
          const response = await departmentApi.update(
            deptFormData.id,
            deptFormData as Department,
          );
          if (response.code === 200) {
            addNotification({
              title: "成功",
              message: "更新成功",
              type: "success",
            });
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
    const companyId =
      selectedNode.type === "company"
        ? selectedNode.companyId
        : selectedNode.companyId;
    if (!companyId) return [];
    return departments.filter(
      (d) => d.company_id === companyId && d.id !== (deptFormData.id as string),
    );
  }, [selectedNode, departments, deptFormData.id]);

  // 组织统计数据
  const organizationStats = useMemo(() => {
    const companyCount = companies.length;
    const departmentCount = departments.length;
    const employeeCount = employees.length;
    const activeDepartmentCount = departments.filter(
      (d) => d.status === "active",
    ).length;

    return [
      {
        title: "公司数",
        value: companyCount,
        unit: "家",
        icon: <Building style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        title: "部门数",
        value: departmentCount,
        unit: "个",
        icon: <Building2 style={{ width: 24, height: 24 }} />,
        color: "secondary" as const,
      },
      {
        title: "员工总数",
        value: employeeCount,
        unit: "人",
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        title: "启用部门数",
        value: activeDepartmentCount,
        unit: "个",
        icon: <Building2 style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
    ];
  }, [companies, departments, employees]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      {/* 页面头部 */}
      <Box
        sx={{
          bgcolor: "white",
          borderBottom: 1,
          borderColor: "divider",
          boxShadow: 1,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 2 }}>
          {/* 面包屑导航 */}
          <Box sx={{ mb: 2 }}>
            <Typography
              component="a"
              href="/hrm"
              sx={{
                color: "text.secondary",
                textDecoration: "none",
                fontSize: "0.875rem",
                "&:hover": {
                  color: "primary.main",
                  textDecoration: "underline",
                },
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
              组织架构
            </Typography>
          </Box>

          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "grey.900" }}
              >
                组织架构
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
                管理企业组织架构和部门信息
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* 统计卡片区域 */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 2 }}>
        <StatCardGroup stats={organizationStats} loading={loading} />
      </Box>

      {/* 内容区域 */}
      <Box sx={{ display: "flex", height: "calc(100vh - 200px)" }}>
        <Box
          sx={{
            width: 320,
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.5,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                组织架构
              </Typography>
              <Button
                size="small"
                onClick={handleCreateCompany}
                startIcon={<Plus sx={{ width: 16, height: 16 }} />}
              >
                新增
              </Button>
            </Box>
            <TextField
              size="small"
              fullWidth
              placeholder="搜索公司或部门..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        sx={{ width: 16, height: 16, color: "grey.400" }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 128,
                }}
              >
                <Box
                  sx={{
                    animation: "spin 1s linear infinite",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <RefreshCw
                    sx={{ width: 20, height: 20, color: "primary.main" }}
                  />
                </Box>
              </Box>
            ) : filteredTreeData.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                <Building
                  sx={{
                    width: 48,
                    height: 48,
                    mx: "auto",
                    mb: 2,
                    opacity: 0.5,
                  }}
                />
                <Typography>暂无组织架构数据</Typography>
              </Box>
            ) : (
              renderTree(filteredTreeData)
            )}
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {selectedNode ? (
                  <>
                    {selectedNode.type === "company" ? (
                      <Building
                        sx={{ width: 24, height: 24, color: "primary.main" }}
                      />
                    ) : (
                      <Building2
                        sx={{ width: 24, height: 24, color: "success.main" }}
                      />
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
                    onClick={
                      selectedNode.type === "company"
                        ? handleViewCompany
                        : handleViewDepartment
                    }
                    startIcon={<Eye sx={{ width: 16, height: 16 }} />}
                  >
                    查看
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={
                      selectedNode.type === "company"
                        ? handleEditCompany
                        : handleEditDepartment
                    }
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
                    sx={{
                      color: "error.main",
                      borderColor: "error.main",
                      "&:hover": {
                        borderColor: "error.dark",
                        color: "error.dark",
                      },
                    }}
                    onClick={
                      selectedNode.type === "company"
                        ? handleDeleteCompany
                        : handleDeleteDepartment
                    }
                    startIcon={<Trash2 sx={{ width: 16, height: 16 }} />}
                  >
                    删除
                  </Button>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "grey.50" }}>
            {selectedNode ? (
              <Card>
                <CardHeader>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Users sx={{ width: 20, height: 20 }} />
                    员工列表
                  </Typography>
                </CardHeader>
                <CardContent>
                  {employees.length === 0 ? (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 4,
                        color: "text.secondary",
                      }}
                    >
                      <Users
                        sx={{
                          width: 48,
                          height: 48,
                          mx: "auto",
                          mb: 2,
                          opacity: 0.5,
                        }}
                      />
                      <Typography>暂无员工</Typography>
                    </Box>
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
                              bgcolor: "primary.100",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Users
                              sx={{
                                width: 20,
                                height: 20,
                                color: "primary.main",
                              }}
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 500 }}>
                              {emp.name}
                            </Typography>
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <Box sx={{ textAlign: "center", color: "text.secondary" }}>
                  <Building
                    sx={{
                      width: 64,
                      height: 64,
                      mx: "auto",
                      mb: 3,
                      opacity: 0.5,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    选择一个组织
                  </Typography>
                  <Typography variant="body2">
                    在左侧树形结构中选择公司或部门
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "create"
            ? "创建公司"
            : modalMode === "edit"
              ? "编辑公司"
              : "查看公司"}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                公司名称
              </InputLabel>
              <TextField
                fullWidth
                size="small"
                value={companyFormData.name || ""}
                onChange={(e) =>
                  setCompanyFormData({
                    ...companyFormData,
                    name: e.target.value,
                  })
                }
                disabled={modalMode === "view"}
                placeholder="请输入公司名称"
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                公司简称
              </InputLabel>
              <TextField
                fullWidth
                size="small"
                value={companyFormData.short_name || ""}
                onChange={(e) =>
                  setCompanyFormData({
                    ...companyFormData,
                    short_name: e.target.value,
                  })
                }
                disabled={modalMode === "view"}
                placeholder="请输入公司简称"
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                公司地址
              </InputLabel>
              <TextField
                fullWidth
                size="small"
                value={companyFormData.address || ""}
                onChange={(e) =>
                  setCompanyFormData({
                    ...companyFormData,
                    address: e.target.value,
                  })
                }
                disabled={modalMode === "view"}
                placeholder="请输入公司地址"
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                公司描述
              </InputLabel>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                value={companyFormData.description || ""}
                onChange={(e) =>
                  setCompanyFormData({
                    ...companyFormData,
                    description: e.target.value,
                  })
                }
                disabled={modalMode === "view"}
                placeholder="请输入公司描述"
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                状态
              </InputLabel>
              <FormControl fullWidth size="small">
                <MuiSelect
                  value={companyFormData.status || ""}
                  onChange={(e) =>
                    setCompanyFormData({
                      ...companyFormData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  disabled={modalMode === "view"}
                >
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="inactive">禁用</MenuItem>
                </MuiSelect>
              </FormControl>
            </Box>
          </Box>
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 3 }}
          >
            {modalMode !== "view" && (
              <Button onClick={handleSaveCompany} variant="contained">
                {modalMode === "create" ? "创建" : "保存"}
              </Button>
            )}
            {modalMode === "view" && (
              <Button
                onClick={() => setShowCompanyModal(false)}
                variant="contained"
              >
                关闭
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "create"
            ? "创建部门"
            : modalMode === "edit"
              ? "编辑部门"
              : "查看部门"}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                部门名称
              </InputLabel>
              <TextField
                fullWidth
                size="small"
                value={deptFormData.name || ""}
                onChange={(e) =>
                  setDeptFormData({ ...deptFormData, name: e.target.value })
                }
                disabled={modalMode === "view"}
                placeholder="请输入部门名称"
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                部门编码
              </InputLabel>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={deptFormData.code || ""}
                  onChange={(e) =>
                    setDeptFormData({ ...deptFormData, code: e.target.value })
                  }
                  disabled={modalMode === "view"}
                  placeholder="请输入部门编码"
                />
                <AIHelperButton
                  type="generate"
                  onClick={() => setShowAICodeGenerator(true)}
                  size="small"
                  label="AI生成"
                  variant="text"
                />
              </Box>
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                上级部门
              </InputLabel>
              <FormControl fullWidth size="small">
                <MuiSelect
                  value={deptFormData.parent_id || "none"}
                  onChange={(e) =>
                    setDeptFormData({
                      ...deptFormData,
                      parent_id:
                        e.target.value === "none"
                          ? undefined
                          : (e.target.value as string),
                    })
                  }
                  disabled={modalMode === "view"}
                >
                  <MenuItem value="none">无上级部门</MenuItem>
                  {availableParentDepts.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </FormControl>
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                部门描述
              </InputLabel>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                value={deptFormData.description || ""}
                onChange={(e) =>
                  setDeptFormData({
                    ...deptFormData,
                    description: e.target.value,
                  })
                }
                disabled={modalMode === "view"}
                placeholder="请输入部门描述"
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                状态
              </InputLabel>
              <FormControl fullWidth size="small">
                <MuiSelect
                  value={deptFormData.status || ""}
                  onChange={(e) =>
                    setDeptFormData({
                      ...deptFormData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  disabled={modalMode === "view"}
                >
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="inactive">禁用</MenuItem>
                </MuiSelect>
              </FormControl>
            </Box>
          </Box>
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 3 }}
          >
            {modalMode !== "view" && (
              <Button onClick={handleSaveDepartment} variant="contained">
                {modalMode === "create" ? "创建" : "保存"}
              </Button>
            )}
            {modalMode === "view" && (
              <Button
                onClick={() => setShowDeptModal(false)}
                variant="contained"
              >
                关闭
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{
          entityType: "department",
          name: deptFormData.name,
        }}
        onSelect={handleSelectAICode}
        existingCodes={
          departments.map((d) => d.code).filter(Boolean) as string[]
        }
      />
    </Box>
  );
};

export default HrmOrganizationPage;
