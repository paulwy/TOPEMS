import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Box,
  Stack,
  IconButton,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  positionApi,
  departmentApi,
  type Position,
  type PaginatedResult,
  type ListParams,
} from "@/api/hrm";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { ModeToggle } from "@/components/ModeToggle";

interface PositionManagementPageProps {
  onNavigate?: (page: string) => void;
}

const PositionManagementPage: React.FC<PositionManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Position>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );

  const [formData, setFormData] = useState<Partial<Position>>({});

  const fetchPositions = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await positionApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        setData({
          items: data.items || [],
          total: data.total || 0,
          page: data.page || 1,
          page_size: data.page_size || 10,
        });
      } else {
        setData({ items: [], total: 0, page: 1, page_size: 10 });
      }
    } catch (error: any) {
      addNotification({
        title: "加载失败",
        message: error.message || "获取岗位列表失败",
        type: "error",
      });
      setData({ items: [], total: 0, page: 1, page_size: 10 });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.list();
      if (response.code === 200 && response.data) {
        const items = (response.data as any).items || [];
        setDepartments(items.map((d: any) => ({ id: d.id, name: d.name })));
      } else {
        setDepartments([]);
      }
    } catch (error: any) {
      addNotification({
        title: "加载失败",
        message: error.message || "获取部门列表失败",
        type: "error",
      });
      setDepartments([]);
    }
  };

  useEffect(() => {
    fetchPositions();
    fetchDepartments();
  }, []);

  const handleSearch = () => {
    fetchPositions({
      page: 1,
      search: searchText || undefined,
      status: statusFilter || undefined,
      department_id: departmentFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("");
    setDepartmentFilter("");
    fetchPositions({ page: 1 });
  };

  const handleAdd = () => {
    setSelectedPosition(null);
    setFormData({});
    setShowCreateModal(true);
  };

  const handleEdit = (record: Position) => {
    setSelectedPosition(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Position) => {
    setSelectedPosition(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个岗位吗？")) return;
    try {
      const response = await positionApi.delete(id);
      if (response.code === 200) {
        addNotification({
          title: "成功",
          message: "岗位删除成功",
          type: "success",
        });
        fetchPositions();
      } else {
        addNotification({
          title: "失败",
          message: "删除岗位失败",
          type: "error",
        });
      }
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: error.message || "删除岗位失败",
        type: "error",
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await positionApi.create(formData);
      addNotification({
        title: "成功",
        message: "岗位创建成功",
        type: "success",
      });
      setShowCreateModal(false);
      setFormData({});
      fetchPositions();
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: error.message || "创建岗位失败",
        type: "error",
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;
    try {
      await positionApi.update(selectedPosition.id, formData);
      addNotification({
        title: "成功",
        message: "岗位更新成功",
        type: "success",
      });
      setShowEditModal(false);
      setSelectedPosition(null);
      fetchPositions();
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: error.message || "更新岗位失败",
        type: "error",
      });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<
      string,
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "info"
      | "success"
      | "warning"
    > = {
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
      />
    );
  };

  const columns = useMemo<ColumnDef<Position>[]>(
    () => [
      {
        accessorKey: "name",
        header: "岗位名称",
        cell: ({ row }) => {
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "indigo.100",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Briefcase
                  sx={{ width: 20, height: 20, color: "indigo.600" }}
                />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: "grey.900" }}
                >
                  {row.original.name}
                </Typography>
                {row.original.code && (
                  <Typography variant="caption" sx={{ color: "grey.500" }}>
                    {row.original.code}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        },
      },
      {
        accessorKey: "department_id",
        header: "所属部门",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ color: "grey.900" }}>
            {departments.find((d) => d.id === row.original.department_id)
              ?.name || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "level",
        header: "岗位级别",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ color: "grey.900" }}>
            {row.original.level || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "salary_range",
        header: "薪资范围",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ color: "grey.900" }}>
            {row.original.min_salary || 0} - {row.original.max_salary || 0}
          </Typography>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const position = row.original;
          return (
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Tooltip title="查看">
                <IconButton size="small" onClick={() => handleView(position)}>
                  <Eye sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="编辑">
                <IconButton size="small" onClick={() => handleEdit(position)}>
                  <Edit sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="删除">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(position.id)}
                >
                  <Trash2 sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [departments],
  );

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
              岗位管理
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
                岗位管理
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
                管理企业岗位信息、薪资范围
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <Button
                variant="contained"
                onClick={handleAdd}
                startIcon={<Plus size={18} />}
              >
                新增岗位
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* 内容区域 */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Card sx={{ mb: 0 }}>
            <CardContent sx={{ p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 200, position: "relative" }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      zIndex: 1,
                    }}
                  >
                    <Search sx={{ width: 20, height: 20, color: "grey.400" }} />
                  </Box>
                  <TextField
                    size="small"
                    type="text"
                    placeholder="搜索岗位名称或编码"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    sx={{ pl: 10, width: "100%" }}
                  />
                </Box>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>部门</InputLabel>
                  <Select
                    value={departmentFilter}
                    label="部门"
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <MenuItem value="all">全部部门</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={statusFilter}
                    label="状态"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">全部状态</MenuItem>
                    <MenuItem value="active">启用</MenuItem>
                    <MenuItem value="inactive">禁用</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" onClick={handleSearch}>
                  搜索
                </Button>
                <Button variant="outlined" onClick={handleReset}>
                  重置
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      animation: "spin 1s linear infinite",
                      border: 4,
                      borderColor: "primary.main",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                    }}
                  />
                  <Typography sx={{ mt: 2, color: "text.secondary" }}>
                    加载中...
                  </Typography>
                </Box>
              ) : data.items.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Briefcase
                    sx={{
                      width: 48,
                      height: 48,
                      color: "grey.400",
                      mx: "auto",
                      mb: 2,
                    }}
                  />
                  <Typography sx={{ color: "text.secondary" }}>
                    暂无岗位数据
                  </Typography>
                </Box>
              ) : (
                <DataTable
                  columns={columns}
                  data={data.items}
                  enablePagination={true}
                  pageCount={Math.ceil(data.total / data.page_size)}
                  onPageChange={(page) => fetchPositions({ page })}
                  currentPage={data.page}
                />
              )}
            </CardContent>
          </Card>
        </Box>

        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        >
          <DialogTitle>新增岗位</DialogTitle>
          <DialogContent sx={{ maxWidth: 500 }}>
            <form onSubmit={handleCreate}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    岗位名称 *
                  </Typography>
                  <TextField
                    id="create-name"
                    size="small"
                    type="text"
                    required
                    fullWidth
                    value={(formData as Position)?.name || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange("name", e.target.value)
                    }
                    placeholder="请输入岗位名称"
                  />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    岗位编码
                  </Typography>
                  <TextField
                    id="create-code"
                    size="small"
                    type="text"
                    fullWidth
                    value={(formData as Position)?.code || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange("code", e.target.value)
                    }
                    placeholder="请输入岗位编码"
                  />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    所属部门
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel>请选择</InputLabel>
                    <Select
                      value={(formData as Position)?.department_id || ""}
                      label="请选择"
                      onChange={(e) =>
                        handleInputChange("department_id", e.target.value)
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
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    岗位级别
                  </Typography>
                  <TextField
                    id="create-level"
                    size="small"
                    type="text"
                    fullWidth
                    value={(formData as Position)?.level || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange("level", e.target.value)
                    }
                    placeholder="请输入岗位级别"
                  />
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      最低薪资
                    </Typography>
                    <TextField
                      id="create-min-salary"
                      size="small"
                      type="number"
                      fullWidth
                      value={(formData as Position)?.min_salary || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange(
                          "min_salary",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="最低薪资"
                    />
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      最高薪资
                    </Typography>
                    <TextField
                      id="create-max-salary"
                      size="small"
                      type="number"
                      fullWidth
                      value={(formData as Position)?.max_salary || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange(
                          "max_salary",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="最高薪资"
                    />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    岗位描述
                  </Typography>
                  <TextField
                    id="create-description"
                    size="small"
                    multiline
                    rows={3}
                    fullWidth
                    value={(formData as Position)?.description || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="请输入岗位描述"
                  />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    任职要求
                  </Typography>
                  <TextField
                    id="create-requirements"
                    size="small"
                    multiline
                    rows={3}
                    fullWidth
                    value={(formData as Position)?.requirements || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange("requirements", e.target.value)
                    }
                    placeholder="请输入任职要求"
                  />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    状态
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel>请选择</InputLabel>
                    <Select
                      value={(formData as Position)?.status || "active"}
                      label="请选择"
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                    >
                      <MenuItem value="active">启用</MenuItem>
                      <MenuItem value="inactive">禁用</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              <DialogActions sx={{ mt: 3 }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </Button>
                <Button type="submit" variant="contained">
                  创建
                </Button>
              </DialogActions>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditModal} onClose={() => setShowEditModal(false)}>
          <DialogTitle>编辑岗位</DialogTitle>
          <DialogContent sx={{ maxWidth: 500 }}>
            {selectedPosition && (
              <form onSubmit={handleUpdate}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      岗位名称 *
                    </Typography>
                    <TextField
                      id="edit-name"
                      size="small"
                      type="text"
                      required
                      fullWidth
                      value={(formData as Position)?.name || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("name", e.target.value)
                      }
                    />
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      岗位编码
                    </Typography>
                    <TextField
                      id="edit-code"
                      size="small"
                      type="text"
                      fullWidth
                      value={(formData as Position)?.code || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("code", e.target.value)
                      }
                    />
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      所属部门
                    </Typography>
                    <FormControl size="small" fullWidth>
                      <InputLabel>请选择</InputLabel>
                      <Select
                        value={(formData as Position)?.department_id || ""}
                        label="请选择"
                        onChange={(e) =>
                          handleInputChange("department_id", e.target.value)
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
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      岗位级别
                    </Typography>
                    <TextField
                      id="edit-level"
                      size="small"
                      type="text"
                      fullWidth
                      value={(formData as Position)?.level || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("level", e.target.value)
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
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        最低薪资
                      </Typography>
                      <TextField
                        id="edit-min-salary"
                        size="small"
                        type="number"
                        fullWidth
                        value={(formData as Position)?.min_salary || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleInputChange(
                            "min_salary",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </Box>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        最高薪资
                      </Typography>
                      <TextField
                        id="edit-max-salary"
                        size="small"
                        type="number"
                        fullWidth
                        value={(formData as Position)?.max_salary || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleInputChange(
                            "max_salary",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </Box>
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      岗位描述
                    </Typography>
                    <TextField
                      id="edit-description"
                      size="small"
                      multiline
                      rows={3}
                      fullWidth
                      value={(formData as Position)?.description || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("description", e.target.value)
                      }
                    />
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      任职要求
                    </Typography>
                    <TextField
                      id="edit-requirements"
                      size="small"
                      multiline
                      rows={3}
                      fullWidth
                      value={(formData as Position)?.requirements || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("requirements", e.target.value)
                      }
                    />
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      状态
                    </Typography>
                    <FormControl size="small" fullWidth>
                      <InputLabel>请选择</InputLabel>
                      <Select
                        value={(formData as Position)?.status || "active"}
                        label="请选择"
                        onChange={(e) =>
                          handleInputChange("status", e.target.value)
                        }
                      >
                        <MenuItem value="active">启用</MenuItem>
                        <MenuItem value="inactive">禁用</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                <DialogActions sx={{ mt: 3 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedPosition(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button type="submit" variant="contained">
                    保存
                  </Button>
                </DialogActions>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showViewModal} onClose={() => setShowViewModal(false)}>
          <DialogTitle>岗位详情</DialogTitle>
          <DialogContent sx={{ maxWidth: 500 }}>
            {selectedPosition && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      岗位名称
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {selectedPosition.name}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      岗位编码
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {selectedPosition.code || "-"}
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
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      所属部门
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {departments.find(
                        (d) => d.id === selectedPosition.department_id,
                      )?.name || "-"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      岗位级别
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {selectedPosition.level || "-"}
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
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      薪资范围
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {selectedPosition.min_salary || 0} -{" "}
                      {selectedPosition.max_salary || 0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      状态
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {getStatusBadge(selectedPosition.status)}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    岗位描述
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {selectedPosition.description || "-"}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    任职要求
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {selectedPosition.requirements || "-"}
                  </Typography>
                </Box>
                {selectedPosition.created_at && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      创建时间
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {selectedPosition.created_at}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            <DialogActions sx={{ mt: 3 }}>
              <Button
                onClick={() => setShowViewModal(false)}
                variant="contained"
              >
                关闭
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
};

export default PositionManagementPage;
