import React, { useState } from "react";
import { Key } from "lucide-react";
import { employeeApi, type Employee } from "../../api/hrm";
import { useAppStore } from "../../store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateEmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateEmployeeForm: React.FC<CreateEmployeeFormProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [newEmployee, setNewEmployee] = useState<
    Partial<Employee> & { password: string }
  >({
    employee_no: "",
    name: "",
    gender: "",
    birth_date: "",
    hire_date: "",
    department_id: "",
    position: "",
    email: "",
    phone: "",
    status: "active",
    password: "",
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await employeeApi.create(newEmployee);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "员工创建成功",
          type: "success",
        });
        onOpenChange(false);
        setNewEmployee({
          employee_no: "",
          name: "",
          gender: "",
          birth_date: "",
          hire_date: "",
          department_id: "",
          position: "",
          email: "",
          phone: "",
          status: "active",
          password: "",
        });
        onSuccess();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建员工失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建员工失败",
        type: "error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增员工</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateEmployee}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_no">工号 *</Label>
                <Input
                  id="employee_no"
                  type="text"
                  required
                  value={newEmployee.employee_no || ""}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      employee_no: e.target.value,
                    })
                  }
                  placeholder="请输入工号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={newEmployee.name || ""}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, name: e.target.value })
                  }
                  placeholder="请输入姓名"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">性别</Label>
                <Select
                  value={newEmployee.gender || ""}
                  onValueChange={(value) =>
                    setNewEmployee({ ...newEmployee, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">请选择</SelectItem>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">职位</Label>
                <Input
                  id="position"
                  type="text"
                  value={newEmployee.position || ""}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      position: e.target.value,
                    })
                  }
                  placeholder="请输入职位"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_date">出生日期</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={newEmployee.birth_date || ""}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      birth_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">入职日期</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={newEmployee.hire_date || ""}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      hire_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email || ""}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, email: e.target.value })
                  }
                  placeholder="请输入邮箱"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">电话</Label>
                <Input
                  id="phone"
                  type="text"
                  value={newEmployee.phone || ""}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, phone: e.target.value })
                  }
                  placeholder="请输入电话"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  <Key className="w-4 h-4 inline mr-1" />
                  登录密码 *
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={newEmployee.password || ""}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      password: e.target.value,
                    })
                  }
                  placeholder="请输入登录密码"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  至少6个字符，员工将用此密码登录系统
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit">创建</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEmployeeForm;
