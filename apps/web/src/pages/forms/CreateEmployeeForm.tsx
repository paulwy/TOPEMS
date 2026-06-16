import React, { useState } from "react";
import { Key } from "lucide-react";
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
  Typography,
} from "@mui/material";

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
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>新增员工</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={handleCreateEmployee}
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              id="employee_no"
              label="工号 *"
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
              size="small"
              fullWidth
            />
            <TextField
              id="name"
              label="姓名 *"
              type="text"
              required
              value={newEmployee.name || ""}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, name: e.target.value })
              }
              placeholder="请输入姓名"
              size="small"
              fullWidth
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="gender-label">性别</InputLabel>
              <Select
                labelId="gender-label"
                id="gender"
                value={newEmployee.gender || ""}
                label="性别"
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, gender: e.target.value })
                }
              >
                <MenuItem value="none">请选择</MenuItem>
                <MenuItem value="male">男</MenuItem>
                <MenuItem value="female">女</MenuItem>
              </Select>
            </FormControl>
            <TextField
              id="position"
              label="职位"
              type="text"
              value={newEmployee.position || ""}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  position: e.target.value,
                })
              }
              placeholder="请输入职位"
              size="small"
              fullWidth
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              id="birth_date"
              label="出生日期"
              type="date"
              value={newEmployee.birth_date || ""}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  birth_date: e.target.value,
                })
              }
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              id="hire_date"
              label="入职日期"
              type="date"
              value={newEmployee.hire_date || ""}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  hire_date: e.target.value,
                })
              }
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              id="email"
              label="邮箱"
              type="email"
              value={newEmployee.email || ""}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, email: e.target.value })
              }
              placeholder="请输入邮箱"
              size="small"
              fullWidth
            />
            <TextField
              id="phone"
              label="电话"
              type="text"
              value={newEmployee.phone || ""}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, phone: e.target.value })
              }
              placeholder="请输入电话"
              size="small"
              fullWidth
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              id="password"
              label="登录密码 *"
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
              size="small"
              fullWidth
              slotProps={{ input: { inputProps: { minLength: 6 } } }}
            />
          </Box>
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <Key style={{ width: 14, height: 14 }} />
            至少6个字符，员工将用此密码登录系统
          </Typography>

          <DialogActions sx={{ px: 0, mt: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => onOpenChange(false)}
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
  );
};

export default CreateEmployeeForm;
