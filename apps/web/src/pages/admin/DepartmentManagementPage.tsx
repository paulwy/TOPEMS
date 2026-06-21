import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import { Building2, Plus, Edit, Trash2, Folder } from "lucide-react";
import { departmentApi, type Department } from "@/api/hrm";
import { useAppStore } from "../../store";
import { ListPageTemplate, type ColumnDef } from "@/components/templates";

interface DepartmentManagementPageProps {
  onNavigate?: (page: string) => void;
}

const DepartmentManagementPage: React.FC<DepartmentManagementPageProps> = ({
  onNavigate: _onNavigate,
}) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Build department tree and flatten for table display
  const flattenedDepartments = useMemo(() => {
    const buildTree = (
      depts: Department[],
    ): (Department & { level: number })[] => {
      const result: (Department & { level: number })[] = [];

      const deptMap = new Map<
        string,
        Department & { children?: Department[] }
      >();
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

      const flatten = (
        depts: (Department & { children?: Department[] })[],
        level: number,
      ) => {
        depts.forEach((dept) => {
          result.push({ ...dept, level });
          if (dept.children && dept.children.length > 0) {
            flatten(dept.children, level + 1);
          }
        });
      };

      flatten(rootDepts, 0);
      return result;
    };

    return buildTree(departments);
  }, [departments]);

  // Filter based on search
  const filteredDepartments = useMemo(() => {
    if (!searchQuery) return flattenedDepartments;
    const query = searchQuery.toLowerCase();
    return flattenedDepartments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(query) ||
        dept.code?.toLowerCase().includes(query) ||
        dept.description?.toLowerCase().includes(query),
    );
  }, [flattenedDepartments, searchQuery]);

  const columns: ColumnDef<Department & { level: number }>[] = useMemo(
    () => [
      {
        id: "name",
        label: "部门名称",
        render: (row) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              pl: row.level * 3,
            }}
          >
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
              <Folder size={20} color="#1976d2" />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {row.name}
              </Typography>
              {row.code && (
                <Typography variant="caption" color="text.secondary">
                  {row.code}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        id: "status",
        label: "状态",
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: "description",
        label: "描述",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {row.description || "-"}
          </Typography>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const rowActions = useMemo(
    () => [
      {
        label: "编辑",
        icon: <Edit size={16} />,
        onClick: (row: Department) => {
          setSelectedDepartment(row);
          setShowEditModal(true);
        },
      },
      {
        label: "删除",
        icon: <Trash2 size={16} />,
        color: "error" as const,
        onClick: (row: Department) => handleDeleteDepartment(row.id),
        confirm: true,
        confirmMessage: "确定要删除这个部门吗？",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <ListPageTemplate
        title="部门管理"
        subtitle="管理组织架构、层级关系"
        columns={columns}
        data={filteredDepartments}
        loading={loading}
        error={error}
        rowActions={rowActions}
        searchable
        searchPlaceholder="搜索部门名称、编码、描述..."
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        actions={[
          {
            label: "新增部门",
            icon: <Plus size={20} />,
            onClick: () => setShowCreateModal(true),
          },
        ]}
        onRefresh={loadDepartments}
        backButton={{
          href: "/dashboard",
        }}
      />

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
