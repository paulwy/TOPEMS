import React, { useState, useEffect } from "react";
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

interface EditEmployeeFormProps {
  open: boolean;
  employee: Employee;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditEmployeeForm: React.FC<EditEmployeeFormProps> = ({
  open,
  employee,
  onOpenChange,
  onSuccess,
}) => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee>(employee);

  useEffect(() => {
    setSelectedEmployee(employee);
  }, [employee]);

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await employeeApi.update(
        selectedEmployee.id,
        selectedEmployee,
      );
      if (res.success) {
        addNotification({
          title: "成功",
          message: "员工信息更新成功",
          type: "success",
        });
        onOpenChange(false);
        onSuccess();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新员工失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新员工失败",
        type: "error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑员工</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEditEmployee}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_employee_no">工号 *</Label>
                <Input
                  id="edit_employee_no"
                  type="text"
                  required
                  value={selectedEmployee.employee_no}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      employee_no: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_name">姓名 *</Label>
                <Input
                  id="edit_name"
                  type="text"
                  required
                  value={selectedEmployee.name}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      name: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_gender">性别</Label>
                <Select
                  value={selectedEmployee.gender || ""}
                  onValueChange={(value) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      gender: value,
                    })
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
                <Label htmlFor="edit_position">职位</Label>
                <Input
                  id="edit_position"
                  type="text"
                  value={selectedEmployee.position || ""}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      position: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_birth_date">出生日期</Label>
                <Input
                  id="edit_birth_date"
                  type="date"
                  value={selectedEmployee.birth_date || ""}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      birth_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_hire_date">入职日期</Label>
                <Input
                  id="edit_hire_date"
                  type="date"
                  value={selectedEmployee.hire_date || ""}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      hire_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_email">邮箱</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={selectedEmployee.email || ""}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">电话</Label>
                <Input
                  id="edit_phone"
                  type="text"
                  value={selectedEmployee.phone || ""}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      phone: e.target.value,
                    })
                  }
                />
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
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeForm;
