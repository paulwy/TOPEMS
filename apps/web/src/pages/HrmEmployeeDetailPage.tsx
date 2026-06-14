import { Button, Card, CardContent, CardHeader, Chip, Typography, Box, Tabs, Tab, TextField, InputLabel, FormControl, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Avatar } from "@mui/material";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  AlertCircle,
  Briefcase,
  Building2,
  Edit2,
  Save,
  X,
  Heart,
  FileText,
  Plus,
} from "lucide-react";
import {
  employeeApi,
  departmentApi,
  type Employee,
  type Department,
} from "../api/hrm";
import { useNotification } from "../hooks/useNotification";

const HrmEmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Employee>>({});
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("basic");

  useEffect(() => {
    if (id) {
      loadEmployee(id);
    }
    loadDepartments();
  }, [id]);

  const loadEmployee = async (employeeId: string) => {
    setLoading(true);
    try {
      const res = await employeeApi.get(employeeId);
      if (res.code === 200 && res.data) {
        setEmployee(res.data);
        setEditData({ ...res.data });
      }
    } catch (err) {
      console.error("Failed to load employee:", err);
      error("加载员工信息失败");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentApi.list({ page_size: 100 });
      if (res.code === 200) {
        setDepartments(res.data?.items || []);
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return "-";
    return departments.find((d) => d.id === deptId)?.name || "-";
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      const res = await employeeApi.update(id, editData);
      if (res.code === 200) {
        success("保存成功");
        setIsEditing(false);
        loadEmployee(id);
      }
    } catch (err) {
      console.error("Failed to save:", err);
      error("保存失败");
    }
  };

  const handleCancelEdit = () => {
    if (employee) {
      setEditData({ ...employee });
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">员工不存在</p>
          <Button onClick={() => navigate("/hrm/employees")} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="text" onClick={() => navigate("/hrm/employees")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">员工详情</h1>
              <p className="text-sm text-gray-500">查看和编辑员工档案信息</p>
            </div>
            <div className="ml-auto">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outlined" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  编辑
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar sx={{ width: 80, height: 80, bgcolor: "blue.100", color: "blue.700", fontSize: "2rem" }}>
                  {employee.name.charAt(0).toUpperCase()}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {employee.name}
                    </h2>
                    <Chip size="small"
                      variant={employee.status === "active" ? "filled" : "outlined"}
                      label={employee.status === "active" ? "在职" : "离职"} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {employee.employee_no}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {employee.position || "-"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {getDepartmentName(employee.department_id)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v as string)}>
              <Tab value="basic" label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <User className="w-4 h-4" />
                  基本信息
                </Box>
              } />
              <Tab value="contact" label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Phone className="w-4 h-4" />
                  联系方式
                </Box>
              } />
              <Tab value="emergency" label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Heart className="w-4 h-4" />
                  紧急联系人
                </Box>
              } />
            </Tabs>
          </Box>

          {activeTab === "basic" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }} className="text-lg">基本信息</Typography>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <InputLabel className="text-sm text-gray-500">姓名</InputLabel>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          value={editData.name || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                          sx={{ mt: 1 }}
                        />
                      ) : (
                        <p className="mt-1 font-medium">{employee.name}</p>
                      )}
                    </div>
                    <div>
                      <InputLabel className="text-sm text-gray-500">性别</InputLabel>
                      {isEditing ? (
                        <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                          <Select
                            value={editData.gender || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, gender: e.target.value })
                            }
                          >
                            <MenuItem value="none">未设置</MenuItem>
                            <MenuItem value="male">男</MenuItem>
                            <MenuItem value="female">女</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <p className="mt-1 font-medium">
                          {employee.gender === "male"
                            ? "男"
                            : employee.gender === "female"
                              ? "女"
                              : "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <InputLabel className="text-sm text-gray-500">出生日期</InputLabel>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          type="date"
                          value={editData.birth_date || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({
                              ...editData,
                              birth_date: e.target.value,
                            })
                          }
                          sx={{ mt: 1 }}
                        />
                      ) : (
                        <p className="mt-1 font-medium">
                          {employee.birth_date
                            ? new Date(employee.birth_date).toLocaleDateString()
                            : "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <InputLabel className="text-sm text-gray-500">入职日期</InputLabel>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          type="date"
                          value={editData.hire_date || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({
                              ...editData,
                              hire_date: e.target.value,
                            })
                          }
                          sx={{ mt: 1 }}
                        />
                      ) : (
                        <p className="mt-1 font-medium">
                          {employee.hire_date
                            ? new Date(employee.hire_date).toLocaleDateString()
                            : "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <InputLabel className="text-sm text-gray-500">部门</InputLabel>
                      {isEditing ? (
                        <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                          <Select
                            value={editData.department_id || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                department_id: e.target.value || undefined,
                              })
                            }
                          >
                            <MenuItem value="none">未设置</MenuItem>
                            {departments.map((dept) => (
                              <MenuItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <p className="mt-1 font-medium">
                          {getDepartmentName(employee.department_id)}
                        </p>
                      )}
                    </div>
                    <div>
                      <InputLabel className="text-sm text-gray-500">职位</InputLabel>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          value={editData.position || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({
                              ...editData,
                              position: e.target.value,
                            })
                          }
                          sx={{ mt: 1 }}
                        />
                      ) : (
                        <p className="mt-1 font-medium">
                          {employee.position || "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Box>
          )}

          {activeTab === "contact" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }} className="text-lg">联系方式</Typography>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <InputLabel className="text-sm text-gray-500">工作邮箱</InputLabel>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          type="email"
                          value={editData.email || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({ ...editData, email: e.target.value })
                          }
                          placeholder="请输入邮箱"
                          sx={{ mt: 1 }}
                        />
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {employee.email || "-"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <InputLabel className="text-sm text-gray-500">联系电话</InputLabel>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          value={editData.phone || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({ ...editData, phone: e.target.value })
                          }
                          placeholder="请输入电话"
                          sx={{ mt: 1 }}
                        />
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {employee.phone || "-"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <InputLabel className="text-sm text-gray-500">联系地址</InputLabel>
                      {isEditing ? (
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          rows={3}
                          value={editData.address || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({
                              ...editData,
                              address: e.target.value,
                            })
                          }
                          placeholder="请输入地址"
                          sx={{ mt: 1 }}
                        />
                      ) : (
                        <div className="mt-1 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="font-medium">
                            {employee.address || "-"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Box>
          )}

          {activeTab === "emergency" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <Typography variant="h6" sx={{ fontWeight: 600 }} className="text-lg">紧急联系人</Typography>
                  {isEditing && (
                    <Button
                      size="small"
                      onClick={() => setShowEmergencyModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {employee.emergency_contact_name ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {employee.emergency_contact_name}
                          </p>
                          <p className="text-sm text-gray-500">紧急联系人</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 ml-13">
                        <div>
                          <InputLabel className="text-sm text-gray-500">
                            联系电话
                          </InputLabel>
                          {isEditing ? (
                            <TextField
                              size="small"
                              fullWidth
                              value={editData.emergency_contact_phone || ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setEditData({
                                  ...editData,
                                  emergency_contact_phone: e.target.value,
                                })
                              }
                              sx={{ mt: 1 }}
                            />
                          ) : (
                            <div className="mt-1 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">
                                {employee.emergency_contact_phone || "-"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <InputLabel className="text-sm text-gray-500">
                            联系人姓名
                          </InputLabel>
                          {isEditing ? (
                            <TextField
                              size="small"
                              fullWidth
                              value={editData.emergency_contact_name || ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setEditData({
                                  ...editData,
                                  emergency_contact_name: e.target.value,
                                })
                              }
                              sx={{ mt: 1 }}
                            />
                          ) : (
                            <p className="mt-1 font-medium">
                              {employee.emergency_contact_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">暂无紧急联系人信息</p>
                      {isEditing && (
                        <Button
                          onClick={() => setShowEmergencyModal(true)}
                          className="mt-4"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          添加紧急联系人
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 600 }} className="text-lg">其他信息</Typography>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">创建时间</p>
                <p className="font-medium mt-1">
                  <Calendar className="w-4 h-4 text-gray-400 inline mr-1" />
                  {new Date(employee.created_at).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">更新时间</p>
                <p className="font-medium mt-1">
                  <Calendar className="w-4 h-4 text-gray-400 inline mr-1" />
                  {new Date(employee.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">员工ID</p>
                <p className="font-medium mt-1 font-mono text-sm">
                  {employee.id.substring(0, 8)}...
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">状态</p>
                <p className="font-medium mt-1">
                  <Chip size="small"
                    variant={employee.status === "active" ? "filled" : "outlined"}
                    label={employee.status === "active" ? "在职" : "离职"} />
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加紧急联系人</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <div>
              <InputLabel htmlFor="emergency-name">联系人姓名 *</InputLabel>
              <TextField
                id="emergency-name"
                size="small"
                fullWidth
                type="text"
                value={editData.emergency_contact_name || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditData({
                    ...editData,
                    emergency_contact_name: e.target.value,
                  })
                }
                placeholder="请输入联系人姓名"
                sx={{ mt: 1 }}
              />
            </div>
            <div>
              <InputLabel htmlFor="emergency-phone">联系电话 *</InputLabel>
              <TextField
                id="emergency-phone"
                size="small"
                fullWidth
                type="text"
                value={editData.emergency_contact_phone || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditData({
                    ...editData,
                    emergency_contact_phone: e.target.value,
                  })
                }
                placeholder="请输入联系电话"
                sx={{ mt: 1 }}
              />
            </div>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setShowEmergencyModal(false)}>
            取消
          </Button>
          <Button onClick={() => setShowEmergencyModal(false)}>保存</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default HrmEmployeeDetailPage;
