import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Button,
  TextField,
  Avatar,
  Tooltip,
  Box,
  Stack,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Mail,
  Phone,
  Link,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { employeeApi, type Employee } from "../api/hrm";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { ModeToggle } from "@/components/ModeToggle";

// 懒加载 Dialog 相关组件
const CreateEmployeeForm = React.lazy(
  () => import("./forms/CreateEmployeeForm"),
);
const EditEmployeeForm = React.lazy(() => import("./forms/EditEmployeeForm"));

interface EmployeeManagementPageProps {
  onNavigate?: (page: string) => void;
}

const EmployeeManagementPage: React.FC<EmployeeManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeeApi.list();
      if (res.success && res.data) {
        setEmployees(res.data.items || []);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      setError(err.message || "加载员工列表失败");
      addNotification({
        title: "加载失败",
        message: "加载员工列表失败",
        type: "error",
      });
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("确定要删除这个员工吗？")) return;
    try {
      const res = await employeeApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "员工删除成功",
          type: "success",
        });
        loadEmployees();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除员工失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除员工失败",
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
      active: "在职",
      inactive: "离职",
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

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: "name",
        header: "员工信息",
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                {emp.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {emp.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {emp.employee_no}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        accessorKey: "user_id",
        header: "系统账号",
        cell: ({ row }) => {
          const emp = row.original;
          return emp.user_id ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Link className="w-3 h-3 text-blue-500 mr-1" />
              <Typography variant="body2" color="primary.main">
                已关联
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <AlertCircle className="w-3 h-3 mr-1" />
              <Typography variant="body2" color="text.disabled">
                未关联
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: "position",
        header: "职位",
        cell: ({ row }) => {
          return (
            <Typography variant="body2">
              {row.original.position || "-"}
            </Typography>
          );
        },
      },
      {
        accessorKey: "contact",
        header: "联系方式",
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <Box>
              {emp.email && (
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                  <Mail className="w-3 h-3 mr-1" />
                  <Typography variant="caption">{emp.email}</Typography>
                </Box>
              )}
              {emp.phone && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Phone className="w-3 h-3 mr-1" />
                  <Typography variant="caption">{emp.phone}</Typography>
                </Box>
              )}
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
        accessorKey: "hire_date",
        header: "入职日期",
        cell: ({ row }) => {
          return (
            <Typography variant="body2" color="text.secondary">
              {row.original.hire_date
                ? new Date(row.original.hire_date).toLocaleDateString("zh-CN")
                : "-"}
            </Typography>
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Tooltip title="编辑">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setShowEditModal(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </Tooltip>

              <Tooltip title="删除">
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => handleDeleteEmployee(emp.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Tooltip>
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
                <ChevronLeft className="w-5 h-5" />
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
                  <User className="w-7 h-7 mr-2" />
                  员工管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理员工信息、任职信息
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-5 h-5 mr-1" />
                新增员工
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: "80rem", mx: "auto", px: 3, py: 4 }}>
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
                <Button sx={{ mt: 2 }} onClick={loadEmployees}>
                  重试
                </Button>
              </Box>
            ) : (
              <DataTable
                columns={columns}
                data={employees}
                searchPlaceholder="搜索员工姓名、工号、邮箱、电话、职位..."
                searchKey="name"
              />
            )}
          </CardContent>
        </Card>
      </Box>

      {showCreateModal && (
        <React.Suspense
          fallback={
            <Box
              sx={{
                position: "fixed",
                inset: 0,
                bgcolor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1300,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 4,
                  borderColor: "white",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            </Box>
          }
        >
          <CreateEmployeeForm
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
            onSuccess={() => {
              loadEmployees();
            }}
          />
        </React.Suspense>
      )}

      {showEditModal && selectedEmployee && (
        <React.Suspense
          fallback={
            <Box
              sx={{
                position: "fixed",
                inset: 0,
                bgcolor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1300,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 4,
                  borderColor: "white",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            </Box>
          }
        >
          <EditEmployeeForm
            open={showEditModal}
            employee={selectedEmployee}
            onOpenChange={setShowEditModal}
            onSuccess={() => {
              loadEmployees();
              setSelectedEmployee(null);
            }}
          />
        </React.Suspense>
      )}
    </Box>
  );
};

export default EmployeeManagementPage;
