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
} from "../api/hrm";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../components/DataTable";
import { HrmLayout } from "../components/HrmLayout";

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
      "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
    > = {
      active: "success",
      inactive: "default",
    };
    const labels: Record<string, string> = {
      active: "启用",
      inactive: "禁用",
    };
    return (
      <Chip size="small" color={colors[status] || "default"} label={labels[status] || status} />
    );
  };

  const columns = useMemo<ColumnDef<Position>[]>(
    () => [
      {
        accessorKey: "name",
        header: "岗位名称",
        cell: ({ row }) => {
          return (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {row.original.name}
                </div>
                {row.original.code && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {row.original.code}
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
        cell: ({ row }) => (
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {departments.find((d) => d.id === row.original.department_id)
              ?.name || "-"}
          </span>
        ),
      },
      {
        accessorKey: "level",
        header: "岗位级别",
        cell: ({ row }) => (
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {row.original.level || "-"}
          </span>
        ),
      },
      {
        accessorKey: "salary_range",
        header: "薪资范围",
        cell: ({ row }) => (
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {row.original.min_salary || 0} - {row.original.max_salary || 0}
          </span>
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
                <IconButton
                  size="small"
                  onClick={() => handleView(position)}
                >
                  <Eye className="w-4 h-4" />
                </IconButton>
              </Tooltip>

              <Tooltip title="编辑">
                <IconButton
                  size="small"
                  onClick={() => handleEdit(position)}
                >
                  <Edit className="w-4 h-4" />
                </IconButton>
              </Tooltip>

              <Tooltip title="删除">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(position.id)}
                >
                  <Trash2 className="w-4 h-4" />
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
    <HrmLayout title="岗位管理" subtitle="管理企业岗位信息、薪资范围">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div></div>
          <div className="flex items-center space-x-2">
            <ModeToggle />
            <Button onClick={handleAdd}>
              <Plus className="w-5 h-5 mr-2" />
              新增岗位
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <TextField
                    size="small"
                    type="text"
                    placeholder="搜索岗位名称或编码"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    sx={{ pl: 10, width: "100%" }}
                  />
                </div>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    加载中...
                  </p>
                </div>
              ) : data.items.length === 0 ? (
                <div className="p-8 text-center">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    暂无岗位数据
                  </p>
                </div>
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
        </div>

        <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <DialogTitle>新增岗位</DialogTitle>
          <DialogContent sx={{ maxWidth: 500 }}>
            <form onSubmit={handleCreate}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>岗位名称 *</Typography>
                  <TextField
                    id="create-name"
                    size="small"
                    type="text"
                    required
                    fullWidth
                    value={(formData as Position)?.name || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("name", e.target.value)}
                    placeholder="请输入岗位名称"
                  />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>岗位编码</Typography>
                  <TextField
                    id="create-code"
                    size="small"
                    type="text"
                    fullWidth
                    value={(formData as Position)?.code || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("code", e.target.value)}
                    placeholder="请输入岗位编码"
                  />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>所属部门</Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel>请选择</InputLabel>
                    <Select
                      value={(formData as Position)?.department_id || ""}
                      label="请选择"
                      onChange={(e) => handleInputChange("department_id", e.target.value)}
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
                  <Typography variant="body2" sx={{ mb: 0.5 }}>岗位级别</Typography>
                  <TextField
                    id="create-level"
                    size="small"
                    type="text"
                    fullWidth
                    value={(formData as Position)?.level || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("level", e.target.value)}
                    placeholder="请输入岗位级别"
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>最低薪资</Typography>
                    <TextField
                      id="create-min-salary"
                      size="small"
                      type="number"
                      fullWidth
                      value={(formData as Position)?.min_salary || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("min_salary", parseFloat(e.target.value) || 0)
                      }
                      placeholder="最低薪资"
                    />
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>最高薪资</Typography>
                    <TextField
                      id="create-max-salary"
                      size="small"
                      type="number"
                      fullWidth
                      value={(formData as Position)?.max_salary || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("max_salary", parseFloat(e.target.value) || 0)
                      }
                      placeholder="最高薪资"
                    />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>岗位描述</Typography>
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
                  <Typography variant="body2" sx={{ mb: 0.5 }}>任职要求</Typography>
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
                  <Typography variant="body2" sx={{ mb: 0.5 }}>状态</Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel>请选择</InputLabel>
                    <Select
                      value={(formData as Position)?.status || "active"}
                      label="请选择"
                      onChange={(e) => handleInputChange("status", e.target.value)}
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
                <Button type="submit" variant="contained">创建</Button>
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>岗位名称 *</Typography>
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>岗位编码</Typography>
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>所属部门</Typography>
                    <FormControl size="small" fullWidth>
                      <InputLabel>请选择</InputLabel>
                      <Select
                        value={(formData as Position)?.department_id || ""}
                        label="请选择"
                        onChange={(e) => handleInputChange("department_id", e.target.value)}
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
                    <Typography variant="body2" sx={{ mb: 0.5 }}>岗位级别</Typography>
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
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>最低薪资</Typography>
                      <TextField
                        id="edit-min-salary"
                        size="small"
                        type="number"
                        fullWidth
                        value={(formData as Position)?.min_salary || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleInputChange("min_salary", parseFloat(e.target.value) || 0)
                        }
                      />
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>最高薪资</Typography>
                      <TextField
                        id="edit-max-salary"
                        size="small"
                        type="number"
                        fullWidth
                        value={(formData as Position)?.max_salary || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleInputChange("max_salary", parseFloat(e.target.value) || 0)
                        }
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>岗位描述</Typography>
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>任职要求</Typography>
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>状态</Typography>
                    <FormControl size="small" fullWidth>
                      <InputLabel>请选择</InputLabel>
                      <Select
                        value={(formData as Position)?.status || "active"}
                        label="请选择"
                        onChange={(e) => handleInputChange("status", e.target.value)}
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
                  <Button type="submit" variant="contained">保存</Button>
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
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>岗位名称</Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>{selectedPosition.name}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>岗位编码</Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {selectedPosition.code || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>所属部门</Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {departments.find(
                        (d) => d.id === selectedPosition.department_id,
                      )?.name || "-"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>岗位级别</Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {selectedPosition.level || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>薪资范围</Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {selectedPosition.min_salary || 0} -{" "}
                      {selectedPosition.max_salary || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>状态</Typography>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {getStatusBadge(selectedPosition.status)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>岗位描述</Typography>
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {selectedPosition.description || "-"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>任职要求</Typography>
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {selectedPosition.requirements || "-"}
                  </Typography>
                </Box>
                {selectedPosition.created_at && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>创建时间</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {selectedPosition.created_at}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            <DialogActions sx={{ mt: 3 }}>
              <Button onClick={() => setShowViewModal(false)} variant="contained">关闭</Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      </div>
    </HrmLayout>
  );
};

export default PositionManagementPage;
