import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stack,
  Tooltip,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Folder,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { departmentApi, type Department } from "@/api/hrm";
import { useAppStore } from "../../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { ModeToggle } from "@/components/ModeToggle";

interface DepartmentManagementPageProps {
  onNavigate?: (page: string) => void;
}

const DepartmentManagementPage: React.FC<DepartmentManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);

  const [newDepartment, setNewDepartment] = useState<Partial<Department>>({
    name: "",
    code: "",
    parent_id: "",
    company_id: "",
    description: "",
    status: "active",
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentApi.list();
      if (res.success && res.data) {
        setDepartments(res.data.items || []);
      } else {
        setDepartments([]);
      }
    } catch (err: any) {
      setError(err.message || "加载部门列表失败");
      addNotification({
        title: "加载失败",
        message: "加载部门列表失败",
        type: "error",
      });
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await departmentApi.create(newDepartment);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "部门创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewDepartment({
          name: "",
          code: "",
          parent_id: "",
          company_id: "",
          description: "",
          status: "active",
        });
        loadDepartments();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建部门失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建部门失败",
        type: "error",
      });
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("确定要删除这个部门吗？")) return;
    try {
      const res = await departmentApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "部门删除成功",
          type: "success",
        });
        loadDepartments();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除部门失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除部门失败",
        type: "error",
      });
    }
  };

  const handleEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    try {
      const res = await departmentApi.update(
        selectedDepartment.id,
        selectedDepartment,
      );
      if (res.success) {
        addNotification({
          title: "成功",
          message: "部门信息更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedDepartment(null);
        loadDepartments();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新部门失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新部门失败",
        type: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      inactive: "secondary",
      archived: "outline",
    };
    const labels: Record<string, string> = {
      active: "活跃",
      inactive: "停用",
      archived: "归档",
    };
    return (
      <Chip
        size="small"
        variant={(colors[status] || "outlined") as "filled" | "outlined"}
        label={labels[status] || status}
      />
    );
  };

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const buildDepartmentTree = (depts: Department[]): Department[] => {
    const deptMap = new Map<string, Department & { children?: Department[] }>();

    depts.forEach((dept) => {
      deptMap.set(dept.id, { ...dept, children: [] });
    });

    const rootDepts: (Department & { children?: Department[] })[] = [];

    depts.forEach((dept) => {
      const deptWithChildren = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(deptWithChildren);
      } else {
        rootDepts.push(deptWithChildren);
      }
    });

    return rootDepts;
  };

  const renderDepartmentTree = (depts: Department[], level: number = 0) => {
    return depts.map((dept) => (
      <Box key={dept.id} sx={{ "&:hover .action-buttons": { opacity: 1 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderRadius: 1,
            ...(level > 0 && { ml: 4, borderLeft: 2, borderColor: "divider" }),
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.light",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Folder
                style={{
                  color: "var(--mui-palette-primary-main)",
                  fontSize: 20,
                }}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {dept.name}
                </Typography>
                {dept.code && (
                  <Typography variant="body2" color="text.secondary">
                    ({dept.code})
                  </Typography>
                )}
                {getStatusBadge(dept.status)}
              </Box>
              {dept.description && (
                <Typography variant="body2" color="text.secondary">
                  {dept.description}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ opacity: 0, transition: "opacity 0.2s" }}>
            <Tooltip title="编辑">
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSelectedDepartment(dept);
                  setShowEditModal(true);
                }}
              >
                <Edit sx={{ width: 16, height: 16 }} />
              </Button>
            </Tooltip>

            <Tooltip title="删除">
              <Button
                variant="text"
                size="small"
                color="error"
                onClick={() => handleDeleteDepartment(dept.id)}
              >
                <Trash2 sx={{ width: 16, height: 16 }} />
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {(dept as any).children?.length > 0 &&
          renderDepartmentTree((dept as any).children, level + 1)}
      </Box>
    ));
  };

  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      {
        accessorKey: "name",
        header: "部门名称",
        cell: ({ row }) => {
          const dept = row.original;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "primary.light",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box sx={{ color: "primary.main" }}>
                  <Folder size={20} />
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {dept.name}
                </Typography>
                {dept.code && (
                  <Typography variant="caption" color="text.secondary">
                    {dept.code}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        },
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: "description",
        header: "描述",
        cell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {row.original.description || "-"}
          </Typography>
        ),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const dept = row.original;
          return (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSelectedDepartment(dept);
                  setShowEditModal(true);
                }}
              >
                <Edit sx={{ width: 16, height: 16 }} />
              </Button>
              <Button
                variant="text"
                size="small"
                color="error"
                onClick={() => handleDeleteDepartment(dept.id)}
              >
                <Trash2 sx={{ width: 16, height: 16 }} />
              </Button>
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: "80rem", mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </Button>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Building2 sx={{ width: 28, height: 28, mr: 1 }} />
                  部门管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理组织架构、层级关系
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus sx={{ width: 20, height: 20, mr: 0.5 }} />
                新增部门
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: "80rem", mx: "auto", px: 3, py: 4 }}>
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
            placeholder="搜索部门名称、编码、描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <Search sx={{ width: 20, height: 20, mr: 0.5 }} />
                ),
              },
            }}
          />
          <Button variant="outlined" onClick={loadDepartments}>
            刷新
          </Button>
        </Box>

        <Card>
          <CardContent sx={{ p: 0 }}>
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
                <Typography sx={{ mt: 2 }} color="text.secondary">
                  加载中...
                </Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AlertCircle
                  style={{
                    fontSize: 48,
                    color: "var(--mui-palette-error-main)",
                    marginBottom: 8,
                  }}
                />
                <Typography color="error.main">{error}</Typography>
                <Button sx={{ mt: 2 }} onClick={loadDepartments}>
                  重试
                </Button>
              </Box>
            ) : filteredDepartments.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Building2
                  style={{
                    fontSize: 48,
                    color: "var(--mui-palette-text-disabled)",
                    marginBottom: 8,
                  }}
                />
                <Typography color="text.secondary">暂无部门数据</Typography>
              </Box>
            ) : (
              <Box sx={{ p: 3 }}>
                {renderDepartmentTree(buildDepartmentTree(filteredDepartments))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新增部门</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleCreateDepartment}
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
          >
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <TextField
                id="name"
                label="部门名称 *"
                type="text"
                required
                value={newDepartment.name || ""}
                onChange={(e) =>
                  setNewDepartment({
                    ...newDepartment,
                    name: e.target.value,
                  })
                }
                placeholder="请输入部门名称"
                size="small"
                fullWidth
              />
              <TextField
                id="code"
                label="部门编码"
                type="text"
                value={newDepartment.code || ""}
                onChange={(e) =>
                  setNewDepartment({
                    ...newDepartment,
                    code: e.target.value,
                  })
                }
                placeholder="请输入部门编码"
                size="small"
                fullWidth
              />
            </Box>

            <FormControl size="small" fullWidth>
              <InputLabel id="parent-label">上级部门</InputLabel>
              <Select
                labelId="parent-label"
                id="parent"
                value={newDepartment.parent_id || ""}
                label="上级部门"
                onChange={(e) =>
                  setNewDepartment({
                    ...newDepartment,
                    parent_id: e.target.value || undefined,
                  })
                }
              >
                <MenuItem value="none">无（顶级部门）</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              id="description"
              label="描述"
              value={newDepartment.description || ""}
              onChange={(e) =>
                setNewDepartment({
                  ...newDepartment,
                  description: e.target.value,
                })
              }
              rows={3}
              placeholder="请输入部门描述"
              size="small"
              multiline
              fullWidth
            />

            <DialogActions sx={{ px: 0, mt: 2 }}>
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
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑部门</DialogTitle>
        <DialogContent>
          {selectedDepartment && (
            <Box
              component="form"
              onSubmit={handleEditDepartment}
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <TextField
                  id="edit-name"
                  label="部门名称 *"
                  type="text"
                  required
                  value={selectedDepartment.name}
                  onChange={(e) =>
                    setSelectedDepartment({
                      ...selectedDepartment,
                      name: e.target.value,
                    })
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  id="edit-code"
                  label="部门编码"
                  type="text"
                  value={selectedDepartment.code || ""}
                  onChange={(e) =>
                    setSelectedDepartment({
                      ...selectedDepartment,
                      code: e.target.value,
                    })
                  }
                  size="small"
                  fullWidth
                />
              </Box>

              <FormControl size="small" fullWidth>
                <InputLabel id="edit-parent-label">上级部门</InputLabel>
                <Select
                  labelId="edit-parent-label"
                  id="edit-parent"
                  value={selectedDepartment.parent_id || ""}
                  label="上级部门"
                  onChange={(e) =>
                    setSelectedDepartment({
                      ...selectedDepartment,
                      parent_id: e.target.value || undefined,
                    })
                  }
                >
                  <MenuItem value="none">无（顶级部门）</MenuItem>
                  {departments
                    .filter((d) => d.id !== selectedDepartment.id)
                    .map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <TextField
                id="edit-description"
                label="描述"
                value={selectedDepartment.description || ""}
                onChange={(e) =>
                  setSelectedDepartment({
                    ...selectedDepartment,
                    description: e.target.value,
                  })
                }
                rows={3}
                size="small"
                multiline
                fullWidth
              />

              <DialogActions sx={{ px: 0, mt: 2 }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDepartment(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" variant="contained">
                  保存
                </Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DepartmentManagementPage;
