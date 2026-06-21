import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Avatar,
  Container,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Save, X } from "lucide-react";
import {
  employeeApi,
  departmentApi,
  positionApi,
  type Employee,
  type Department,
  type Position,
} from "@/api/hrm";
import { useNotification } from "@/hooks/useNotification";
import { logger } from "@/utils/logger";

const HrmEmployeeEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    employee_no: "",
    email: "",
    phone: "",
    gender: "male",
    birth_date: "",
    department_id: "",
    position_id: "",
    hire_date: "",
    status: "active",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  useEffect(() => {
    if (id) {
      loadEmployee(id);
    }
    loadDepartments();
    loadPositions();
  }, [id]);

  const loadEmployee = async (employeeId: string) => {
    setLoading(true);
    try {
      const res = await employeeApi.get(employeeId);
      if (res.code === 200 && res.data) {
        setEmployee(res.data);
        setFormData({
          name: res.data.name || "",
          employee_no: res.data.employee_no || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          gender: res.data.gender || "male",
          birth_date: res.data.birth_date || "",
          department_id: res.data.department_id || "",
          position_id: res.data.position_id || "",
          hire_date: res.data.hire_date || "",
          status: res.data.status || "active",
          address: res.data.address || "",
          emergency_contact_name: res.data.emergency_contact_name || "",
          emergency_contact_phone: res.data.emergency_contact_phone || "",
        });
      }
    } catch (err) {
      logger.error("Failed to load employee:", err);
      error("加载员工信息失败");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentApi.list({ page_size: 100 });
      if (res.code === 200 && res.data) {
        setDepartments(res.data.items || []);
      }
    } catch (err) {
      logger.error("Failed to load departments:", err);
    }
  };

  const loadPositions = async () => {
    try {
      const res = await positionApi.list({ page_size: 100 });
      if (res.code === 200 && res.data) {
        setPositions(res.data.items || []);
      }
    } catch (err) {
      logger.error("Failed to load positions:", err);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!id || !formData.name || !formData.employee_no) {
      error("请填写必填字段");
      return;
    }

    setSubmitting(true);
    try {
      const res = await employeeApi.update(id, formData);
      if (res.code === 200) {
        success("员工信息更新成功");
        navigate(`/hrm/employee/${id}`);
      } else {
        error(res.message || "更新失败");
      }
    } catch (err) {
      logger.error("Failed to update employee:", err);
      error("更新员工信息失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* 页面头部 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Button
            variant="text"
            onClick={() => navigate(`/hrm/employee/${id}`)}
            startIcon={<ArrowLeft style={{ width: 20, height: 20 }} />}
          >
            返回
          </Button>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              编辑员工
            </Typography>
            <Typography variant="body2" color="text.secondary">
              修改员工档案信息
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 表单内容 */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* 基本信息 */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            基本信息
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="姓名"
                required
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="工号"
                required
                value={formData.employee_no}
                onChange={(e) =>
                  handleInputChange("employee_no", e.target.value)
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>性别</InputLabel>
                <Select
                  value={formData.gender}
                  label="性别"
                  onChange={(e) => handleInputChange("gender", e.target.value)}
                >
                  <MenuItem value="male">男</MenuItem>
                  <MenuItem value="female">女</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="入职日期"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={formData.hire_date}
                onChange={(e) => handleInputChange("hire_date", e.target.value)}
              />
            </Grid>
          </Grid>

          {/* 联系方式 */}
          <Typography variant="h6" sx={{ mb: 2, mt: 4, fontWeight: 600 }}>
            联系方式
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="邮箱"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="手机号"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="地址"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </Grid>
          </Grid>

          {/* 工作信息 */}
          <Typography variant="h6" sx={{ mb: 2, mt: 4, fontWeight: 600 }}>
            工作信息
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>部门</InputLabel>
                <Select
                  value={formData.department_id}
                  label="部门"
                  onChange={(e) =>
                    handleInputChange("department_id", e.target.value)
                  }
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>岗位</InputLabel>
                <Select
                  value={formData.position_id}
                  label="岗位"
                  onChange={(e) =>
                    handleInputChange("position_id", e.target.value)
                  }
                >
                  {positions.map((pos) => (
                    <MenuItem key={pos.id} value={pos.id}>
                      {pos.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="入职日期"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={formData.hire_date}
                onChange={(e) => handleInputChange("hire_date", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.status}
                  label="状态"
                  onChange={(e) => handleInputChange("status", e.target.value)}
                >
                  <MenuItem value="active">在职</MenuItem>
                  <MenuItem value="probation">试用期</MenuItem>
                  <MenuItem value="resigned">离职</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* 紧急联系人 */}
          <Typography variant="h6" sx={{ mb: 2, mt: 4, fontWeight: 600 }}>
            紧急联系人
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="紧急联系人"
                value={formData.emergency_contact_name}
                onChange={(e) =>
                  handleInputChange("emergency_contact_name", e.target.value)
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="紧急联系电话"
                value={formData.emergency_contact_phone}
                onChange={(e) =>
                  handleInputChange("emergency_contact_phone", e.target.value)
                }
              />
            </Grid>
          </Grid>

          {/* 操作按钮 */}
          <Box
            sx={{ display: "flex", gap: 2, mt: 4, justifyContent: "flex-end" }}
          >
            <Button
              variant="outlined"
              onClick={() => navigate(`/hrm/employee/${id}`)}
              startIcon={<X style={{ width: 18, height: 18 }} />}
            >
              取消
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={
                submitting ? (
                  <CircularProgress size={18} />
                ) : (
                  <Save style={{ width: 18, height: 18 }} />
                )
              }
            >
              {submitting ? "保存中..." : "保存修改"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default HrmEmployeeEditPage;
