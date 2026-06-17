import React, { useState, useEffect, useMemo } from "react";
import { Box, Chip, Typography, Avatar } from "@mui/material";
import { Plus, Edit, Trash2, Mail, Phone, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { employeeApi, type Employee } from "@/api/hrm";
import { useAppStore } from "../../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "@/components/templates";

const CreateEmployeeForm = React.lazy(
  () => import("../forms/CreateEmployeeForm"),
);
const EditEmployeeForm = React.lazy(() => import("../forms/EditEmployeeForm"));

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

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm("确定要删除这个员工吗？")) return;
    try {
      const res = await employeeApi.delete(employee.id);
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

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, "success" | "default" | "primary"> = {
      active: "success",
      inactive: "default",
      archived: "primary",
    };
    const labels: Record<string, string> = {
      active: "在职",
      inactive: "离职",
      archived: "归档",
    };
    return (
      <Chip
        size="small"
        color={colors[status] || "primary"}
        label={labels[status] || status}
      />
    );
  };

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: "name",
        label: "员工信息",
        render: (emp) => (
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
        ),
      },
      {
        id: "user_id",
        label: "系统账号",
        render: (emp) =>
          emp.user_id ? (
            <Typography variant="body2" color="primary.main">
              已关联
            </Typography>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <AlertCircle sx={{ width: 12, height: 12, mr: 0.25 }} />
              <Typography variant="body2" color="text.disabled">
                未关联
              </Typography>
            </Box>
          ),
      },
      {
        id: "position",
        label: "职位",
        render: (emp) => (
          <Typography variant="body2">{emp.position || "-"}</Typography>
        ),
      },
      {
        id: "contact",
        label: "联系方式",
        render: (emp) => (
          <Box>
            {emp.email && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Mail sx={{ width: 12, height: 12, mr: 0.25 }} />
                <Typography variant="caption">{emp.email}</Typography>
              </Box>
            )}
            {emp.phone && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Phone sx={{ width: 12, height: 12, mr: 0.25 }} />
                <Typography variant="caption">{emp.phone}</Typography>
              </Box>
            )}
          </Box>
        ),
      },
      {
        id: "status",
        label: "状态",
        render: (emp) => getStatusBadge(emp.status),
      },
      {
        id: "hire_date",
        label: "入职日期",
        render: (emp) => (
          <Typography variant="body2" color="text.secondary">
            {emp.hire_date
              ? new Date(emp.hire_date).toLocaleDateString("zh-CN")
              : "-"}
          </Typography>
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<Employee>[]>(
    () => [
      {
        label: "编辑",
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: handleEditEmployee,
      },
      {
        label: "删除",
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        onClick: handleDeleteEmployee,
        color: "error",
      },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <ListPageTemplate<Employee>
        title="员工管理"
        subtitle="管理员工信息、任职信息"
        breadcrumbs={[
          { label: "首页", href: "/dashboard" },
          { label: "人力资源", href: "/hrm" },
          { label: "员工管理" },
        ]}
        backButton={{ href: "/hrm", onClick: () => navigate("/hrm") }}
        columns={columns}
        data={employees}
        loading={loading}
        error={error || undefined}
        searchable
        searchPlaceholder="搜索员工姓名、工号、邮箱、电话、职位..."
        actions={[
          {
            label: "新增员工",
            icon: <Plus sx={{ width: 18, height: 18 }} />,
            onClick: () => setShowCreateModal(true),
            variant: "contained",
          },
        ]}
        rowActions={rowActions}
        emptyMessage="暂无员工数据"
        onRefresh={loadEmployees}
      />

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
