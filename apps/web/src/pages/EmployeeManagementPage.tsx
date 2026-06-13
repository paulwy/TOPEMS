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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/ModeToggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 懒加载 Dialog 相关组件
const CreateEmployeeForm = React.lazy(() => import("./forms/CreateEmployeeForm"));
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
      <Badge variant={colors[status] || "outline"}>
        {labels[status] || status}
      </Badge>
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
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {emp.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {emp.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {emp.employee_no}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "user_id",
        header: "系统账号",
        cell: ({ row }) => {
          const emp = row.original;
          return emp.user_id ? (
            <div className="flex items-center">
              <Link className="w-3 h-3 text-blue-500 mr-1" />
              <span className="text-sm text-blue-600 dark:text-blue-400">
                已关联
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              未关联
            </span>
          );
        },
      },
      {
        accessorKey: "position",
        header: "职位",
        cell: ({ row }) => {
          return (
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {row.original.position || "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "contact",
        header: "联系方式",
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {emp.email && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-3 h-3 mr-1" />
                  {emp.email}
                </div>
              )}
              {emp.phone && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <Phone className="w-3 h-3 mr-1" />
                  {emp.phone}
                </div>
              )}
            </div>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {row.original.hire_date
                ? new Date(row.original.hire_date).toLocaleDateString("zh-CN")
                : "-"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <div className="flex items-center justify-end space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>编辑</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() => handleDeleteEmployee(emp.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <User className="w-7 h-7 mr-3 text-blue-600" />
                  员工管理
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  管理员工信息、任职信息
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                新增员工
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  加载中...
                </p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button className="mt-4" onClick={loadEmployees}>
                  重试
                </Button>
              </div>
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
      </div>

      {showCreateModal && (
        <React.Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
          </div>
        }>
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
        <React.Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
          </div>
        }>
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
    </div>
  );
};

export default EmployeeManagementPage;
