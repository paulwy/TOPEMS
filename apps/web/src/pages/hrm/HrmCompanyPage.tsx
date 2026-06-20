import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  InputAdornment,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  Tooltip,
  Box,
  Stack,
  IconButton,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import { apiLogger } from "@/utils/logger";
import {
  Building,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  Users,
  Folder,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
} from "lucide-react";
import {
  companyApi,
  departmentApi,
  employeeApi,
  type Company,
  type Department,
  type Employee,
  type PaginatedResult,
  type ListParams,
} from "@/api/hrm";
import { useAppStore } from "../../store";
import type { TreeNode } from "@/components/TreeView";
import TreeView from "@/components/TreeView";
import { StatCardGroup } from "@/components/mui";
import { logger } from "@/utils/logger";

const HrmCompanyPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({});

  const [showDetailView, setShowDetailView] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  const fetchCompanies = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await companyApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as PaginatedResult<Company>;
        setCompanies(data.items || []);
        setTotal(data.total || 0);
      } else {
        setCompanies([]);
        setTotal(0);
      }
    } catch (error: any) {
      addNotification({
        title: "加载失败",
        message: error.message || "获取公司列表失败",
        type: "error",
      });
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId: string) => {
    setLoading(true);
    try {
      const [deptResponse, empResponse] = await Promise.all([
        departmentApi.list({ company_id: companyId, page_size: 100 }),
        employeeApi.list({ page_size: 200 }),
      ]);

      const depts: Department[] =
        deptResponse.code === 200 && deptResponse.data
          ? (deptResponse.data as PaginatedResult<Department>).items || []
          : [];
      const emps: Employee[] =
        empResponse.code === 200 && empResponse.data
          ? (empResponse.data as PaginatedResult<Employee>).items || []
          : [];

      setDepartments(depts);
      setEmployees(emps);

      const tree = buildTree(depts, emps);
      setTreeData(tree);
    } catch (error: any) {
      apiLogger.error("Failed to fetch company details:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (depts: Department[], emps: Employee[]): TreeNode[] => {
    const deptMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    depts.forEach((dept) => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: "department" as const,
        children: [],
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
  };

  useEffect(() => {
    fetchCompanies({ page: currentPage, page_size: pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (currentCompany) {
      fetchCompanyDetails(currentCompany.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCompanies({
      page: 1,
      page_size: pageSize,
      search: searchText || undefined,
      status: statusFilter === "all" ? undefined : statusFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("all");
    setCurrentPage(1);
    fetchCompanies({ page: 1, page_size: pageSize });
  };

  const handleAdd = () => {
    setSelectedCompany(null);
    setFormData({
      status: "active",
      organization_id: "00000000-0000-0000-0000-000000000001",
    });
    setShowCreateModal(true);
  };

  const handleEdit = (record: Company) => {
    setSelectedCompany(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Company) => {
    setSelectedCompany(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个公司吗？")) return;
    try {
      const response = await companyApi.delete(id);
      if (response.code === 200) {
        addNotification({
          title: "成功",
          message: "公司删除成功",
          type: "success",
        });
        fetchCompanies({ page: currentPage, page_size: pageSize });
      } else {
        addNotification({
          title: "失败",
          message: "删除公司失败",
          type: "error",
        });
      }
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: error.message || "删除公司失败",
        type: "error",
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companyApi.create(formData);
      addNotification({
        title: "成功",
        message: "公司创建成功",
        type: "success",
      });
      setShowCreateModal(false);
      setFormData({ status: "active" });
      fetchCompanies({ page: currentPage, page_size: pageSize });
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: error.message || "创建公司失败",
        type: "error",
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await companyApi.update(selectedCompany.id, formData);
      addNotification({
        title: "成功",
        message: "公司更新成功",
        type: "success",
      });
      setShowEditModal(false);
      setSelectedCompany(null);
      fetchCompanies({ page: currentPage, page_size: pageSize });
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: error.message || "更新公司失败",
        type: "error",
      });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      active: "启用",
      inactive: "禁用",
      archived: "归档",
    };
    return (
      <Chip size="small" variant="outlined" label={labels[status] || status} />
    );
  };

  const openDetailView = (company: Company) => {
    setCurrentCompany(company);
    setShowDetailView(true);
  };

  const closeDetailView = () => {
    setCurrentCompany(null);
    setShowDetailView(false);
    setTreeData([]);
  };

  const pages = Math.ceil(total / pageSize);

  const renderPagination = () => {
    if (pages <= 1) return null;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pt: 2,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            每页显示
          </Typography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <MuiSelect
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </MuiSelect>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            条
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </Button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              size="small"
              variant={currentPage === page ? "contained" : "outlined"}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            size="small"
            variant="outlined"
            disabled={currentPage === pages}
            onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
          >
            下一页
          </Button>
        </Stack>
      </Box>
    );
  };

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
              公司管理
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
                公司管理
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
                管理企业基本信息和组织架构
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* 内容区域 */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 3 }}>
        {showDetailView && currentCompany ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <IconButton onClick={closeDetailView} size="small">
                    <ArrowLeft sx={{ width: 20, height: 20 }} />
                  </IconButton>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, fontSize: "1.5rem" }}
                    >
                      {currentCompany.name}
                    </Typography>
                    {currentCompany.short_name && (
                      <Typography variant="body2" sx={{ color: "grey.500" }}>
                        {currentCompany.short_name}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {getStatusBadge(currentCompany.status)}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleEdit(currentCompany)}
                    startIcon={<Edit sx={{ width: 16, height: 16 }} />}
                  >
                    编辑
                  </Button>
                </Box>
              </CardHeader>
              <CardContent sx={{ pt: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" },
                    gap: 3,
                  }}
                >
                  <Box>
                    <Card sx={{ mb: 2 }}>
                      <CardHeader sx={{ pb: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            fontSize: "1rem",
                          }}
                        >
                          <Folder
                            sx={{
                              width: 20,
                              height: 20,
                              color: "warning.main",
                            }}
                          />
                          组织架构
                        </Typography>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <Box sx={{ p: 4, textAlign: "center" }}>
                            <Box
                              sx={{
                                display: "inline-block",
                                width: 32,
                                height: 32,
                                border: 4,
                                borderColor: "primary.main",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ mt: 1, color: "text.secondary" }}
                            >
                              加载中...
                            </Typography>
                          </Box>
                        ) : treeData.length === 0 ? (
                          <Box
                            sx={{
                              p: 3,
                              textAlign: "center",
                              color: "text.secondary",
                            }}
                          >
                            暂无部门和员工数据
                          </Box>
                        ) : (
                          <TreeView data={treeData} />
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader sx={{ pb: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            fontSize: "1rem",
                          }}
                        >
                          <FileText
                            sx={{ width: 20, height: 20, color: "grey.500" }}
                          />
                          公司信息
                        </Typography>
                      </CardHeader>
                      <CardContent
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 2,
                          }}
                        >
                          <Box>
                            <InputLabel
                              sx={{ fontSize: 12, color: "text.secondary" }}
                            >
                              公司名称
                            </InputLabel>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, mt: 0.5 }}
                            >
                              {currentCompany.name}
                            </Typography>
                          </Box>
                          <Box>
                            <InputLabel
                              sx={{ fontSize: 12, color: "text.secondary" }}
                            >
                              简称
                            </InputLabel>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, mt: 0.5 }}
                            >
                              {currentCompany.short_name || "-"}
                            </Typography>
                          </Box>
                          <Box>
                            <InputLabel
                              sx={{ fontSize: 12, color: "text.secondary" }}
                            >
                              注册号
                            </InputLabel>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, mt: 0.5 }}
                            >
                              {currentCompany.registration_number || "-"}
                            </Typography>
                          </Box>
                          <Box>
                            <InputLabel
                              sx={{ fontSize: 12, color: "text.secondary" }}
                            >
                              税号
                            </InputLabel>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, mt: 0.5 }}
                            >
                              {currentCompany.tax_number || "-"}
                            </Typography>
                          </Box>
                        </Box>
                        <Box>
                          <InputLabel
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          >
                            地址
                          </InputLabel>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, mt: 0.5 }}
                          >
                            {currentCompany.address || "-"}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                          }}
                        >
                          {currentCompany.contact_phone && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                color: "text.secondary",
                              }}
                            >
                              <Phone sx={{ width: 16, height: 16 }} />
                              <Typography variant="body2">
                                {currentCompany.contact_phone}
                              </Typography>
                            </Box>
                          )}
                          {currentCompany.email && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                color: "text.secondary",
                              }}
                            >
                              <Mail sx={{ width: 16, height: 16 }} />
                              <Typography variant="body2">
                                {currentCompany.email}
                              </Typography>
                            </Box>
                          )}
                          {currentCompany.website && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                color: "text.secondary",
                              }}
                            >
                              <Globe sx={{ width: 16, height: 16 }} />
                              <Typography variant="body2">
                                {currentCompany.website}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 2,
                        mb: 3,
                      }}
                    >
                      <Card
                        sx={{
                          background:
                            "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
                          border: "1px solid #a5b4fc",
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ color: "primary.main" }}
                              >
                                部门数量
                              </Typography>
                              <Typography
                                variant="h5"
                                sx={{ fontWeight: 700, color: "primary.dark" }}
                              >
                                {departments.length}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                bgcolor: "white",
                                borderRadius: "50%",
                                boxShadow: 1,
                              }}
                            >
                              <Folder
                                sx={{
                                  width: 24,
                                  height: 24,
                                  color: "primary.main",
                                }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                      <Card
                        sx={{
                          background:
                            "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                          border: "1px solid #6ee7b7",
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ color: "success.main" }}
                              >
                                员工数量
                              </Typography>
                              <Typography
                                variant="h5"
                                sx={{ fontWeight: 700, color: "success.dark" }}
                              >
                                {employees.length}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                bgcolor: "white",
                                borderRadius: "50%",
                                boxShadow: 1,
                              }}
                            >
                              <Users
                                sx={{
                                  width: 24,
                                  height: 24,
                                  color: "success.main",
                                }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>

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
                          <Users
                            sx={{
                              width: 20,
                              height: 20,
                              color: "primary.main",
                            }}
                          />
                          部门列表
                        </Typography>
                      </CardHeader>
                      <CardContent>
                        {departments.length === 0 ? (
                          <Box
                            sx={{
                              p: 4,
                              textAlign: "center",
                              color: "text.secondary",
                            }}
                          >
                            <Folder
                              sx={{
                                width: 48,
                                height: 48,
                                color: "grey.400",
                                mx: "auto",
                                mb: 2,
                              }}
                            />
                            <Typography>暂无部门数据</Typography>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1.5,
                            }}
                          >
                            {departments.map((dept) => (
                              <Box
                                key={dept.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  p: 1.5,
                                  bgcolor: "grey.50",
                                  borderRadius: 1,
                                  "&:hover": { bgcolor: "grey.100" },
                                }}
                              >
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {dept.name}
                                  </Typography>
                                  {dept.code && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      编码: {dept.code}
                                    </Typography>
                                  )}
                                </Box>
                                <Chip
                                  size="small"
                                  variant={
                                    dept.status === "active"
                                      ? "filled"
                                      : "outlined"
                                  }
                                  label={
                                    dept.status === "active" ? "启用" : "禁用"
                                  }
                                />
                              </Box>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, fontSize: "1.125rem" }}
                  >
                    公司列表
                  </Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    共 {total} 家公司
                  </Typography>
                </Box>
                <Button
                  onClick={handleAdd}
                  startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                >
                  新增公司
                </Button>
              </CardHeader>
              <CardContent>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
                  <TextField
                    size="small"
                    placeholder="搜索公司名称、编码或邮箱"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
                    sx={{ flex: 1, minWidth: 200 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>全部状态</InputLabel>
                    <MuiSelect
                      value={statusFilter}
                      label="全部状态"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">全部状态</MenuItem>
                      <MenuItem value="active">启用</MenuItem>
                      <MenuItem value="inactive">禁用</MenuItem>
                      <MenuItem value="archived">归档</MenuItem>
                    </MuiSelect>
                  </FormControl>
                  <Button variant="contained" onClick={handleSearch}>
                    搜索
                  </Button>
                  <Button variant="outlined" onClick={handleReset}>
                    重置
                  </Button>
                </Box>

                {loading ? (
                  <Box sx={{ p: 6, textAlign: "center" }}>
                    <Box
                      sx={{
                        display: "inline-block",
                        width: 32,
                        height: 32,
                        border: 4,
                        borderColor: "primary.main",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <Typography sx={{ mt: 1, color: "text.secondary" }}>
                      加载中...
                    </Typography>
                  </Box>
                ) : companies.length === 0 ? (
                  <Box sx={{ p: 8, textAlign: "center" }}>
                    <Building
                      sx={{
                        width: 64,
                        height: 64,
                        color: "grey.400",
                        mx: "auto",
                        mb: 3,
                      }}
                    />
                    <Typography sx={{ color: "text.secondary" }}>
                      暂无公司数据
                    </Typography>
                    <Button
                      onClick={handleAdd}
                      sx={{ mt: 2 }}
                      startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                    >
                      新增公司
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "1fr 1fr",
                          lg: "1fr 1fr 1fr",
                        },
                        gap: 2,
                        mb: 3,
                      }}
                    >
                      {companies.map((company) => (
                        <Card
                          key={company.id}
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              boxShadow: 6,
                              transform: "translateY(-2px)",
                            },
                            transition: "all 0.2s",
                          }}
                          onClick={() => openDetailView(company)}
                        >
                          <CardContent sx={{ p: 2.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                mb: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    background:
                                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: 2,
                                  }}
                                >
                                  <Building
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      color: "white",
                                    }}
                                  />
                                </Box>
                                <Box>
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 600, fontSize: "1rem" }}
                                  >
                                    {company.name}
                                  </Typography>
                                  {company.short_name && (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {company.short_name}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              {getStatusBadge(company.status)}
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                                fontSize: "0.875rem",
                                color: "text.secondary",
                              }}
                            >
                              {company.contact_phone && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Phone sx={{ width: 14, height: 14 }} />
                                  <Typography variant="body2">
                                    {company.contact_phone}
                                  </Typography>
                                </Box>
                              )}
                              {company.email && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Mail sx={{ width: 14, height: 14 }} />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {company.email}
                                  </Typography>
                                </Box>
                              )}
                              {company.address && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 0.5,
                                  }}
                                >
                                  <MapPin
                                    sx={{ width: 14, height: 14, mt: 0.5 }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {company.address}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 1,
                                mt: 2,
                                pt: 2,
                                borderTop: 1,
                                borderColor: "divider",
                                opacity: 0,
                                transition: "opacity 0.2s",
                                ".MuiCard-root:hover &": { opacity: 1 },
                              }}
                            >
                              <Tooltip title="查看">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleView(company);
                                  }}
                                >
                                  <Eye sx={{ width: 16, height: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="编辑">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(company);
                                  }}
                                >
                                  <Edit sx={{ width: 16, height: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="删除">
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: "error.main",
                                    "&:hover": { color: "error.dark" },
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(company.id);
                                  }}
                                >
                                  <Trash2 sx={{ width: 16, height: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>

                    {renderPagination()}
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>新增公司</DialogTitle>
          <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              请填写公司信息
            </Typography>
            <Box
              component="form"
              onSubmit={handleCreate}
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              <Box>
                <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                  公司名称{" "}
                  <Typography component="span" sx={{ color: "error.main" }}>
                    *
                  </Typography>
                </InputLabel>
                <TextField
                  fullWidth
                  size="small"
                  required
                  value={(formData as Company)?.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
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
                  value={(formData as Company)?.short_name || ""}
                  onChange={(e) =>
                    handleInputChange("short_name", e.target.value)
                  }
                  placeholder="请输入公司简称"
                />
              </Box>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    注册号
                  </InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    value={(formData as Company)?.registration_number || ""}
                    onChange={(e) =>
                      handleInputChange("registration_number", e.target.value)
                    }
                    placeholder="请输入注册号"
                  />
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    税号
                  </InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    value={(formData as Company)?.tax_number || ""}
                    onChange={(e) =>
                      handleInputChange("tax_number", e.target.value)
                    }
                    placeholder="请输入税号"
                  />
                </Box>
              </Box>
              <Box>
                <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                  地址
                </InputLabel>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={(formData as Company)?.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="请输入地址"
                />
              </Box>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    联系电话
                  </InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    value={(formData as Company)?.contact_phone || ""}
                    onChange={(e) =>
                      handleInputChange("contact_phone", e.target.value)
                    }
                    placeholder="请输入联系电话"
                  />
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    邮箱
                  </InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    value={(formData as Company)?.email || ""}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="请输入邮箱"
                  />
                </Box>
              </Box>
              <Box>
                <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                  网站
                </InputLabel>
                <TextField
                  fullWidth
                  size="small"
                  value={(formData as Company)?.website || ""}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="请输入网站地址"
                />
              </Box>
              <Box>
                <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                  状态
                </InputLabel>
                <FormControl fullWidth size="small">
                  <MuiSelect
                    value={(formData as Company)?.status || "active"}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value as string)
                    }
                  >
                    <MenuItem value="active">启用</MenuItem>
                    <MenuItem value="inactive">禁用</MenuItem>
                    <MenuItem value="archived">归档</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                  mt: 2,
                }}
              >
                <Button
                  variant="contained"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </Button>
                <Button type="submit" variant="contained" color="primary">
                  创建
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>编辑公司</DialogTitle>
          <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              修改公司信息
            </Typography>
            {selectedCompany && (
              <Box
                component="form"
                onSubmit={handleUpdate}
                sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
              >
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    公司名称{" "}
                    <Typography component="span" sx={{ color: "error.main" }}>
                      *
                    </Typography>
                  </InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    value={(formData as Company)?.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    公司简称
                  </InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    value={(formData as Company)?.short_name || ""}
                    onChange={(e) =>
                      handleInputChange("short_name", e.target.value)
                    }
                  />
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                      注册号
                    </InputLabel>
                    <TextField
                      fullWidth
                      size="small"
                      value={(formData as Company)?.registration_number || ""}
                      onChange={(e) =>
                        handleInputChange("registration_number", e.target.value)
                      }
                    />
                  </Box>
                  <Box>
                    <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                      税号
                    </InputLabel>
                    <TextField
                      fullWidth
                      size="small"
                      value={(formData as Company)?.tax_number || ""}
                      onChange={(e) =>
                        handleInputChange("tax_number", e.target.value)
                      }
                    />
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    地址
                  </InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={(formData as Company)?.address || ""}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                  />
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                      联系电话
                    </InputLabel>
                    <TextField
                      fullWidth
                      size="small"
                      value={(formData as Company)?.contact_phone || ""}
                      onChange={(e) =>
                        handleInputChange("contact_phone", e.target.value)
                      }
                    />
                  </Box>
                  <Box>
                    <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                      邮箱
                    </InputLabel>
                    <TextField
                      fullWidth
                      size="small"
                      type="email"
                      value={(formData as Company)?.email || ""}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                    />
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    网站
                  </InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    value={(formData as Company)?.website || ""}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                  />
                </Box>
                <Box>
                  <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                    状态
                  </InputLabel>
                  <FormControl fullWidth size="small">
                    <MuiSelect
                      value={(formData as Company)?.status || "active"}
                      onChange={(e) =>
                        handleInputChange("status", e.target.value as string)
                      }
                    >
                      <MenuItem value="active">启用</MenuItem>
                      <MenuItem value="inactive">禁用</MenuItem>
                      <MenuItem value="archived">归档</MenuItem>
                    </MuiSelect>
                  </FormControl>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                    mt: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCompany(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button type="submit" variant="contained" color="primary">
                    保存
                  </Button>
                </Box>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={showViewModal}
          onClose={() => setShowViewModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>公司详情</DialogTitle>
          <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              查看公司详细信息
            </Typography>
            {selectedCompany && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                      公司名称
                    </InputLabel>
                    <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                      {selectedCompany.name}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                      公司简称
                    </InputLabel>
                    <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                      {selectedCompany.short_name || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                      注册号
                    </InputLabel>
                    <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                      {selectedCompany.registration_number || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                      税号
                    </InputLabel>
                    <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                      {selectedCompany.tax_number || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                    地址
                  </InputLabel>
                  <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                    {selectedCompany.address || "-"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                      联系电话
                    </InputLabel>
                    <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                      {selectedCompany.contact_phone || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                      邮箱
                    </InputLabel>
                    <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                      {selectedCompany.email || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                    网站
                  </InputLabel>
                  <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                    {selectedCompany.website || "-"}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                    状态
                  </InputLabel>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusBadge(selectedCompany.status)}
                  </Box>
                </Box>
              </Box>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => setShowViewModal(false)}
              >
                关闭
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
};

export default HrmCompanyPage;
