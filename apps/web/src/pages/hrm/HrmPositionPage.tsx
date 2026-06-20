import {
  Button,
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
  Box,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  positionApi,
  departmentApi,
  type Position,
  type PaginatedResult,
  type ListParams,
} from "@/api/hrm";
import { useAppStore } from "../../store";
import {
  ListPageTemplate,
  StatCardGroup,
  type ColumnDef,
  type RowAction,
} from "@/components/mui";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { DataExport } from "@/components/common";

interface PositionManagementPageProps {}

const PositionManagementPage: React.FC<PositionManagementPageProps> = () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 计算统计数据
  const stats = useMemo(() => {
    const totalPositions = data.total;
    const activePositions = data.items.filter(
      (item) => item.status === "active",
    ).length;
    const inactivePositions = data.items.filter(
      (item) => item.status === "inactive",
    ).length;
    const totalEmployees = data.items.reduce(
      (sum, item) => sum + (item.employee_count || 0),
      0,
    );

    return [
      {
        title: "总岗位数",
        value: totalPositions,
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        title: "启用岗位",
        value: activePositions,
        icon: <CheckCircle style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        title: "禁用岗位",
        value: inactivePositions,
        icon: <XCircle style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        title: "总人数",
        value: totalEmployees,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
    ];
  }, [data]);

  const columns = useMemo<ColumnDef<Position>[]>(
    () => [
      {
        id: "name",
        label: "岗位名称",
        render: (row: Position) => {
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
                  style={{ width: 20, height: 20, color: "#4f46e5" }}
                />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: "grey.900" }}
                >
                  {row.name}
                </Typography>
                {row.code && (
                  <Typography variant="caption" sx={{ color: "grey.500" }}>
                    {row.code}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        },
      },
      {
        id: "department_id",
        label: "所属部门",
        render: (row: Position) => (
          <Typography variant="body2" sx={{ color: "grey.900" }}>
            {departments.find((d) => d.id === row.department_id)?.name || "-"}
          </Typography>
        ),
      },
      {
        id: "level",
        label: "岗位级别",
        render: (row: Position) => (
          <Typography variant="body2" sx={{ color: "grey.900" }}>
            {row.level || "-"}
          </Typography>
        ),
      },
      {
        id: "salary_range",
        label: "薪资范围",
        render: (row: Position) => (
          <Typography variant="body2" sx={{ color: "grey.900" }}>
            {row.min_salary || 0} - {row.max_salary || 0}
          </Typography>
        ),
      },
      {
        id: "status",
        label: "状态",
        render: (row: Position) => getStatusBadge(row.status),
      },
    ],
    [departments],
  );

  const rowActions: RowAction<Position>[] = [
    {
      label: "查看",
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: handleView,
    },
    {
      label: "编辑",
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: handleEdit,
    },
    {
      label: "删除",
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: "error",
      onClick: (row: Position) => handleDelete(row.id),
      confirm: true,
      confirmMessage: "确定要删除这个岗位吗？",
    },
  ];

  // 导出字段配置
  const exportFields = useMemo(
    () => [
      { key: "name", title: "岗位名称" },
      { key: "code", title: "岗位编码" },
      { key: "level", title: "岗位级别" },
      { key: "min_salary", title: "最低薪资" },
      { key: "max_salary", title: "最高薪资" },
      { key: "status", title: "状态" },
      { key: "employee_count", title: "员工数量" },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      {/* 统计卡片 */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, pt: 3, pb: 2 }}>
        <StatCardGroup stats={stats} loading={loading} columns={4} />
      </Box>

      {/* 列表页模板 */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, pb: 3 }}>
        <ListPageTemplate
          title="岗位管理"
          subtitle="管理企业岗位信息、薪资范围"
          breadcrumbs={[
            { label: "人力资源", href: "/hrm" },
            { label: "岗位管理" },
          ]}
          columns={columns}
          data={data.items}
          loading={loading}
          rowActions={rowActions}
          pagination={{
            page: data.page - 1,
            pageSize: data.page_size,
            total: data.total,
            onPageChange: (page: number) => fetchPositions({ page: page + 1 }),
          }}
          searchable
          searchPlaceholder="搜索岗位名称或编码"
          searchValue={searchText}
          onSearch={(value: string) => setSearchText(value)}
          filters={[
            {
              id: "department",
              label: "部门",
              type: "select",
              options: [
                { label: "全部部门", value: "all" },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ],
              value: departmentFilter,
              onChange: (value: string) => setDepartmentFilter(value),
            },
            {
              id: "status",
              label: "状态",
              type: "select",
              options: [
                { label: "全部状态", value: "all" },
                { label: "启用", value: "active" },
                { label: "禁用", value: "inactive" },
              ],
              value: statusFilter,
              onChange: (value: string) => setStatusFilter(value),
            },
          ]}
          actions={[
            {
              label: "导出",
              icon: <Briefcase style={{ width: 18, height: 18 }} />,
              onClick: () => {
                // 导出功能通过 DataExport 组件实现
              },
              variant: "outlined",
            },
            {
              label: "新增岗位",
              icon: <Plus style={{ width: 18, height: 18 }} />,
              onClick: handleAdd,
              variant: "contained",
            },
          ]}
          onRefresh={() => fetchPositions()}
          emptyMessage="暂无岗位数据"
          emptyIcon={
            <Briefcase style={{ width: 48, height: 48, color: "#9ca3af" }} />
          }
          headerContent={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <ModeToggle />
              <DataExport
                data={data.items as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName="岗位数据"
                buttonText="导出"
              />
            </Box>
          }
        />
      </Box>

      {/* 创建对话框 */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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

      {/* 编辑对话框 */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)}>
        <DialogTitle>编辑岗位</DialogTitle>
        <DialogContent sx={{ maxWidth: 500 }}>
          {selectedPosition && (
            <form onSubmit={handleUpdate}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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

      {/* 查看对话框 */}
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
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    岗位名称
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                    {selectedPosition.name}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    状态
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                    {getStatusBadge(selectedPosition.status)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  岗位描述
                </Typography>
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  {selectedPosition.description || "-"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
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
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    创建时间
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {selectedPosition.created_at}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          <DialogActions sx={{ mt: 3 }}>
            <Button onClick={() => setShowViewModal(false)} variant="contained">
              关闭
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PositionManagementPage;
