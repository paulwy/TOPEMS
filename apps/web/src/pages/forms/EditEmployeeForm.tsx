import React, { useState, useEffect } from "react";
import { employeeApi, type Employee } from "../../api/hrm";
import { useAppStore } from "../../store";

import {
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
} from "@mui/material";

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
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>编辑员工</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={handleEditEmployee}
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              id="edit_employee_no"
              label="工号 *"
              type="text"
              required
              value={selectedEmployee.employee_no}
              onChange={(e) =>
                setSelectedEmployee({
                  ...selectedEmployee,
                  employee_no: e.target.value,
                })
              }
              size="small"
              fullWidth
            />
            <TextField
              id="edit_name"
              label="姓名 *"
              type="text"
              required
              value={selectedEmployee.name}
              onChange={(e) =>
                setSelectedEmployee({
                  ...selectedEmployee,
                  name: e.target.value,
                })
              }
              size="small"
              fullWidth
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="edit_gender-label">性别</InputLabel>
              <Select
                labelId="edit_gender-label"
                id="edit_gender"
                value={selectedEmployee.gender || ""}
                label="性别"
                onChange={(e) =>
                  setSelectedEmployee({
                    ...selectedEmployee,
                    gender: e.target.value,
                  })
                }
              >
                <MenuItem value="none">请选择</MenuItem>
                <MenuItem value="male">男</MenuItem>
                <MenuItem value="female">女</MenuItem>
              </Select>
            </FormControl>
            <TextField
              id="edit_position"
              label="职位"
              type="text"
              value={selectedEmployee.position || ""}
              onChange={(e) =>
                setSelectedEmployee({
                  ...selectedEmployee,
                  position: e.target.value,
                })
              }
              size="small"
              fullWidth
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              id="edit_birth_date"
              label="出生日期"
              type="date"
              value={selectedEmployee.birth_date || ""}
              onChange={(e) =>
                setSelectedEmployee({
                  ...selectedEmployee,
                  birth_date: e.target.value,
                })
              }
              size="small"
              fullWidth
              LabelProps={{ shrink: true }}
            />
            <TextField
              id="edit_hire_date"
              label="入职日期"
              type="date"
              value={selectedEmployee.hire_date || ""}
              onChange={(e) =>
                setSelectedEmployee({
                  ...selectedEmployee,
                  hire_date: e.target.value,
                })
              }
              size="small"
              fullWidth
              LabelProps={{ shrink: true }}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              id="edit_email"
              label="邮箱"
              type="email"
              value={selectedEmployee.email || ""}
              onChange={(e) =>
                setSelectedEmployee({
                  ...selectedEmployee,
                  email: e.target.value,
                })
              }
              size="small"
              fullWidth
            />
            <TextField
              id="edit_phone"
              label="电话"
              type="text"
              value={selectedEmployee.phone || ""}
              onChange={(e) =>
                setSelectedEmployee({
                  ...selectedEmployee,
                  phone: e.target.value,
                })
              }
              size="small"
              fullWidth
            />
          </Box>

          <DialogActions sx={{ px: 0, mt: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" variant="contained">
              保存
            </Button>
          </DialogActions>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeForm;
